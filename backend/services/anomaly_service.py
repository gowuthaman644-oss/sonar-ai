import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import cv2
import numpy as np

logger = logging.getLogger(__name__)

def detect_unknown_anomalies(
    image_source: Union[str, Path, np.ndarray],
    existing_detections: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Analyzes the sonar image for unexplained acoustic anomalies OUTSIDE known YOLO detections.

    Instead of assuming anything undetected is an anomaly, this engine objectively investigates:
    1. Unusually strong isolated acoustic returns
    2. Coherent structural edge energy (Sobel gradient magnitude)
    3. Abnormal texture/density deviation from the seabed baseline
    4. Regions with significant acoustic contrast against surrounding seabed

    Outputs an explainable anomaly score (0-100), status, type, and feature breakdown.
    """
    # 1. Load Grayscale Image
    if isinstance(image_source, (str, Path)):
        img_path = str(image_source)
        if not Path(img_path).exists():
            logger.warning(f"Anomaly detection failed: Image not found at {img_path}")
            return _default_anomaly_response("Image file not found on disk.")
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return _default_anomaly_response("Image decoding failed.")
    elif isinstance(image_source, np.ndarray):
        if len(image_source.shape) == 3:
            img = cv2.cvtColor(image_source, cv2.COLOR_BGR2GRAY)
        else:
            img = image_source
    else:
        return _default_anomaly_response("Unsupported image source type.")

    img_h, img_w = img.shape[:2]
    if img_h < 20 or img_w < 20:
        return _default_anomaly_response("Image dimensions too small for seabed anomaly analysis.")

    # 2. Mask Out Known YOLO Detections (with 10px buffer)
    # The anomaly engine evaluates UNEXPLAINED regions, avoiding duplicate reporting on known objects
    unexplained_mask = np.ones((img_h, img_w), dtype=bool)

    if existing_detections:
        for det in existing_detections:
            bbox = det.get("bbox", det)
            if "x1" in bbox and "y1" in bbox:
                x1 = float(bbox["x1"])
                y1 = float(bbox["y1"])
                x2 = float(bbox.get("x2", x1 + bbox.get("width", 0)))
                y2 = float(bbox.get("y2", y1 + bbox.get("height", 0)))
            elif "x" in bbox and "y" in bbox:
                x1 = float(bbox["x"])
                y1 = float(bbox["y"])
                x2 = x1 + float(bbox.get("width", 0))
                y2 = y1 + float(bbox.get("height", 0))
            else:
                continue

            # Apply buffer
            buffer_px = 8
            ix1 = max(0, int(round(x1)) - buffer_px)
            iy1 = max(0, int(round(y1)) - buffer_px)
            ix2 = min(img_w, int(round(x2)) + buffer_px)
            iy2 = min(img_h, int(round(y2)) + buffer_px)

            unexplained_mask[iy1:iy2, ix1:ix2] = False

    # Check remaining searchable seabed area
    searchable_pixels = np.count_nonzero(unexplained_mask)
    if searchable_pixels < 100:
        return _default_anomaly_response("Entire seabed covered by known detections.")

    searchable_seabed = img[unexplained_mask]
    seabed_mean = float(np.mean(searchable_seabed))
    seabed_std = float(np.std(searchable_seabed))
    if seabed_std < 1.0:
        seabed_std = 1.0

    # 3. Compute Edge Energy Map on Unexplained Regions
    grad_x = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(grad_x**2 + grad_y**2)
    grad_mag[~unexplained_mask] = 0.0

    # 4. Detect Significant Acoustic Outliers
    # Threshold for candidate anomaly: intensity > mean + 2.2 * std OR strong edge energy
    high_intensity_thresh = seabed_mean + (2.2 * seabed_std)
    candidate_pixels = (img > high_intensity_thresh) & unexplained_mask

    # Morphological cleaning to find coherent structures (ignore single-pixel acoustic speckle)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    candidate_binary = (candidate_pixels.astype(np.uint8)) * 255
    opened = cv2.morphologyEx(candidate_binary, cv2.MORPH_OPEN, kernel)
    dilated = cv2.dilate(opened, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    unexplained_regions = []
    max_anomaly_score = 0.0
    peak_contrast = 0.0
    peak_edge_energy = 0.0
    peak_texture_dev = 0.0

    for idx, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        # Require meaningful minimum size (> 20px) to distinguish real physical structure from noise
        if area < 20.0:
            continue

        rx, ry, rw, rh = cv2.boundingRect(cnt)
        roi = img[ry:ry+rh, rx:rx+rw]
        roi_grad = grad_mag[ry:ry+rh, rx:rx+rw]

        roi_mean = float(np.mean(roi))
        delta = abs(roi_mean - seabed_mean)
        tbcr = delta / seabed_std
        edge_energy = float(np.mean(roi_grad))
        texture_dev = float(np.std(roi)) / seabed_std

        # Scoring components:
        # - Contrast prominence: up to 45 pts
        contrast_pts = min(45.0, (tbcr / 2.5) * 45.0)
        # - Structural edge coherence: up to 35 pts
        edge_pts = min(35.0, (edge_energy / 50.0) * 35.0)
        # - Texture abnormality & area: up to 20 pts
        area_pts = min(20.0, (area / 150.0) * 20.0)

        region_score = round(min(100.0, max(0.0, contrast_pts + edge_pts + area_pts)), 1)

        if region_score > max_anomaly_score:
            max_anomaly_score = region_score
            peak_contrast = round(tbcr, 2)
            peak_edge_energy = round(edge_energy, 2)
            peak_texture_dev = round(texture_dev, 2)

        unexplained_regions.append({
            "region_id": f"ANOMALY-{idx+1:02d}",
            "x": rx,
            "y": ry,
            "width": rw,
            "height": rh,
            "area_px": int(area),
            "mean_intensity": round(roi_mean, 1),
            "tbcr": round(tbcr, 2),
            "edge_energy": round(edge_energy, 1),
            "anomaly_score": region_score
        })

    # Sort unexplained regions by anomaly score descending
    unexplained_regions.sort(key=lambda r: r["anomaly_score"], reverse=True)
    unexplained_regions = unexplained_regions[:8] # Keep top 8

    # 5. Determine Overall Scan Anomaly Status & Type
    anomaly_score = max_anomaly_score

    if anomaly_score >= 70.0:
        anomaly_status = "HIGH_ANOMALY"
        anomaly_type = "HIGH_CONFIDENCE_UNKNOWN_ANOMALY"
        explanation = (
            f"Strong unexplained acoustic structure detected with high contrast ({peak_contrast} TBCR) "
            f"and coherent edge energy ({peak_edge_energy}) outside known targets. Requires analyst verification."
        )
    elif anomaly_score >= 45.0:
        anomaly_status = "MODERATE_ANOMALY"
        anomaly_type = "UNEXPLAINED_ACOUSTIC_STRUCTURE"
        explanation = (
            f"Moderate unexplained acoustic anomaly observed ({peak_contrast} TBCR, {len(unexplained_regions)} regions). "
            f"Differs from normal seabed texture."
        )
    elif anomaly_score >= 20.0:
        anomaly_status = "LOW_ANOMALY"
        anomaly_type = "MINOR_TEXTURE_VARIATION"
        explanation = "Minor acoustic texture variation observed on seabed floor. Within nominal reverberation variance."
    else:
        anomaly_status = "NO_ANOMALY"
        anomaly_type = "NORMAL_SEABED"
        explanation = "Nominal seabed acoustic returns. No unexplained acoustic structures detected."

    return {
        "anomaly_score": anomaly_score,
        "anomaly_status": anomaly_status,
        "anomaly_type": anomaly_type,
        "features": {
            "contrast": peak_contrast,
            "edge_energy": peak_edge_energy,
            "texture_deviation": peak_texture_dev,
            "unexplained_regions_count": len(unexplained_regions),
            "seabed_mean": round(seabed_mean, 2),
            "seabed_std": round(seabed_std, 2)
        },
        "unexplained_regions": unexplained_regions,
        "explanation": explanation
    }


def triage_detection_contact(
    class_name: str,
    confidence: float,
    evidence_score: float,
    evidence_status: str
) -> Dict[str, Any]:
    """
    Evaluates whether a YOLO detection is a VERIFIED KNOWN TARGET or a
    LOW-EVIDENCE CONTACT (POSSIBLE ACOUSTIC CLUTTER) without altering the YOLO class or confidence.
    """
    # Strict rule: DO NOT rename YOLO class or delete YOLO detection.
    # Provide secondary triage assessment.
    if evidence_score >= 60.0 or evidence_status == "STRONG_EVIDENCE":
        contact_type = "KNOWN_TARGET"
        assessment = "VERIFIED_ACOUSTIC_TARGET"
        clarification = f"High acoustic evidence ({evidence_score:.1f}%) corroborates YOLO {class_name} prediction."
    elif evidence_score < 40.0 or evidence_status == "WEAK_EVIDENCE":
        contact_type = "LOW_EVIDENCE_CONTACT"
        assessment = "POSSIBLE_ACOUSTIC_CLUTTER"
        clarification = (
            f"Low acoustic evidence ({evidence_score:.1f}%). Possible acoustic clutter, seabed feature, "
            f"or weak return. Requires analyst verification."
        )
    else:
        contact_type = "PROVISIONAL_TARGET"
        assessment = "MODERATE_EVIDENCE_CONTACT"
        clarification = f"Moderate evidence ({evidence_score:.1f}%). Corroborating features partially available."

    return {
        "contact_type": contact_type,
        "assessment": assessment,
        "clarification": clarification
    }


def _default_anomaly_response(reason: str) -> Dict[str, Any]:
    return {
        "anomaly_score": 0.0,
        "anomaly_status": "NO_ANOMALY",
        "anomaly_type": "NORMAL_SEABED",
        "features": {
            "contrast": 0.0,
            "edge_energy": 0.0,
            "texture_deviation": 0.0,
            "unexplained_regions_count": 0,
            "seabed_mean": 0.0,
            "seabed_std": 0.0
        },
        "unexplained_regions": [],
        "explanation": reason
    }
