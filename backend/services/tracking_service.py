import logging
import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.database.models import ContactTrack, Detection, Scan

logger = logging.getLogger(__name__)

# ==============================================================================
# CONFIGURABLE ASSOCIATION PARAMETERS (Initial engineering heuristics)
# ==============================================================================
TRACK_DISTANCE_THRESHOLD: float = 0.15       # Max normalized center distance (15% of frame)
TRACK_DIM_SIMILARITY_THRESHOLD: float = 0.50  # Min dimension ratio (min / max)
TRACK_AMBIGUITY_MARGIN: float = 0.05         # Margin to reject ambiguous multi-track matches
TRACK_LOOKBACK_LIMIT: int = 30               # Maximum candidate tracks queried from recent history
DEFAULT_IMG_SIZE: Tuple[int, int] = (640, 640) # Fallback image dimensions (width, height)

# ==============================================================================
# NORMALIZATION & GEOMETRY HELPERS
# ==============================================================================
def normalize_bbox(
    x: float,
    y: float,
    width: float,
    height: float,
    img_w: float = 640.0,
    img_h: float = 640.0
) -> Dict[str, float]:
    """
    Converts pixel bounding-box coordinates to normalized [0, 1] image-plane coordinates.
    Strictly image-plane: does NOT represent or fabricate geographic telemetry.
    """
    w = max(1.0, float(img_w))
    h = max(1.0, float(img_h))
    
    x_norm = max(0.0, min(1.0, float(x) / w))
    y_norm = max(0.0, min(1.0, float(y) / h))
    w_norm = max(0.0, min(1.0, float(width) / w))
    h_norm = max(0.0, min(1.0, float(height) / h))
    
    cx_norm = x_norm + (w_norm / 2.0)
    cy_norm = y_norm + (h_norm / 2.0)
    
    return {
        "x_norm": round(x_norm, 5),
        "y_norm": round(y_norm, 5),
        "w_norm": round(w_norm, 5),
        "h_norm": round(h_norm, 5),
        "cx_norm": round(cx_norm, 5),
        "cy_norm": round(cy_norm, 5)
    }

def compute_dimension_similarity(w1: float, h1: float, w2: float, h2: float) -> float:
    """
    Computes scale-invariant dimension similarity between two bounding boxes.
    Ratio of min/max for width and height.
    """
    max_w = max(w1, w2)
    max_h = max(h1, h2)
    if max_w <= 0.0 or max_h <= 0.0:
        return 0.0
    
    w_sim = min(w1, w2) / max_w
    h_sim = min(h1, h2) / max_h
    return (w_sim + h_sim) / 2.0

def compute_normalized_iou(b1: Dict[str, float], b2: Dict[str, float]) -> float:
    """Computes Intersection over Union in normalized image-plane coordinates."""
    x1 = max(b1["x_norm"], b2["x_norm"])
    y1 = max(b1["y_norm"], b2["y_norm"])
    x2 = min(b1["x_norm"] + b1["w_norm"], b2["x_norm"] + b2["w_norm"])
    y2 = min(b1["y_norm"] + b1["h_norm"], b2["y_norm"] + b2["h_norm"])
    
    intersection_w = max(0.0, x2 - x1)
    intersection_h = max(0.0, y2 - y1)
    intersection_area = intersection_w * intersection_h
    
    area1 = b1["w_norm"] * b1["h_norm"]
    area2 = b2["w_norm"] * b2["h_norm"]
    union_area = area1 + area2 - intersection_area
    
    if union_area <= 0.0:
        return 0.0
    return intersection_area / union_area

# ==============================================================================
# TRACK IDENTIFIER GENERATOR
# ==============================================================================
def generate_next_track_id(db: Session) -> str:
    """
    Generates a unique, non-colliding track ID in the format TRK-XXXX.
    Safe against application restart, gaps, and record deletions.
    """
    all_tracks = db.query(ContactTrack.track_id).all()
    max_idx = 0
    for (tid,) in all_tracks:
        if tid and tid.startswith("TRK-"):
            try:
                idx = int(tid.replace("TRK-", ""))
                if idx > max_idx:
                    max_idx = idx
            except ValueError:
                pass
    return f"TRK-{max_idx + 1:04d}"

# ==============================================================================
# DETERMINISTIC STATUS DETERMINATION
# ==============================================================================
def determine_track_status(observation_count: int) -> str:
    """
    Assigns a deterministic status based on empirical observation count.
    - NEW: First confirmed observation
    - ACTIVE: 2 confirmed observations across scans
    - RECURRENT: >= 3 confirmed observations across scans
    """
    if observation_count <= 1:
        return "NEW"
    elif observation_count == 2:
        return "ACTIVE"
    else:
        return "RECURRENT"

# ==============================================================================
# MULTI-SIGNAL ASSOCIATION EVALUATION
# ==============================================================================
def evaluate_association(
    candidate_norm: Dict[str, float],
    candidate_class: str,
    track: ContactTrack,
    last_det_norm: Dict[str, float]
) -> Dict[str, Any]:
    """
    Evaluates multi-signal association between a candidate detection and an existing track's
    most recent observation.
    
    HARD GATES:
    1. Strict class compatibility (candidate.class == track.class)
    2. Normalized center distance <= TRACK_DISTANCE_THRESHOLD
    3. Dimension similarity >= TRACK_DIM_SIMILARITY_THRESHOLD
    """
    # 1. Hard Gate: Class Compatibility
    if candidate_class.lower() != track.class_name.lower():
        return {
            "eligible": False,
            "reason": "CLASS_MISMATCH",
            "score": 0.0
        }
    
    # 2. Compute Center Distance
    dist = math.hypot(
        candidate_norm["cx_norm"] - last_det_norm["cx_norm"],
        candidate_norm["cy_norm"] - last_det_norm["cy_norm"]
    )
    if dist > TRACK_DISTANCE_THRESHOLD:
        return {
            "eligible": False,
            "reason": "DISTANCE_EXCEEDED",
            "score": 0.0,
            "distance": round(dist, 4)
        }
    
    # 3. Compute Dimension Similarity
    dim_sim = compute_dimension_similarity(
        candidate_norm["w_norm"], candidate_norm["h_norm"],
        last_det_norm["w_norm"], last_det_norm["h_norm"]
    )
    if dim_sim < TRACK_DIM_SIMILARITY_THRESHOLD:
        return {
            "eligible": False,
            "reason": "DIMENSION_MISMATCH",
            "score": 0.0,
            "dimension_similarity": round(dim_sim, 4)
        }
    
    # 4. Optional Supporting IoU
    iou = compute_normalized_iou(candidate_norm, last_det_norm)
    
    # 5. Composite Association Score (Weighted: Distance 50%, Dimension 30%, IoU 20%)
    dist_score = max(0.0, 1.0 - (dist / TRACK_DISTANCE_THRESHOLD))
    composite_score = (0.50 * dist_score) + (0.30 * dim_sim) + (0.20 * iou)
    
    return {
        "eligible": True,
        "score": round(composite_score, 4),
        "signals": {
            "class_match": True,
            "center_distance": round(dist, 4),
            "dimension_similarity": round(dim_sim, 4),
            "iou": round(iou, 4)
        }
    }

# ==============================================================================
# CHRONOLOGICAL TREND CALCULATION
# ==============================================================================
def calculate_track_trends(observations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculates empirical trajectories from chronologically ordered observations.
    Handles 1, 2, or many observations. Does NOT manufacture misleading slopes
    when insufficient data points exist.
    """
    if not observations:
        return {
            "observation_count": 0,
            "confidence_trend": [],
            "evidence_trend": [],
            "risk_trend": [],
            "confidence_direction": "unavailable",
            "evidence_direction": "unavailable",
            "trend_summary": "No observations available"
        }
    
    conf_list = [obs["confidence"] for obs in observations if obs.get("confidence") is not None]
    ev_list = [obs["evidence"] for obs in observations if obs.get("evidence") is not None]
    risk_list = [obs["risk"] for obs in observations if obs.get("risk") is not None]
    
    count = len(observations)
    if count < 2:
        return {
            "observation_count": count,
            "confidence_trend": conf_list,
            "evidence_trend": ev_list,
            "risk_trend": risk_list,
            "confidence_direction": "unavailable",
            "evidence_direction": "unavailable",
            "trend_summary": "Single observation — trend unavailable"
        }
    
    # Direction and deltas for confidence
    conf_dir = "unavailable"
    if len(conf_list) >= 2:
        conf_delta = conf_list[-1] - conf_list[0]
        if conf_delta > 0.03:
            conf_dir = "increasing"
        elif conf_delta < -0.03:
            conf_dir = "decreasing"
        else:
            conf_dir = "stable"
            
    # Direction and deltas for evidence
    ev_dir = "unavailable"
    if len(ev_list) >= 2:
        ev_delta = ev_list[-1] - ev_list[0]
        if ev_delta > 5.0:
            ev_dir = "increasing"
        elif ev_delta < -5.0:
            ev_dir = "decreasing"
        else:
            ev_dir = "stable"
            
    summary_parts = []
    if conf_dir != "unavailable":
        summary_parts.append(f"Confidence {conf_dir}")
    if ev_dir != "unavailable":
        summary_parts.append(f"Evidence {ev_dir}")
        
    return {
        "observation_count": count,
        "confidence_trend": conf_list,
        "evidence_trend": ev_list,
        "risk_trend": risk_list,
        "confidence_direction": conf_dir,
        "evidence_direction": ev_dir,
        "trend_summary": ", ".join(summary_parts) if summary_parts else "Multi-scan observation"
    }

# ==============================================================================
# MAIN TARGET ASSOCIATOR SERVICE ENGINE
# ==============================================================================
class TargetAssociator:
    """
    Conservative, multi-signal temporal target associator for side-scan sonar.
    Maintains persistent ContactTrack records across chronologically ordered scans.
    """

    def __init__(
        self,
        distance_threshold: float = TRACK_DISTANCE_THRESHOLD,
        dim_similarity_threshold: float = TRACK_DIM_SIMILARITY_THRESHOLD,
        ambiguity_margin: float = TRACK_AMBIGUITY_MARGIN,
        lookback_limit: int = TRACK_LOOKBACK_LIMIT
    ):
        self.distance_threshold = distance_threshold
        self.dim_similarity_threshold = dim_similarity_threshold
        self.ambiguity_margin = ambiguity_margin
        self.lookback_limit = lookback_limit

    def associate_detection(
        self,
        db: Session,
        candidate_det: Dict[str, Any],
        scan: Scan,
        img_width: float = 640.0,
        img_height: float = 640.0,
        evidence_score: Optional[float] = None,
        risk_level: Optional[str] = None
    ) -> Tuple[ContactTrack, bool, Dict[str, Any]]:
        """
        Associates a single candidate detection with existing candidate tracks.
        Returns:
            Tuple[ContactTrack, is_new_track, telemetry_dict]
        """
        cand_class = candidate_det.get("class_name", "unknown")
        cand_conf = float(candidate_det.get("confidence", 0.0))
        
        cand_norm = normalize_bbox(
            x=candidate_det.get("x", candidate_det.get("bbox", {}).get("x1", 0.0)),
            y=candidate_det.get("y", candidate_det.get("bbox", {}).get("y1", 0.0)),
            width=candidate_det.get("width", candidate_det.get("bbox", {}).get("x2", 0.0) - candidate_det.get("bbox", {}).get("x1", 0.0)),
            height=candidate_det.get("height", candidate_det.get("bbox", {}).get("y2", 0.0) - candidate_det.get("bbox", {}).get("y1", 0.0)),
            img_w=img_width,
            img_h=img_height
        )

        # 1. Query Candidate Tracks (Filtered by lookback limit and same class)
        candidate_tracks = (
            db.query(ContactTrack)
            .filter(ContactTrack.class_name == cand_class)
            .order_by(ContactTrack.last_observed.desc())
            .limit(self.lookback_limit)
            .all()
        )

        evaluations: List[Tuple[ContactTrack, Dict[str, Any]]] = []

        for track in candidate_tracks:
            if track.latest_cx_norm is not None and track.latest_w_norm is not None:
                last_norm = {
                    "cx_norm": track.latest_cx_norm,
                    "cy_norm": track.latest_cy_norm,
                    "w_norm": track.latest_w_norm,
                    "h_norm": track.latest_h_norm,
                    "x_norm": track.latest_cx_norm - (track.latest_w_norm / 2.0),
                    "y_norm": track.latest_cy_norm - (track.latest_h_norm / 2.0),
                }
            else:
                last_det = (
                    db.query(Detection)
                    .filter(Detection.track_id == track.track_id)
                    .order_by(Detection.id.desc())
                    .first()
                )
                if not last_det:
                    continue
                last_norm = normalize_bbox(
                    x=last_det.x, y=last_det.y,
                    width=last_det.width, height=last_det.height,
                    img_w=img_width, img_h=img_height
                )
            
            res = evaluate_association(cand_norm, cand_class, track, last_norm)
            if res.get("eligible"):
                evaluations.append((track, res))

        # 2. Sort evaluations by score descending
        evaluations.sort(key=lambda item: item[1]["score"], reverse=True)

        # 3. Evaluate Ambiguity & Match Decision
        best_match_track: Optional[ContactTrack] = None
        is_ambiguous = False
        match_details: Dict[str, Any] = {}

        if len(evaluations) >= 2:
            top_score = evaluations[0][1]["score"]
            runner_up_score = evaluations[1][1]["score"]
            if (top_score - runner_up_score) < self.ambiguity_margin:
                # AMBIGUITY TRIGGERED: Score delta too small. DO NOT MERGE!
                is_ambiguous = True
                logger.info(
                    f"Ambiguous association between {evaluations[0][0].track_id} ({top_score:.3f}) "
                    f"and {evaluations[1][0].track_id} ({runner_up_score:.3f}). Creating new track."
                )

        if evaluations and not is_ambiguous:
            best_match_track = evaluations[0][0]
            match_details = evaluations[0][1]

        # 4. Update Existing Track or Create New Track
        scan_time = scan.created_at or datetime.utcnow()

        if best_match_track is not None:
            # Associate with existing track
            best_match_track.last_observed = scan_time
            best_match_track.observation_count += 1
            best_match_track.latest_confidence = cand_conf
            best_match_track.latest_cx_norm = cand_norm["cx_norm"]
            best_match_track.latest_cy_norm = cand_norm["cy_norm"]
            best_match_track.latest_w_norm = cand_norm["w_norm"]
            best_match_track.latest_h_norm = cand_norm["h_norm"]
            if evidence_score is not None:
                best_match_track.latest_evidence = evidence_score
            if risk_level is not None:
                best_match_track.latest_risk = risk_level
            best_match_track.status = determine_track_status(best_match_track.observation_count)
            db.commit()
            db.refresh(best_match_track)
            
            telemetry = {
                "track_id": best_match_track.track_id,
                "is_new": False,
                "observation_count": best_match_track.observation_count,
                "status": best_match_track.status,
                "match_score": match_details.get("score", 0.0),
                "signals": match_details.get("signals", {})
            }
            return best_match_track, False, telemetry

        else:
            # Create a brand new ContactTrack
            new_track_id = generate_next_track_id(db)
            new_track = ContactTrack(
                track_id=new_track_id,
                class_name=cand_class,
                first_observed=scan_time,
                last_observed=scan_time,
                observation_count=1,
                status="NEW",
                latest_confidence=cand_conf,
                latest_evidence=evidence_score,
                latest_risk=risk_level,
                latest_cx_norm=cand_norm["cx_norm"],
                latest_cy_norm=cand_norm["cy_norm"],
                latest_w_norm=cand_norm["w_norm"],
                latest_h_norm=cand_norm["h_norm"]
            )
            db.add(new_track)
            db.commit()
            db.refresh(new_track)
            
            telemetry = {
                "track_id": new_track.track_id,
                "is_new": True,
                "observation_count": 1,
                "status": "NEW",
                "match_score": 1.0,
                "reason": "AMBIGUOUS_MATCH" if is_ambiguous else "NO_EXISTING_MATCH"
            }
            return new_track, True, telemetry

# Singleton default instance
default_associator = TargetAssociator()
