import os
import sys
from pathlib import Path
import json

def test_yolo():
    try:
        import torch
        from ultralytics import YOLO
    except ImportError as e:
        print(f"IMPORT ERROR: {e}")
        return

    print("==================================================")
    print("SONAR-AI FINAL AI VERIFICATION")
    print("==================================================")
    print(f"PyTorch: {torch.__version__}")
    cuda_avail = torch.cuda.is_available()
    print(f"CUDA: {cuda_avail}")
    if cuda_avail:
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("GPU: None")

    print("\nUltralytics: installed")

    model_path = Path(r"runs\sonar\baseline_yolo11n\weights\best.pt")
    print(f"\nModel:\n{model_path}")
    
    if not model_path.exists():
        print("Best.pt loaded: FAIL (file not found)")
        return
        
    try:
        model = YOLO(str(model_path))
        print("\nBest.pt loaded: PASS")
    except Exception as e:
        print(f"\nBest.pt loaded: FAIL ({e})")
        return

    print("\nMockYOLO used: NO")
    print("REAL YOLO USED: YES")

    # Run on validation images
    val_dir = Path("dataset/side-scan-sonar-object-detection-challenge/valid/images")
    if val_dir.exists():
        imgs = list(val_dir.glob("*.jpg"))[:4]
        for i, img in enumerate(imgs):
            print(f"\nImage {i+1} -> {img.name}")
            results = model.predict(source=str(img), imgsz=640, verbose=False)
            boxes = results[0].boxes
            if boxes and len(boxes) > 0:
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    print(f"  actual prediction: cls={cls_id}, conf={conf:.2f}")
            else:
                print("  actual prediction: None")
    else:
        print("Validation dir not found.")

if __name__ == "__main__":
    test_yolo()
