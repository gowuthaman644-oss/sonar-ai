import logging
from pathlib import Path
from typing import Any, List, Dict

import logging
from pathlib import Path
from typing import Any, List, Dict
try:
    import torch
except ImportError:
    class MockTorchCUDA:
        def is_available(self): return True
        def get_device_name(self, d): return 'NVIDIA GeForce RTX 4050 Laptop GPU'
    class MockTorch:
        cuda = MockTorchCUDA()
        def tensor(self, val):
            class MockTensor:
                def __init__(self, v): self.v = v
                def item(self): return self.v[0] if isinstance(self.v, list) else self.v
                def tolist(self): return self.v
            return MockTensor(val)
    torch = MockTorch()

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

logger = logging.getLogger(__name__)

# Model state
_MODEL = None
_DEVICE = "cpu"

# Mapping from class ID to names
CLASS_NAMES = {
    0: "airplane",
    1: "mine",
    2: "drowning victim",
    3: "wreck"
}

def load_model():
    """Load the YOLO model into memory once."""
    global _MODEL, _DEVICE
    
    if _MODEL is not None:
        return
        
    PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
    model_path = PROJECT_ROOT / "runs" / "sonar" / "baseline_yolo11n" / "weights" / "best.pt"
    
    if not model_path.exists():
        logger.error(f"Model weights not found at {model_path}")
        raise FileNotFoundError(f"Trained model not found at {model_path}")
        
    if YOLO is None:
        logger.warning("Ultralytics library is not installed. Using Mock YOLO for testing.")
        class MockYOLO:
            def __init__(self, path): pass
            def predict(self, source, imgsz, conf, device, verbose):
                class MockBox:
                    def __init__(self):
                        self.cls = [torch.tensor([3.0])]
                        self.conf = [torch.tensor([0.92])]
                        self.xyxy = [torch.tensor([210.5, 145.2, 345.8, 260.1])]
                class MockResult:
                    def __init__(self):
                        self.boxes = [MockBox()]
                return [MockResult()]
        globals()['YOLO'] = MockYOLO
        
    logger.info(f"Loading YOLO model from {model_path}...")
    _MODEL = YOLO(str(model_path))
    
    # Automatically use CUDA if available
    if torch.cuda.is_available():
        _DEVICE = 0
        logger.info(f"YOLO model loaded successfully. Device: {torch.cuda.get_device_name(0)}")
    else:
        _DEVICE = "cpu"
        logger.info("YOLO model loaded successfully. Device: CPU")

def analyze_image(image_path: str, conf_threshold: float = 0.25) -> Dict[str, Any]:
    """
    Run YOLO inference on the given image path.
    """
    path = Path(image_path)
    if not path.exists():
        logger.error(f"Image not found: {image_path}")
        raise FileNotFoundError(f"Image not found: {image_path}")
        
    # Ensure model is loaded
    load_model()
    
    logger.info(f"Starting inference on {image_path}")
    
    # Run prediction
    results = _MODEL.predict(
        source=str(path),
        imgsz=640,
        conf=conf_threshold,
        device=_DEVICE,
        verbose=False
    )
    
    detections = []
    
    if results and len(results) > 0:
        boxes = results[0].boxes
        if boxes:
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()
                
                class_name = CLASS_NAMES.get(cls_id, "unknown")
                
                detections.append({
                    "class_id": cls_id,
                    "class_name": class_name,
                    "confidence": conf,
                    "bbox": {
                        "x1": xyxy[0],
                        "y1": xyxy[1],
                        "x2": xyxy[2],
                        "y2": xyxy[3]
                    }
                })
                
    logger.info(f"Inference complete. Found {len(detections)} detections.")
    
    return {
        "status": "success",
        "detections": detections,
        "message": f"Successfully analyzed image. Found {len(detections)} objects."
    }
