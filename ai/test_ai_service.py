import os
import sys
import logging
from pathlib import Path

# Add the project root to sys.path so we can import backend
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.services.ai_service import analyze_image, load_model, _DEVICE

# Configure logging to show info messages
logging.basicConfig(level=logging.INFO)

def main():
    print("========================================")
    print("SONAR-AI AI SERVICE TEST")
    print("========================================")
    print()
    
    # 2. Confirm the model loads
    try:
        load_model()
        print("Model loading: PASS")
        print("Model: YOLO11n")
        print(f"Device: {'NVIDIA GeForce RTX 4050 Laptop GPU' if _DEVICE == 0 else 'CPU'}")
    except Exception as e:
        print(f"Model loading: FAIL ({e})")
        sys.exit(1)
        
    print()
    
    # 3. Select one real validation image
    valid_dir = Path("dataset/side-scan-sonar-object-detection-challenge/valid/images")
    if not valid_dir.exists():
        print(f"ERROR: Validation directory not found at {valid_dir}")
        sys.exit(1)
        
    test_images = list(valid_dir.glob("*.jpg"))
    if not test_images:
        print(f"ERROR: No images found in {valid_dir}")
        sys.exit(1)
        
    test_image = test_images[0]
    print(f"Test image:\n{test_image}")
    print()
    
    # 4. Run analyze_image()
    try:
        result = analyze_image(str(test_image))
        print("Inference: PASS")
    except Exception as e:
        print(f"Inference: FAIL ({e})")
        sys.exit(1)
        
    print()
    
    detections = result.get("detections", [])
    print(f"Detections: {len(detections)}")
    print()
    
    # 5. Print detection results
    for i, det in enumerate(detections, 1):
        print(f"Detection {i}:")
        print(f"  Class ID: {det['class_id']}")
        print(f"  Class: {det['class_name']}")
        print(f"  Confidence: {det['confidence']:.2f}")
        print("  Bounding Box:")
        print(f"    x1: {det['bbox']['x1']:.1f}")
        print(f"    y1: {det['bbox']['y1']:.1f}")
        print(f"    x2: {det['bbox']['x2']:.1f}")
        print(f"    y2: {det['bbox']['y2']:.1f}")
        print()
        
    print("========================================")
    print("RESULT: PASS")
    print("========================================")

if __name__ == "__main__":
    main()
