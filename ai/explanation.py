def generate_explanation(risk_level: str, detections: list, anomaly_score: float) -> str:
    """
    Generates a human-readable explanation of the risk assessment.
    """
    explanation = f"Risk assessed as {risk_level}. "
    
    if risk_level == "HIGH":
        explanation += f"Critical anomalies detected (Score: {anomaly_score}). "
    
    if detections:
        classes = [d['class'] for d in detections]
        explanation += f"Identified objects: {', '.join(classes)}."
    else:
        explanation += "No known objects identified."
        
    return explanation
