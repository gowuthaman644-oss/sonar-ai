import os
import sys
import json
from pathlib import Path
import numpy as np
import cv2

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ultralytics import YOLO
from backend.services.evidence_service import analyze_acoustic_evidence
from backend.services.anomaly_service import triage_detection_contact
from backend.services.uncertainty_service import evaluate_detection_uncertainty
from backend.services.risk_service import calculate_risk

CLASS_NAMES = {
    0: "airplane",
    1: "mine",
    2: "drowning victim",
    3: "wreck"
}

def run_enhanced_evaluation(
    model_path: str = None,
    valid_images_dir: str = None,
    output_dir: str = None,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.6
):
    """
    Executes reproducible SONAR-AI enhanced evaluation pipeline against the authentic validation dataset.
    """
    if model_path is None:
        model_path = str(PROJECT_ROOT / "runs" / "sonar" / "baseline_yolo11n" / "weights" / "best.pt")
    if valid_images_dir is None:
        valid_images_dir = str(PROJECT_ROOT / "dataset" / "side-scan-sonar-object-detection-challenge" / "valid" / "images")
    if output_dir is None:
        output_dir = str(PROJECT_ROOT / "evaluation_results")

    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)

    img_dir = Path(valid_images_dir)
    image_paths = sorted(list(img_dir.glob("*.*")))

    print(f"--- [EXPERIMENT B: SONAR-AI Enhanced Pipeline Evaluation] ---")
    print(f"Loading model from: {model_path}")
    print(f"Evaluating {len(image_paths)} validation images through Enhanced Intelligence Pipeline...")

    model = YOLO(model_path)

    all_detections_data = []
    per_class_evidence = {name: {"confidences": [], "evidence_scores": [], "uncertainties": []} for name in CLASS_NAMES.values()}
    evidence_status_counts = {"STRONG_EVIDENCE": 0, "MODERATE_EVIDENCE": 0, "WEAK_EVIDENCE": 0, "INSUFFICIENT_EVIDENCE": 0}
    uncertainty_level_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    contact_type_counts = {"KNOWN_TARGET": 0, "LOW_EVIDENCE_CONTACT": 0, "UNCLASSIFIED_CONTACT": 0}
    risk_level_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    scan_risk_scores = []

    # High Conf Low Ev (Potential Clutter Candidates)
    potential_clutter_candidates = 0

    for img_path in image_paths:
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue

        h, w = img_bgr.shape[:2]
        results = model.predict(source=str(img_path), conf=conf_threshold, iou=iou_threshold, device='cpu', verbose=False)
        
        scan_detections = []
        raw_dets_for_risk = []

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = xyxy
                bx = float(x1)
                by = float(y1)
                bw = float(x2 - x1)
                bh = float(y2 - y1)
                cls_name = CLASS_NAMES.get(cls_id, f"class_{cls_id}")

                # 1. Acoustic Evidence Engine
                bbox_dict = {"x": bx, "y": by, "width": bw, "height": bh}
                ev_res = analyze_acoustic_evidence(str(img_path), bbox_dict)
                ev_score = float(ev_res.get("evidence_score", 0.0))
                ev_status = ev_res.get("evidence_status", "INSUFFICIENT_EVIDENCE")
                evidence_status_counts[ev_status] = evidence_status_counts.get(ev_status, 0) + 1

                # 2. Contact Triage
                tri_res = triage_detection_contact(cls_name, conf, ev_score, ev_status)
                c_type = tri_res.get("contact_type", "KNOWN_TARGET")
                contact_type_counts[c_type] = contact_type_counts.get(c_type, 0) + 1

                # 3. Uncertainty Engine
                unc_res = evaluate_detection_uncertainty(conf, ev_score, ev_status, ev_res, c_type)
                unc_level = unc_res.get("uncertainty_level", "LOW")
                uncertainty_level_counts[unc_level] = uncertainty_level_counts.get(unc_level, 0) + 1

                det_record = {
                    "image": img_path.name,
                    "class_name": cls_name,
                    "confidence": round(conf, 4),
                    "bbox": bbox_dict,
                    "evidence_score": round(ev_score, 2),
                    "evidence_status": ev_status,
                    "contact_type": c_type,
                    "uncertainty_level": unc_level,
                    "uncertainty_score": round(float(unc_res.get("uncertainty_score", 0.0)), 2),
                    "snr_db": round(float(ev_res.get("metrics", {}).get("snr_db", 0.0)), 2),
                    "tbcr": round(float(ev_res.get("metrics", {}).get("tbcr", 0.0)), 2),
                    "shadow_contrast": round(float(ev_res.get("metrics", {}).get("shadow_contrast", 0.0)), 2)
                }
                scan_detections.append(det_record)
                raw_dets_for_risk.append({
                    "class_name": cls_name,
                    "confidence": conf,
                    "x": bx,
                    "y": by,
                    "width": bw,
                    "height": bh,
                    "evidence": ev_res,
                    "uncertainty": unc_res,
                    "contact_type": c_type
                })

                if cls_name in per_class_evidence:
                    per_class_evidence[cls_name]["confidences"].append(conf)
                    per_class_evidence[cls_name]["evidence_scores"].append(ev_score)
                    per_class_evidence[cls_name]["uncertainties"].append(float(unc_res.get("uncertainty_score", 0.0)))

                if conf >= 0.50 and ev_score < 40.0:
                    potential_clutter_candidates += 1

        # 4. Whole Scan Risk Assessment
        risk_res = calculate_risk(raw_dets_for_risk)
        r_level = risk_res.get("risk_level", "LOW")
        r_score = float(risk_res.get("risk_score", 0.0))
        risk_level_counts[r_level] = risk_level_counts.get(r_level, 0) + 1
        scan_risk_scores.append(r_score)

        all_detections_data.extend(scan_detections)

    total_dets = len(all_detections_data)
    all_ev_scores = [d["evidence_score"] for d in all_detections_data]
    all_confs = [d["confidence"] for d in all_detections_data]
    all_unc_scores = [d["uncertainty_score"] for d in all_detections_data]

    # Calculate correlation between confidence and evidence
    if len(all_confs) > 1:
        corr_matrix = np.corrcoef(all_confs, all_ev_scores)
        conf_ev_corr = float(corr_matrix[0, 1]) if not np.isnan(corr_matrix[0, 1]) else 0.0
    else:
        conf_ev_corr = 0.0

    # Class summary
    class_intelligence_summary = {}
    for cls_name, data in per_class_evidence.items():
        c_count = len(data["confidences"])
        class_intelligence_summary[cls_name] = {
            "total_detections": c_count,
            "mean_confidence": round(float(np.mean(data["confidences"])), 4) if c_count > 0 else 0.0,
            "mean_evidence_score": round(float(np.mean(data["evidence_scores"])), 2) if c_count > 0 else 0.0,
            "std_evidence_score": round(float(np.std(data["evidence_scores"])), 2) if c_count > 0 else 0.0,
            "mean_uncertainty_score": round(float(np.mean(data["uncertainties"])), 2) if c_count > 0 else 0.0
        }

    enhanced_payload = {
        "experiment": "EXPERIMENT_B_SONAR_AI_ENHANCED",
        "description": "Downstream operational intelligence evaluation on authentic validation set",
        "dataset_images_evaluated": len(image_paths),
        "total_ai_detections": total_dets,
        "evidence_metrics": {
            "mean_evidence_score": round(float(np.mean(all_ev_scores)), 2) if total_dets > 0 else 0.0,
            "median_evidence_score": round(float(np.median(all_ev_scores)), 2) if total_dets > 0 else 0.0,
            "std_evidence_score": round(float(np.std(all_ev_scores)), 2) if total_dets > 0 else 0.0,
            "min_evidence_score": round(float(np.min(all_ev_scores)), 2) if total_dets > 0 else 0.0,
            "max_evidence_score": round(float(np.max(all_ev_scores)), 2) if total_dets > 0 else 0.0,
            "confidence_evidence_correlation": round(conf_ev_corr, 4),
            "evidence_status_distribution": evidence_status_counts
        },
        "uncertainty_metrics": {
            "mean_uncertainty_score": round(float(np.mean(all_unc_scores)), 2) if total_dets > 0 else 0.0,
            "uncertainty_level_distribution": uncertainty_level_counts
        },
        "contact_triage_metrics": {
            "contact_type_distribution": contact_type_counts,
            "potential_clutter_triage_candidates": potential_clutter_candidates
        },
        "risk_assessment_metrics": {
            "mean_scan_risk_score": round(float(np.mean(scan_risk_scores)), 2) if scan_risk_scores else 0.0,
            "risk_level_distribution": risk_level_counts
        },
        "class_intelligence_summary": class_intelligence_summary,
        "detections_sample": all_detections_data[:20] # Sample for audit
    }

    # Save enhanced_metrics.json
    enhanced_json_path = out_p / "enhanced_metrics.json"
    with open(enhanced_json_path, "w") as f:
        json.dump(enhanced_payload, f, indent=2)
    print(f"Saved enhanced metrics to: {enhanced_json_path}")

    return enhanced_payload

if __name__ == "__main__":
    run_enhanced_evaluation()
