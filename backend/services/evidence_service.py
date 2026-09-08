import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import cv2
import numpy as np

logger = logging.getLogger(__name__)

def analyze_acoustic_evidence(
    image_source: Union[str, Path, np.ndarray],
    bbox: Dict[str, float],
    detection_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyzes measurable visual and acoustic-image properties for a single YOLO detection
    using ONLY actual image pixels and actual bounding-box coordinates.

    Measurable properties evaluated:
    1. Object-region intensity distribution and contrast
    2. Local background perimeter ring contrast
    3. Bounding-box spatial occupancy ratio
    4. Shape characteristics (aspect ratio, dimensions)
    5. Structural edge strength / gradient energy (Sobel operator)
    6. Shadow-region characteristics where measurable (down-range sector analysis)

    Returns an Evidence Consistency assessment with evidence_score (0-100) and status:
    STRONG_EVIDENCE, MODERATE_EVIDENCE, WEAK_EVIDENCE, INSUFFICIENT_EVIDENCE.
    """
    # 1. Load Grayscale Image
    if isinstance(image_source, (str, Path)):
        img_path = str(image_source)
        if not Path(img_path).exists():
            logger.warning(f"Evidence analysis failed: Image not found at {img_path}")
            return _insufficient_evidence(detection_id, "Image file not found on disk.")
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return _insufficient_evidence(detection_id, "Image decoding failed.")
    elif isinstance(image_source, np.ndarray):
        if len(image_source.shape) == 3:
            img = cv2.cvtColor(image_source, cv2.COLOR_BGR2GRAY)
        else:
            img = image_source
    else:
        return _insufficient_evidence(detection_id, "Unsupported image source type.")

    img_h, img_w = img.shape[:2]
    if img_h < 10 or img_w < 10:
        return _insufficient_evidence(detection_id, "Image dimensions too small for acoustic analysis.")

    # 2. Extract and Validate Bounding Box Coordinates
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
        return _insufficient_evidence(detection_id, "Malformed bounding box coordinates.")

    # Clip to image boundaries
    ix1 = max(0, min(img_w - 1, int(round(x1))))
    iy1 = max(0, min(img_h - 1, int(round(y1))))
    ix2 = max(ix1 + 1, min(img_w, int(round(x2))))
    iy2 = max(iy1 + 1, min(img_h, int(round(y2))))

    box_w = ix2 - ix1
    box_h = iy2 - iy1

    if box_w < 4 or box_h < 4:
        return _insufficient_evidence(detection_id, "Bounding box area is too small (< 16px) for acoustic measurement.")

    roi = img[iy1:iy2, ix1:ix2]
    features_available: List[str] = []

    # 3. Object Features
    obj_mean = float(np.mean(roi))
    obj_std = float(np.std(roi))
    obj_min = float(np.min(roi))
    obj_max = float(np.max(roi))
    aspect_ratio = round(box_w / float(box_h), 3) if box_h > 0 else 1.0

    # Calculate Highlight Occupancy (fraction of box containing acoustic returns >= local object mean)
    highlight_pixels = np.count_nonzero(roi >= obj_mean)
    occupancy_ratio = round(float(highlight_pixels) / float(box_w * box_h), 3)

    object_features = {
        "mean_intensity": round(obj_mean, 2),
        "std_intensity": round(obj_std, 2),
        "min_intensity": round(obj_min, 2),
        "max_intensity": round(obj_max, 2),
        "occupancy_ratio": occupancy_ratio,
        "aspect_ratio": aspect_ratio,
        "box_width_px": box_w,
        "box_height_px": box_h
    }
    features_available.extend(["object_intensity", "spatial_occupancy", "aspect_ratio"])

    # 4. Local Background Ring Analysis
    # Construct an outer perimeter collar around the object (12-25px), excluding the object itself
    pad = max(8, min(24, int(min(box_w, box_h) * 0.4)))
    bg_y1 = max(0, iy1 - pad)
    bg_y2 = min(img_h, iy2 + pad)
    bg_x1 = max(0, ix1 - pad)
    bg_x2 = min(img_w, ix2 + pad)

    bg_crop = img[bg_y1:bg_y2, bg_x1:bg_x2]
    # Mask out the inner object region
    mask = np.ones(bg_crop.shape, dtype=bool)
    inner_y1 = iy1 - bg_y1
    inner_y2 = inner_y1 + box_h
    inner_x1 = ix1 - bg_x1
    inner_x2 = inner_x1 + box_w
    mask[inner_y1:inner_y2, inner_x1:inner_x2] = False

    bg_pixels = bg_crop[mask]
    if len(bg_pixels) >= 10:
        bg_mean = float(np.mean(bg_pixels))
        bg_std = float(np.std(bg_pixels))
        background_features = {
            "bg_mean_intensity": round(bg_mean, 2),
            "bg_std_intensity": round(bg_std, 2),
            "collar_sample_count": int(len(bg_pixels))
        }
        features_available.append("local_background_collar")
    else:
        bg_mean = float(np.mean(img))
        bg_std = float(np.std(img))
        background_features = {
            "bg_mean_intensity": round(bg_mean, 2),
            "bg_std_intensity": round(bg_std, 2),
            "collar_sample_count": 0
        }

    # 5. Contrast Features (Target-to-Background Contrast Ratio - TBCR)
    intensity_delta = round(obj_mean - bg_mean, 2)
    denominator = bg_std if bg_std > 1.0 else 1.0
    tbcr = round(abs(obj_mean - bg_mean) / denominator, 3)

    contrast_features = {
        "tbcr": tbcr,
        "intensity_delta": intensity_delta,
        "relative_contrast": round(abs(obj_mean - bg_mean) / (max(obj_mean, bg_mean) + 1e-4), 3)
    }
    features_available.append("target_to_background_contrast")

    # 6. Structural & Edge Strength (Sobel Gradients)
    if box_w >= 4 and box_h >= 4:
        grad_x = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(roi, cv2.CV_64F, 0, 1, ksize=3)
        grad_mag = np.sqrt(grad_x**2 + grad_y**2)
        grad_energy = float(np.mean(grad_mag))
        
        edge_threshold = max(25.0, 1.5 * obj_std)
        edge_pixel_count = np.count_nonzero(grad_mag > edge_threshold)
        edge_density = round(float(edge_pixel_count) / float(box_w * box_h), 3)

        structural_features = {
            "gradient_energy": round(grad_energy, 2),
            "edge_density": edge_density
        }
        features_available.append("structural_edge_energy")
    else:
        structural_features = {
            "gradient_energy": 0.0,
            "edge_density": 0.0
        }

    # 7. Acoustic Shadow Analysis (Down-Range Sector Inspection)
    shadow_detected = False
    shadow_status = "NOT_OBSERVED"
    shadow_mean_val: Optional[float] = None
    shadow_contrast_val: Optional[float] = None
    shadow_sector = "NONE"

    # Inspect right sector
    shadow_w = min(int(box_w * 1.2), img_w - ix2)
    right_shadow = None
    left_shadow = None

    if shadow_w >= 6:
        right_shadow = img[iy1:iy2, ix2:ix2 + shadow_w]
    
    # Inspect left sector
    shadow_w_left = min(int(box_w * 1.2), ix1)
    if shadow_w_left >= 6:
        left_shadow = img[iy1:iy2, ix1 - shadow_w_left:ix1]

    candidates = []
    if right_shadow is not None and right_shadow.size > 0:
        m_r = float(np.mean(right_shadow))
        s_r = float(np.std(right_shadow))
        candidates.append(("RIGHT", m_r, s_r))

    if left_shadow is not None and left_shadow.size > 0:
        m_l = float(np.mean(left_shadow))
        s_l = float(np.std(left_shadow))
        candidates.append(("LEFT", m_l, s_l))

    for sector_name, s_mean, s_std in candidates:
        if s_mean < (0.55 * bg_mean) and s_mean < obj_mean:
            shadow_detected = True
            shadow_status = "DETECTED"
            shadow_mean_val = round(s_mean, 2)
            shadow_contrast_val = round((bg_mean - s_mean) / (bg_std + 1e-4), 3)
            shadow_sector = sector_name
            features_available.append("acoustic_shadow")
            break

    shadow_features = {
        "shadow_detected": shadow_detected,
        "shadow_status": shadow_status,
        "shadow_sector": shadow_sector,
        "shadow_mean_intensity": shadow_mean_val,
        "shadow_contrast": shadow_contrast_val
    }

    # 8. Compute Objective Evidence Consistency Score (0 to 100)
    # Balanced weighting:
    # - Contrast prominence: up to 40 points (requires both relative separation and absolute intensity delta)
    # - Structural edge strength: up to 30 points (Sobel gradients)
    # - Spatial highlight occupancy: up to 15 points (coherent sub-region clustering)
    # - Acoustic shadow corroboration: up to 15 points (bonus if observed, non-punitive if absent)
    rel_contrast = contrast_features["relative_contrast"]
    eff_delta = max(0.0, abs(intensity_delta) - 4.0)
    contrast_score = min(40.0, (rel_contrast * 25.0) + min(15.0, (eff_delta / 40.0) * 15.0))

    grad_score = min(20.0, (structural_features["gradient_energy"] / 50.0) * 20.0)
    edge_score = min(10.0, (structural_features["edge_density"] / 0.30) * 10.0)
    structure_score = grad_score + edge_score

    occ = occupancy_ratio
    if 0.15 <= occ <= 0.85:
        occupancy_score = 15.0
    elif occ > 0.85:
        occupancy_score = max(5.0, 15.0 - (occ - 0.85) * 40.0)
    else:
        occupancy_score = max(2.0, occ * 10.0)

    if shadow_detected:
        shadow_score = 15.0
        raw_score = contrast_score + structure_score + occupancy_score + shadow_score
    else:
        raw_score = (contrast_score + structure_score + occupancy_score) * (100.0 / 85.0)

    evidence_score = round(min(100.0, max(0.0, raw_score)), 1)

    # 9. Evidence Status
    if evidence_score >= 70.0:
        evidence_status = "STRONG_EVIDENCE"
    elif evidence_score >= 40.0:
        evidence_status = "MODERATE_EVIDENCE"
    else:
        evidence_status = "WEAK_EVIDENCE"

    return {
        "detection_id": detection_id or "DET-UNSPECIFIED",
        "object_features": object_features,
        "contrast_features": contrast_features,
        "background_features": background_features,
        "structural_features": structural_features,
        "shadow_features": shadow_features,
        "evidence_features_available": features_available,
        "evidence_score": evidence_score,
        "evidence_status": evidence_status
    }


def _insufficient_evidence(detection_id: Optional[str], reason: str) -> Dict[str, Any]:
    return {
        "detection_id": detection_id or "DET-UNSPECIFIED",
        "object_features": {
            "mean_intensity": 0.0,
            "std_intensity": 0.0,
            "min_intensity": 0.0,
            "max_intensity": 0.0,
            "occupancy_ratio": 0.0,
            "aspect_ratio": 0.0,
            "box_width_px": 0,
            "box_height_px": 0
        },
        "contrast_features": {
            "tbcr": 0.0,
            "intensity_delta": 0.0,
            "relative_contrast": 0.0
        },
        "background_features": {
            "bg_mean_intensity": 0.0,
            "bg_std_intensity": 0.0,
            "collar_sample_count": 0
        },
        "structural_features": {
            "gradient_energy": 0.0,
            "edge_density": 0.0
        },
        "shadow_features": {
            "shadow_detected": False,
            "shadow_status": "NOT_OBSERVED",
            "shadow_sector": "NONE",
            "shadow_mean_intensity": None,
            "shadow_contrast": None
        },
        "evidence_features_available": [],
        "evidence_score": 0.0,
        "evidence_status": "INSUFFICIENT_EVIDENCE",
        "note": reason
    }
