def calculate_risk(detections: list, anomaly_score: float) -> str:
    """
    Calculates overall risk level based on YOLO detections and anomaly score.
    """
    if anomaly_score > 0.8 or any(d['class'] == 'mine' and d['confidence'] > 0.8 for d in detections):
        return "HIGH"
    elif anomaly_score > 0.5 or len(detections) > 0:
        return "MEDIUM"
    return "LOW"
