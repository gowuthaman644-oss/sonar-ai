import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

def evaluate_detection_uncertainty(
    confidence: float,
    evidence_score: float,
    evidence_status: str,
    evidence_features: Optional[Dict[str, Any]] = None,
    contact_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes an explainable, epistemic uncertainty assessment for a YOLO detection
    by evaluating the agreement between YOLO model confidence and physics-grounded acoustic evidence.

    Uncertainty represents: 'How confident can an operator be in this interpretation?'
    It is kept strictly distinct from both YOLO confidence and operational Risk.

    Four primary operational quadrants:
    1. High Conf + Strong Evidence  -> LOW UNCERTAINTY (High trust)
    2. High Conf + Weak Evidence    -> HIGH UNCERTAINTY (Potential false positive or low-profile contact)
    3. Low Conf + Strong Evidence   -> MODERATE UNCERTAINTY (Salient acoustic contact; model uncertain of class)
    4. Low Conf + Weak Evidence     -> CRITICAL UNCERTAINTY (Probable acoustic clutter or seabed speckle)
    """
    conf_pct = float(confidence) * 100.0 if confidence <= 1.0 else float(confidence)
    ev_score = float(evidence_score)
    ev_features = evidence_features or {}

    # 1. Compute Uncertainty Score (0 to 100, where 0 is certain and 100 is maximum uncertainty)
    # High confidence + high evidence minimizes uncertainty.
    # Discrepancy between confidence and evidence increases uncertainty.
    # Base confidence gap:
    conf_gap = max(0.0, 100.0 - conf_pct)
    ev_gap = max(0.0, 100.0 - ev_score)
    
    # Inter-layer discrepancy penalty (e.g. Model says 90% sure, but physical evidence is only 20%):
    discrepancy = abs(conf_pct - ev_score)

    if conf_pct >= 60.0 and ev_score >= 60.0:
        # High-confidence, strong evidence: minimal uncertainty
        base_uncertainty = (conf_gap * 0.4) + (ev_gap * 0.4)
        uncertainty_level = "LOW"
    elif conf_pct >= 55.0 and ev_score < 40.0:
        # High model confidence but weak physical evidence: HIGH UNCERTAINTY
        base_uncertainty = 50.0 + (discrepancy * 0.35)
        uncertainty_level = "HIGH"
    elif conf_pct < 50.0 and ev_score >= 60.0:
        # Low model confidence but strong acoustic structure: MODERATE UNCERTAINTY
        base_uncertainty = 35.0 + (conf_gap * 0.25)
        uncertainty_level = "MODERATE"
    elif conf_pct < 50.0 and ev_score < 40.0:
        # Low confidence and weak evidence: CRITICAL UNCERTAINTY (Likely clutter)
        base_uncertainty = 65.0 + (ev_gap * 0.3)
        uncertainty_level = "CRITICAL"
    else:
        # Moderate agreement: MODERATE UNCERTAINTY
        base_uncertainty = (conf_gap * 0.5) + (ev_gap * 0.5)
        uncertainty_level = "MODERATE"

    uncertainty_score = round(min(100.0, max(0.0, base_uncertainty)), 1)

    # 2. Derive Interpretable Physical Reasons (No Fabrication)
    factors: List[str] = []

    # Check Contrast
    contrast_info = ev_features.get("contrast_features", {})
    tbcr = contrast_info.get("tbcr", 0.0)
    delta_i = contrast_info.get("intensity_delta", 0.0)
    if tbcr < 1.0 or abs(delta_i) < 8.0:
        factors.append("Low object-to-seabed contrast; boundary poorly delineated.")
    elif tbcr > 2.5:
        factors.append("High acoustic contrast relative to surrounding seabed.")

    # Check Structural Edge Energy
    struct_info = ev_features.get("structural_features", {})
    edge_energy = struct_info.get("gradient_energy", 0.0)
    if edge_energy < 15.0:
        factors.append("Weak structural edge gradients; lacks rigid geometric boundaries.")
    elif edge_energy > 35.0:
        factors.append("Coherent structural gradients detected within bounding box.")

    # Check Acoustic Shadow
    shadow_info = ev_features.get("shadow_features", {})
    if shadow_info.get("shadow_detected"):
        factors.append("Corroborating down-range acoustic shadow observed.")
    else:
        factors.append("Down-range acoustic shadow not observed; target may be low-profile or recessed.")

    # Check Model Confidence
    if conf_pct < 50.0:
        factors.append(f"Marginal YOLO classification confidence ({conf_pct:.1f}%).")

    if not factors:
        factors.append("Nominal acoustic returns with moderate feature correlation.")

    # 3. Actionable Operator Decision Synthesis (Proportional to Evidence & Uncertainty)
    if conf_pct >= 60.0 and ev_score >= 70.0:
        operator_assessment = "CONFIRMED TARGET"
        recommendation = "CONFIRMED CONTACT — PROCEED PER MISSION PROTOCOL"
    elif conf_pct >= 55.0 and ev_score >= 40.0:
        operator_assessment = "CONSISTENT TARGET"
        recommendation = "CONTACT CONSISTENT WITH TARGET — REVIEW / PROCEED PER PROTOCOL"
    elif conf_pct >= 55.0 and ev_score < 40.0:
        operator_assessment = "UNCONFIRMED CONTACT"
        recommendation = "UNCONFIRMED CONTACT — ANALYST VERIFICATION REQUIRED (POSSIBLE FALSE POSITIVE)"
    elif conf_pct < 50.0 and ev_score >= 60.0:
        operator_assessment = "UNCLASSIFIED TARGET"
        recommendation = "UNCLASSIFIED ACOUSTIC CONTACT — SECONDARY FREQUENCY INSPECTION RECOMMENDED"
    elif ev_score < 40.0 or uncertainty_level == "CRITICAL":
        operator_assessment = "POSSIBLE CLUTTER"
        recommendation = "PROBABLE SEABED CLUTTER — LOW CONFIDENCE / MINIMAL ACOUSTIC SUPPORT"
    else:
        operator_assessment = "PROVISIONAL CONTACT"
        recommendation = "PROVISIONAL CONTACT — CROSS-REFERENCE WITH ADJACENT SURVEY LINES"

    # 4. Decision Boundary Proximity / Margin Audit
    # Tracks distance to nearest critical threshold (Conf: 60, 55, 50; Evidence: 70, 40)
    boundary_distances = [
        abs(conf_pct - 60.0),
        abs(conf_pct - 55.0),
        abs(conf_pct - 50.0),
        abs(ev_score - 70.0),
        abs(ev_score - 40.0)
    ]
    min_boundary_distance = round(min(boundary_distances), 2)
    near_boundary = min_boundary_distance <= 2.0

    return {
        "uncertainty_score": uncertainty_score,
        "uncertainty_level": uncertainty_level,
        "operator_assessment": operator_assessment,
        "operator_recommendation": recommendation,
        "factors": factors,
        "metrics_summary": {
            "yolo_confidence_pct": round(conf_pct, 1),
            "evidence_score_pct": round(ev_score, 1),
            "inter_layer_delta": round(discrepancy, 1)
        },
        "boundary_audit": {
            "min_distance_to_boundary": min_boundary_distance,
            "near_decision_boundary": near_boundary,
            "margin_status": "CRITICAL_MARGIN" if min_boundary_distance < 0.8 else ("BORDERLINE" if near_boundary else "STABLE")
        }
    }
