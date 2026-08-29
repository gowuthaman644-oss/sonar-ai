def calculate_risk(
    detections: list,
) -> dict:
    """
    Calculate a simple risk score from detections.

    This is a temporary rule-based implementation.
    It will be improved after the AI model is integrated.
    """

    if not detections:
        return {
            "risk_score": 0.0,
            "risk_level": "LOW",
            "reason": "No objects detected."
        }

    highest_confidence = max(
        detection.get("confidence", 0.0)
        for detection in detections
    )

    risk_score = round(highest_confidence * 100, 2)

    if risk_score >= 80:
        risk_level = "HIGH"
    elif risk_score >= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reason": "Risk calculated from detected objects."
    }
