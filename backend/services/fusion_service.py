import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Class hazard multipliers reflecting operational danger and urgency
CLASS_HAZARD_WEIGHTS = {
    "mine": 1.15,               # Immediate explosive detonation hazard
    "drowning victim": 1.10,    # Life-critical search-and-rescue urgency
    "drowning_victim": 1.10,
    "airplane": 0.90,           # Navigation / environmental hazard
    "wreck": 0.75               # Static submerged structure
}

# Tracking recurrence bonuses for persistent multi-observation contacts
TRACKING_STATUS_BONUSES = {
    "RECURRENT": 8.0,  # Observed across >= 3 sequential passes
    "ACTIVE": 4.0,     # Observed across 2 sequential passes
    "NEW": 0.0
}

# Risk level hierarchy for deterministic tie-breaking
RISK_LEVEL_ORDER = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
    "UNKNOWN": 0
}


def calculate_operational_score(
    confidence: float,
    evidence_score: Optional[float],
    class_name: str,
    tracking_status: Optional[str] = None
) -> Tuple[float, str, float, float, str]:
    """
    Computes the deterministic, explainable Operational Decision Score (S_ops in [0, 100]).

    Formulation:
      S_yolo = confidence * 100
      S_evidence = evidence_score (or S_yolo if uncomputed)
      S_base = 0.45 * S_yolo + 0.45 * S_evidence
      delta = |S_yolo - S_evidence|
      P_uncertainty = 10.0 if delta >= 50.0 else 0.0
      S_ops = clamp((class_weight * S_base) + tracking_bonus - P_uncertainty, 0, 100)

    Returns:
      (S_ops, priority_tier, delta, P_uncertainty, primary_reason)
    """
    s_yolo = max(0.0, min(100.0, float(confidence) * 100.0))
    s_evidence = max(0.0, min(100.0, float(evidence_score))) if evidence_score is not None else s_yolo

    # Base weighted combination (0.45 YOLO + 0.45 Evidence)
    s_base = (0.45 * s_yolo) + (0.45 * s_evidence)

    # Class Hazard Weight
    cls_key = class_name.lower().strip()
    class_weight = CLASS_HAZARD_WEIGHTS.get(cls_key, 1.00)

    # Persistent Tracking Bonus
    trk_key = (tracking_status or "NEW").upper().strip()
    tracking_bonus = TRACKING_STATUS_BONUSES.get(trk_key, 0.0)

    # Bounded Discrepancy Penalty
    delta = abs(s_yolo - s_evidence)
    is_high_discrepancy = delta >= 50.0
    p_uncertainty = 10.0 if is_high_discrepancy else 0.0

    # Final Operational Score
    raw_ops = (class_weight * s_base) + tracking_bonus - p_uncertainty
    s_ops = round(max(0.0, min(100.0, raw_ops)), 1)

    # Priority Tier Assignment
    if is_high_discrepancy:
        priority_tier = "REVIEW_REQUIRED"
        primary_reason = "High neural/acoustic evidence discrepancy requires analyst review."
    elif s_ops >= 70.0:
        priority_tier = "IMMEDIATE_ACTION"
        if cls_key in ["mine", "drowning victim", "drowning_victim"]:
            primary_reason = f"High-priority {class_name.capitalize()} candidate with strong acoustic evidence."
        elif tracking_bonus > 0:
            primary_reason = f"Recurrent contact ({tracking_status}) elevated for priority inspection."
        else:
            primary_reason = f"High-confidence verified {class_name.capitalize()} target."
    elif s_ops >= 45.0:
        priority_tier = "REVIEW_REQUIRED"
        if cls_key == "mine":
            primary_reason = "Subsurface mine hazard candidate requiring manual analyst verification."
        else:
            primary_reason = "Moderate evidence candidate requiring operator verification."
    else:
        priority_tier = "DEFERRED_INSPECTION"
        if cls_key == "wreck":
            primary_reason = "Lower-priority static wreck candidate."
        else:
            primary_reason = "Low acoustic contrast return; deferred to secondary review."

    return s_ops, priority_tier, round(delta, 1), p_uncertainty, primary_reason


def generate_triage_rationale(
    class_name: str,
    s_ops: float,
    priority_tier: str,
    confidence: float,
    evidence_score: Optional[float],
    tracking_status: Optional[str],
    delta: float,
    p_uncertainty: float,
    primary_reason: str
) -> str:
    """
    Constructs an explainable, structured human-readable rationale summarizing all fusion factors.
    """
    reasons = [primary_reason]

    if p_uncertainty > 0:
        reasons.append(f"Neural/evidence delta is {delta:.1f}% (conf: {confidence*100:.1f}%, ev: {evidence_score:.1f}%).")
    
    if tracking_status in ["RECURRENT", "ACTIVE"]:
        reasons.append(f"Contact persistence ({tracking_status}) adds verification confidence.")

    return " ".join(reasons)


def fuse_detection_intelligence(
    detections: List[Any],
    scan_risk: Optional[Dict[str, Any]] = None,
    tracking_context: Optional[Dict[str, Any]] = None
) -> List[Any]:
    """
    Second-stage Evidence Fusion & Decision Intelligence service.
    Consumes existing detection outputs, evaluates operational prioritization scores,
    and returns detections sorted by deterministic triage rank without mutating raw YOLO values.

    Failure Isolation: If fusion encounters any exception, logs warning and returns original detections safely.
    """
    if not detections:
        return []

    try:
        enriched_items = []
        for idx, det in enumerate(detections):
            # Support both Pydantic schemas and dict representations
            if hasattr(det, "class_name"):
                cls_name = det.class_name
                conf = det.confidence
                ev_data = getattr(det, "evidence", None)
                trk_data = getattr(det, "tracking", None)
                det_id = getattr(det, "id", None) or idx
            else:
                cls_name = det.get("class_name", "unknown")
                conf = det.get("confidence", 0.0)
                ev_data = det.get("evidence", {})
                trk_data = det.get("tracking", {})
                det_id = det.get("id", idx)

            # Extract evidence score if available
            ev_score = None
            if isinstance(ev_data, dict):
                ev_score = ev_data.get("evidence_score")
            elif hasattr(ev_data, "evidence_score"):
                ev_score = getattr(ev_data, "evidence_score")

            # Extract tracking status if available
            trk_status = None
            if isinstance(trk_data, dict):
                trk_status = trk_data.get("status")
            elif hasattr(trk_data, "status"):
                trk_status = getattr(trk_data, "status")

            s_ops, tier, delta, p_unc, prim_reason = calculate_operational_score(
                confidence=conf,
                evidence_score=ev_score,
                class_name=cls_name,
                tracking_status=trk_status
            )

            rationale = generate_triage_rationale(
                class_name=cls_name,
                s_ops=s_ops,
                priority_tier=tier,
                confidence=conf,
                evidence_score=ev_score,
                tracking_status=trk_status,
                delta=delta,
                p_uncertainty=p_unc,
                primary_reason=prim_reason
            )

            fusion_payload = {
                "operational_score": s_ops,
                "priority_tier": tier,
                "class_hazard_weight": CLASS_HAZARD_WEIGHTS.get(cls_name.lower().strip(), 1.00),
                "tracking_bonus": TRACKING_STATUS_BONUSES.get((trk_status or "NEW").upper().strip(), 0.0),
                "discrepancy_delta": delta,
                "uncertainty_penalty": p_unc,
                "rationale": rationale
            }

            enriched_items.append({
                "original_det": det,
                "det_id": det_id,
                "priority_score": s_ops,
                "priority_tier": tier,
                "triage_rationale": rationale,
                "evidence_score": ev_score if ev_score is not None else 0.0,
                "risk_severity": RISK_LEVEL_ORDER.get((scan_risk.get("risk_level") if scan_risk else "LOW").upper(), 1),
                "fusion_payload": fusion_payload
            })

        # Deterministic Tie-Breaking Sort:
        # 1. priority_score descending
        # 2. risk_severity descending
        # 3. evidence_score descending
        # 4. det_id ascending
        enriched_items.sort(
            key=lambda x: (
                -x["priority_score"],
                -x["risk_severity"],
                -x["evidence_score"],
                x["det_id"] if isinstance(x["det_id"], int) else 0
            )
        )

        # Assign unique sequential ranks (1 ... N) and hydrate fields
        results = []
        for rank_idx, item in enumerate(enriched_items):
            rank = rank_idx + 1
            det_obj = item["original_det"]
            if hasattr(det_obj, "priority_score"):
                det_obj.priority_score = item["priority_score"]
                det_obj.priority_tier = item["priority_tier"]
                det_obj.triage_rank = rank
                det_obj.triage_rationale = item["triage_rationale"]
                det_obj.fusion = item["fusion_payload"]
                results.append(det_obj)
            elif isinstance(det_obj, dict):
                det_obj["priority_score"] = item["priority_score"]
                det_obj["priority_tier"] = item["priority_tier"]
                det_obj["triage_rank"] = rank
                det_obj["triage_rationale"] = item["triage_rationale"]
                det_obj["fusion"] = item["fusion_payload"]
                results.append(det_obj)
            else:
                results.append(det_obj)

        return results

    except Exception as e:
        logger.error(f"Evidence Fusion computation failed safely: {e}", exc_info=True)
        return detections
