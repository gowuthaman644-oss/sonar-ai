import sys
import torch
import random
from pathlib import Path
from ultralytics import YOLO

def main():
    print("==================================================")
    print("SONAR-AI INFERENCE TEST")
    print("==================================================")
    print()
    
    weights_path = Path("runs/sonar/baseline_yolo11n/weights/best.pt")
    if not weights_path.exists():
        print(f"ERROR: Model weights not found at {weights_path}")
        sys.exit(1)
        
    # 2. Load best.pt
    model = YOLO(str(weights_path))
    print("Model loaded: PASS")
    
    # 3. Automatically use CUDA GPU 0 if available
    cuda_avail = torch.cuda.is_available()
    device = 0 if cuda_avail else "cpu"
    if cuda_avail:
        print(f"Device: {torch.cuda.get_device_name(0)}")
    else:
        print("Device: CPU")
        
    print()
    
    # 4. Select a few real images
    valid_dir = Path("dataset/side-scan-sonar-object-detection-challenge/valid/images")
    if not valid_dir.exists():
        print(f"ERROR: Validation directory not found at {valid_dir}")
        sys.exit(1)
        
    all_images = list(valid_dir.glob("*.jpg"))
    if not all_images:
        print(f"ERROR: No images found in {valid_dir}")
        sys.exit(1)
        
    # Pick 5 images for validation
    test_images = all_images[:5]
    
    # 10, 18. Create outputs directory
    out_dir = Path("outputs/inference")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Class names mapping
    class_names = {
        0: "airplane",
        1: "mine",
        2: "drowning victim",
        3: "wreck"
    }
    
    total_detections = 0
    images_processed = 0
    
    # 5. Run inference on 5 images
    # 6. Use imgsz=640
    # 7. Use conf=0.25
    for img_path in test_images:
        print(f"Image: {img_path.name}")
        
        results = model.predict(
            source=str(img_path),
            imgsz=640,
            conf=0.25,
            device=device,
            save=True,          # YOLO saves directly to its default runs/detect folder
            project=str(out_dir.parent),
            name=out_dir.name,
            exist_ok=True,
            verbose=False
        )
        
        result = results[0]
        boxes = result.boxes
        
        num_dets = len(boxes) if boxes else 0
        total_detections += num_dets
        images_processed += 1
        
        if num_dets == 0:
            print("  Detection: None")
        else:
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()
                
                # 9. Print object details
                c_name = class_names.get(cls_id, "unknown")
                print("  Detection:")
                print(f"    Class: {c_name} ({cls_id})")
                print(f"    Confidence: {conf:.2f}")
                print(f"    Box: [x1: {xyxy[0]:.1f}, y1: {xyxy[1]:.1f}, x2: {xyxy[2]:.1f}, y2: {xyxy[3]:.1f}]")
                
        print()
        
    # 16. Final summary
    print("==================================================")
    print("Inference complete.")
    print(f"Images processed: {images_processed}")
    print(f"Total detections: {total_detections}")
    print(f"Annotated images saved to: {out_dir.absolute()}")
    print("==================================================")

if __name__ == "__main__":
    main()
