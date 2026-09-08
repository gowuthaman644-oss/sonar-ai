import os
import sys
import json
import csv
from pathlib import Path
import numpy as np

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ultralytics import YOLO

CLASS_NAMES = {
    0: "airplane",
    1: "mine",
    2: "drowning victim",
    3: "wreck"
}

def run_baseline_evaluation(
    model_path: str = None,
    data_yaml_path: str = None,
    output_dir: str = None,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.6
):
    """
    Executes reproducible YOLO11n baseline evaluation against the authentic validation dataset.
    """
    if model_path is None:
        model_path = str(PROJECT_ROOT / "runs" / "sonar" / "baseline_yolo11n" / "weights" / "best.pt")
    if data_yaml_path is None:
        data_yaml_path = str(PROJECT_ROOT / "dataset" / "side-scan-sonar-object-detection-challenge" / "data.yaml")
    if output_dir is None:
        output_dir = str(PROJECT_ROOT / "evaluation_results")

    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)

    print(f"--- [EXPERIMENT A: YOLO11n Baseline Evaluation] ---")
    print(f"Loading model from: {model_path}")
    print(f"Dataset config: {data_yaml_path}")
    
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Model weights not found at: {model_path}")
    if not Path(data_yaml_path).exists():
        raise FileNotFoundError(f"Data config not found at: {data_yaml_path}")

    model = YOLO(model_path)
    
    val_results = model.val(
        data=data_yaml_path,
        split='val',
        imgsz=640,
        batch=16,
        conf=conf_threshold,
        iou=iou_threshold,
        device='cpu',
        plots=True,
        verbose=False
    )

    # Extract metrics
    precision_mean = float(val_results.box.mp)
    recall_mean = float(val_results.box.mr)
    map50 = float(val_results.box.map50)
    map50_95 = float(val_results.box.map)
    f1_mean = (2 * precision_mean * recall_mean / (precision_mean + recall_mean)) if (precision_mean + recall_mean) > 0 else 0.0

    # Per-class metrics
    class_metrics = {}
    class_precisions = val_results.box.p
    class_recalls = val_results.box.r
    class_f1s = val_results.box.f1
    class_ap50s = val_results.box.ap50
    class_ap50_95s = val_results.box.ap

    for cls_idx, cls_name in CLASS_NAMES.items():
        p_val = float(class_precisions[cls_idx]) if cls_idx < len(class_precisions) else 0.0
        r_val = float(class_recalls[cls_idx]) if cls_idx < len(class_recalls) else 0.0
        f1_val = float(class_f1s[cls_idx]) if cls_idx < len(class_f1s) else ((2 * p_val * r_val / (p_val + r_val)) if (p_val + r_val) > 0 else 0.0)
        ap50_val = float(class_ap50s[cls_idx]) if cls_idx < len(class_ap50s) else 0.0
        ap_val = float(class_ap50_95s[cls_idx]) if cls_idx < len(class_ap50_95s) else 0.0

        class_metrics[cls_name] = {
            "class_id": cls_idx,
            "precision": round(p_val, 4),
            "recall": round(r_val, 4),
            "f1": round(f1_val, 4),
            "map50": round(ap50_val, 4),
            "map50_95": round(ap_val, 4)
        }

    # Confusion Matrix
    cm = val_results.confusion_matrix.matrix.tolist() if hasattr(val_results, 'confusion_matrix') and hasattr(val_results.confusion_matrix, 'matrix') else []

    # Count GT instances and predictions from validation set
    valid_img_dir = PROJECT_ROOT / "dataset" / "side-scan-sonar-object-detection-challenge" / "valid" / "images"
    valid_lbl_dir = PROJECT_ROOT / "dataset" / "side-scan-sonar-object-detection-challenge" / "valid" / "labels"
    image_count = len(list(valid_img_dir.glob("*.*"))) if valid_img_dir.exists() else 0
    
    gt_class_counts = {cls_name: 0 for cls_name in CLASS_NAMES.values()}
    total_gt_instances = 0
    if valid_lbl_dir.exists():
        for lf in valid_lbl_dir.glob("*.txt"):
            with open(lf, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if parts:
                        cid = int(parts[0])
                        if cid in CLASS_NAMES:
                            gt_class_counts[CLASS_NAMES[cid]] += 1
                            total_gt_instances += 1

    for cls_name, count in gt_class_counts.items():
        if cls_name in class_metrics:
            class_metrics[cls_name]["ground_truth_instances"] = count

    baseline_payload = {
        "experiment": "EXPERIMENT_A_YOLO11N_BASELINE",
        "model": "YOLO11n (fused 101 layers)",
        "model_weights": str(model_path),
        "dataset": "side-scan-sonar-object-detection-challenge",
        "split": "val",
        "image_count": image_count,
        "total_ground_truth_instances": total_gt_instances,
        "evaluation_settings": {
            "conf_threshold": conf_threshold,
            "iou_threshold": iou_threshold,
            "imgsz": 640,
            "device": "cpu"
        },
        "overall_metrics": {
            "precision": round(precision_mean, 4),
            "recall": round(recall_mean, 4),
            "f1": round(f1_mean, 4),
            "map50": round(map50, 4),
            "map50_95": round(map50_95, 4)
        },
        "class_metrics": class_metrics,
        "confusion_matrix": cm
    }

    # Save baseline_metrics.json
    baseline_json_path = out_p / "baseline_metrics.json"
    with open(baseline_json_path, "w") as f:
        json.dump(baseline_payload, f, indent=2)
    print(f"Saved baseline metrics to: {baseline_json_path}")

    # Save confusion_matrix.csv
    if cm:
        cm_csv_path = out_p / "confusion_matrix.csv"
        cm_labels = [CLASS_NAMES[i] for i in range(len(CLASS_NAMES))] + ["background"]
        with open(cm_csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Actual \\ Predicted"] + cm_labels[:len(cm[0])])
            for idx, row in enumerate(cm):
                row_label = cm_labels[idx] if idx < len(cm_labels) else f"Class_{idx}"
                writer.writerow([row_label] + row)
        print(f"Saved confusion matrix to: {cm_csv_path}")

    return baseline_payload

if __name__ == "__main__":
    run_baseline_evaluation()
