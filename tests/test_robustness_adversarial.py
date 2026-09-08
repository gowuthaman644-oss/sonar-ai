import sys
import unittest
from pathlib import Path
import numpy as np
import cv2

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.evidence_service import analyze_acoustic_evidence
from backend.services.anomaly_service import detect_unknown_anomalies, triage_detection_contact
from backend.services.uncertainty_service import evaluate_detection_uncertainty

class TestRobustnessAdversarial(unittest.TestCase):
    """
    STEP 6: Adversarial & Robustness Validation Suite.
    Proves that SONAR-AI 2.0 degrades safely and NEVER manufactures certainty
    when assaulted with corrupt, ambiguous, degraded, or contradictory inputs.
    """

    def test_heavy_acoustic_speckle_noise(self):
        """Heavy multiplicative speckle noise degrades SNR and reduces evidence score."""
        # Clean target
        clean_img = np.full((200, 200), 70, dtype=np.uint8)
        for i in range(50, 90):
            for j in range(50, 90):
                clean_img[i, j] = 190 + (i % 3) * 20
        clean_img[50:90, 90:130] = 12

        bbox = {"x1": 50, "y1": 50, "x2": 90, "y2": 90}
        clean_res = analyze_acoustic_evidence(clean_img, bbox)

        # Corrupt with heavy acoustic speckle noise
        np.random.seed(42)
        noise = np.random.normal(1.0, 0.45, (200, 200))
        noisy_img = (clean_img.astype(np.float64) * noise).clip(0, 255).astype(np.uint8)
        noisy_res = analyze_acoustic_evidence(noisy_img, bbox)

        # High noise must degrade evidence score rather than manufacturing confidence
        self.assertLess(noisy_res["evidence_score"], clean_res["evidence_score"])
        self.assertGreater(noisy_res["background_features"]["bg_std_intensity"], clean_res["background_features"]["bg_std_intensity"])

    def test_extremely_dark_underexposed_image(self):
        """Severely underexposed image (near-zero acoustic return) safely degrades."""
        dark_img = np.full((200, 200), 8, dtype=np.uint8)
        dark_img[50:90, 50:90] = 12 # Tiny 4-value dynamic range

        bbox = {"x1": 50, "y1": 50, "x2": 90, "y2": 90}
        res = analyze_acoustic_evidence(dark_img, bbox)

        self.assertLess(res["evidence_score"], 40.0)
        self.assertIn(res["evidence_status"], ["WEAK_EVIDENCE", "MODERATE_EVIDENCE"])

    def test_overexposed_saturated_image(self):
        """Blown-out saturated acoustic return (flat white ceiling) flags lack of contrast."""
        sat_img = np.full((200, 200), 245, dtype=np.uint8)
        sat_img[50:90, 50:90] = 255 # Saturated

        bbox = {"x1": 50, "y1": 50, "x2": 90, "y2": 90}
        res = analyze_acoustic_evidence(sat_img, bbox)

        self.assertLess(res["evidence_score"], 45.0)

    def test_heavy_gaussian_blur(self):
        """Heavy acoustic reverberation / blurring degrades structural edge energy."""
        sharp_img = np.full((200, 200), 70, dtype=np.uint8)
        for i in range(50, 90):
            for j in range(50, 90):
                sharp_img[i, j] = 200 + (j % 3) * 15

        bbox = {"x1": 50, "y1": 50, "x2": 90, "y2": 90}
        sharp_res = analyze_acoustic_evidence(sharp_img, bbox)

        # Apply heavy blur
        blurred_img = cv2.GaussianBlur(sharp_img, (15, 15), 5.0)
        blurred_res = analyze_acoustic_evidence(blurred_img, bbox)

        # Gradient energy must drop significantly
        self.assertLess(
            blurred_res["structural_features"]["gradient_energy"],
            sharp_res["structural_features"]["gradient_energy"]
        )

    def test_boundary_clipped_bounding_box(self):
        """Bounding box partially clipped outside image borders is handled safely without crashing."""
        img = np.full((200, 200), 75, dtype=np.uint8)
        # Box extends beyond right and bottom edges [170 to 250] on a 200x200 canvas
        clipped_bbox = {"x1": 170, "y1": 170, "x2": 260, "y2": 260}

        res = analyze_acoustic_evidence(img, clipped_bbox)
        # Must execute cleanly without IndexError or crash
        self.assertIn("evidence_score", res)
        self.assertIn(res["evidence_status"], ["STRONG_EVIDENCE", "MODERATE_EVIDENCE", "WEAK_EVIDENCE", "INSUFFICIENT_EVIDENCE"])

    def test_microscopic_zero_area_bounding_box(self):
        """Zero or microscopic bounding box (< 4px) returns INSUFFICIENT_EVIDENCE."""
        img = np.full((100, 100), 80, dtype=np.uint8)
        micro_box = {"x1": 20, "y1": 20, "x2": 21, "y2": 22} # 1x2 pixels

        res = analyze_acoustic_evidence(img, micro_box)
        self.assertEqual(res["evidence_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res["evidence_score"], 0.0)

    def test_corrupted_image_payload(self):
        """Corrupted/unreadable file input gracefully returns fallback without crashing server."""
        res = analyze_acoustic_evidence("non_existent_corrupted_sonar.png", {"x1": 10, "y1": 10, "x2": 50, "y2": 50})
        self.assertEqual(res["evidence_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res["evidence_score"], 0.0)

        anom = detect_unknown_anomalies("non_existent_corrupted_sonar.png")
        self.assertEqual(anom["anomaly_status"], "NO_ANOMALY")
        self.assertEqual(anom["anomaly_score"], 0.0)

    def test_heavy_contradiction_high_yolo_zero_evidence(self):
        """Severe contradiction: YOLO reports 96% confidence on faint seabed speckle."""
        ev_features = {
            "contrast_features": {"tbcr": 0.4, "intensity_delta": 2.0},
            "structural_features": {"gradient_energy": 5.0},
            "shadow_features": {"shadow_detected": False}
        }
        # Model claims 96% confidence, but evidence is only 12%
        res = evaluate_detection_uncertainty(0.96, 12.0, "WEAK_EVIDENCE", ev_features)

        # System MUST flag HIGH uncertainty and alert the operator
        self.assertEqual(res["uncertainty_level"], "HIGH")
        self.assertGreater(res["uncertainty_score"], 50.0)
        self.assertEqual(res["operator_assessment"], "UNCONFIRMED CONTACT")
        self.assertIn("ANALYST VERIFICATION REQUIRED", res["operator_recommendation"])
        self.assertIn("POSSIBLE FALSE POSITIVE", res["operator_recommendation"])

    def test_multiple_overlapping_boxes_and_anomalies(self):
        """Multiple overlapping candidate targets masked correctly without collision."""
        np.random.seed(42)
        img = np.random.normal(70, 3, (300, 300)).clip(0, 255).astype(np.uint8)

        # 4 overlapping known boxes in one cluster
        known_dets = [
            {"bbox": {"x1": 50, "y1": 50, "x2": 100, "y2": 100}},
            {"bbox": {"x1": 70, "y1": 70, "x2": 120, "y2": 120}},
            {"bbox": {"x1": 80, "y1": 60, "x2": 110, "y2": 90}},
            {"bbox": {"x1": 55, "y1": 65, "x2": 95, "y2": 105}}
        ]

        # Add physical structure in another quadrant entirely [200:240, 200:240]
        for i in range(200, 240):
            for j in range(200, 240):
                img[i, j] = 210 + (i % 3) * 10

        anom = detect_unknown_anomalies(img, existing_detections=known_dets)

        # Known cluster must remain masked; independent unmasked structure is detected
        self.assertGreater(anom["anomaly_score"], 50.0)
        self.assertIn(anom["anomaly_status"], ["MODERATE_ANOMALY", "HIGH_ANOMALY"])
        # Verified region should be in [200:240], not in [50:120]
        top_region = anom["unexplained_regions"][0]
        self.assertGreaterEqual(top_region["x"], 180)
        self.assertGreaterEqual(top_region["y"], 180)

    def test_empty_scan_no_detections(self):
        """Completely empty scan with zero targets runs cleanly without exception."""
        img = np.full((200, 200), 75, dtype=np.uint8)
        anom = detect_unknown_anomalies(img, existing_detections=[])
        self.assertEqual(anom["anomaly_status"], "NO_ANOMALY")
        self.assertEqual(anom["anomaly_score"], 0.0)

if __name__ == "__main__":
    unittest.main()
