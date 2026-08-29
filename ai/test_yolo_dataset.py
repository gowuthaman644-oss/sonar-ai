import os
import glob
import yaml
from pathlib import Path
from ultralytics import YOLO
import sys

def main():
    print("==================================================")
    print("SONAR-AI YOLO DATASET SANITY CHECK")
    print("==================================================")
    print()
    
    # 1. Import YOLO and load a model to validate the environment
    try:
        model = YOLO('yolov8n.pt')
        print("Ultralytics import: PASS")
        print("YOLO environment: PASS")
    except Exception as e:
        print(f"Ultralytics import: FAIL ({e})")
        sys.exit(1)
        
    print()
    
    base_dir = Path("dataset/side-scan-sonar-object-detection-challenge")
    yaml_path = base_dir / "data.yaml"
    
    # 3. Locate and load data.yaml
    if yaml_path.exists():
        with open(yaml_path, 'r') as f:
            data = yaml.safe_load(f)
        print("data.yaml: PASS")
    else:
        print("data.yaml: FAIL (File not found)")
        sys.exit(1)
        
    print()
    
    train_img_dir = base_dir / "train" / "images"
    train_lbl_dir = base_dir / "train" / "labels"
    valid_img_dir = base_dir / "valid" / "images"
    valid_lbl_dir = base_dir / "valid" / "labels"
    
    train_images = list(train_img_dir.glob("*.jpg"))
    train_labels = list(train_lbl_dir.glob("*.txt"))
    valid_images = list(valid_img_dir.glob("*.jpg"))
    valid_labels = list(valid_lbl_dir.glob("*.txt"))
    
    print(f"Train images: {len(train_images)}")
    print(f"Train labels: {len(train_labels)}")
    print()
    print(f"Validation images: {len(valid_images)}")
    print(f"Validation labels: {len(valid_labels)}")
    print()
    
    print("Classes:")
    for cid, name in data.get('names', {}).items():
        print(f"{cid}: {name}")
    print()
    
    total_bboxes = 0
    class_counts = {0: 0, 1: 0, 2: 0, 3: 0}
    invalid_classes = 0
    invalid_lines = 0
    out_of_range = 0
    
    for lbl_dir in [train_lbl_dir, valid_lbl_dir]:
        for txt in lbl_dir.glob("*.txt"):
            with open(txt, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    if len(parts) != 5:
                        invalid_lines += 1
                        continue
                        
                    try:
                        c = int(parts[0])
                        x, y, w, h = map(float, parts[1:])
                        
                        if c not in class_counts:
                            invalid_classes += 1
                        else:
                            class_counts[c] += 1
                            total_bboxes += 1
                            
                        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 <= w <= 1.0 and 0.0 <= h <= 1.0):
                            out_of_range += 1
                    except ValueError:
                        invalid_lines += 1

    print("Bounding boxes:")
    for cid, name in data.get('names', {}).items():
        print(f"{name}: {class_counts.get(cid, 0)}")
    print()
    
    print(f"Total bounding boxes: {total_bboxes}")
    print()
    
    print(f"Invalid class IDs: {invalid_classes}")
    print(f"Invalid annotation lines: {invalid_lines}")
    print(f"Out-of-range coordinates: {out_of_range}")
    print()
    
    print("==================================================")
    if invalid_classes == 0 and invalid_lines == 0 and out_of_range == 0:
        print("RESULT: PASS")
    else:
        print("RESULT: FAIL")
    print("==================================================")

if __name__ == "__main__":
    main()
