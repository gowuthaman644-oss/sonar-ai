def calculate_risk(detections: list) -> dict:
    """
    Calculate an explainable risk score based on detection class and confidence.
    Classes: 'mine' (CRITICAL), 'drowning victim' (CRITICAL), 'airplane' (HIGH), 'wreck' (MEDIUM).
    """
    if not detections:
        return {
            "risk_score": 0.0,
            "risk_level": "LOW",
            "reason": "No objects detected."
        }

    # Base risk multipliers by class type
    class_risk_weights = {
        "mine": 1.0,               # 100% of confidence applied to risk
        "drowning victim": 1.0,    # 100% of confidence applied to risk
        "airplane": 0.8,           # 80% of confidence
        "wreck": 0.5               # 50% of confidence
    }

    max_risk_score = 0.0
    critical_factors = []

    for det in detections:
        cls_name = det.get("class_name", "unknown").lower()
        conf = det.get("confidence", 0.0)
        
        weight = class_risk_weights.get(cls_name, 0.3)
        item_risk = conf * weight * 100
        
        if item_risk > max_risk_score:
            max_risk_score = item_risk
            
        if cls_name in ["mine", "drowning victim"] and conf > 0.4:
            critical_factors.append(cls_name)

    # Boost score if multiple objects detected
    if len(detections) > 1:
        max_risk_score += min(len(detections) * 5, 20)
        
    risk_score = min(round(max_risk_score, 2), 100.0)

    # Determine Level and explanation
    if risk_score >= 75 or critical_factors:
        risk_level = "HIGH"
        reason = f"High alert: Critical objects detected ({', '.join(set(critical_factors))})" if critical_factors else "High detection confidence of submerged hazards."
    elif risk_score >= 40:
        risk_level = "MEDIUM"
        reason = "Medium risk: Non-critical anomalies detected."
    else:
        risk_level = "LOW"
        reason = "Low risk: Minor anomalies detected with low confidence."

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reason": reason
    }
