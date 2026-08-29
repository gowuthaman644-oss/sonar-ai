import time

def detect_objects(image_path: str):
    """
    Stub for YOLO object detection.
    """
    time.sleep(2) # Simulate inference time
    
    # Mock bounding boxes: [x_min, y_min, x_max, y_max, confidence, class]
    return [
        {"bbox": [100, 150, 200, 250], "confidence": 0.88, "class": "mine"},
        {"bbox": [300, 50, 350, 100], "confidence": 0.65, "class": "debris"}
    ]
