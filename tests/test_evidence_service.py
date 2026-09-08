import sys
import unittest
from pathlib import Path
import numpy as np

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.evidence_service import analyze_acoustic_evidence

class TestEvidenceService(unittest.TestCase):

    def test_synthetic_strong_target_with_shadow(self):
        """Test strong highlight with clear acoustic shadow down-range."""
        img = np.full((200, 200), 70, dtype=np.uint8)
        # Add a bright textured target in [60:100, 60:100]
        for i in range(60, 100):
            for j in range(60, 100):
                img[i, j] = 190 + (i % 3) * 15
        # Add an acoustic shadow directly to the right (down-range) in [60:100, 100:140] with low intensity 12
        img[60:100, 100:140] = 12

        bbox = {"x1": 60, "y1": 60, "x2": 100, "y2": 100}
        res = analyze_acoustic_evidence(img, bbox, detection_id="DET-TEST-01")

        self.assertEqual(res["detection_id"], "DET-TEST-01")
        self.assertIn("object_features", res)
        self.assertIn("contrast_features", res)
        self.assertIn("shadow_features", res)
        self.assertTrue(res["shadow_features"]["shadow_detected"])
        self.assertEqual(res["shadow_features"]["shadow_status"], "DETECTED")
        self.assertEqual(res["shadow_features"]["shadow_sector"], "RIGHT")
        self.assertGreater(res["evidence_score"], 65.0)
        self.assertIn(res["evidence_status"], ["STRONG_EVIDENCE", "MODERATE_EVIDENCE"])

    def test_synthetic_flat_target_without_shadow(self):
        """Test a prominent target where no shadow is observed (not penalized)."""
        img = np.full((200, 200), 75, dtype=np.uint8)
        for i in range(60, 100):
            for j in range(60, 100):
                img[i, j] = 180 + (j % 2) * 20

        bbox = {"x1": 60, "y1": 60, "x2": 100, "y2": 100}
        res = analyze_acoustic_evidence(img, bbox, detection_id="DET-TEST-02")

        self.assertFalse(res["shadow_features"]["shadow_detected"])
        self.assertEqual(res["shadow_features"]["shadow_status"], "NOT_OBSERVED")
        self.assertIsNone(res["shadow_features"]["shadow_mean_intensity"])
        self.assertGreater(res["evidence_score"], 50.0)

    def test_synthetic_weak_clutter_target(self):
        """Test faint low-contrast anomaly resembling seabed speckle."""
        img = np.full((200, 200), 90, dtype=np.uint8)
        # Add tiny gradient difference
        img[50:80, 50:80] = 93

        bbox = {"x1": 50, "y1": 50, "x2": 80, "y2": 80}
        res = analyze_acoustic_evidence(img, bbox, detection_id="DET-TEST-03")

        self.assertLess(res["evidence_score"], 40.0)
        self.assertEqual(res["evidence_status"], "WEAK_EVIDENCE")

    def test_insufficient_dimensions(self):
        """Test bounding box smaller than 4 pixels."""
        img = np.full((100, 100), 100, dtype=np.uint8)
        bbox = {"x1": 10, "y1": 10, "x2": 12, "y2": 12}
        res = analyze_acoustic_evidence(img, bbox, detection_id="DET-TINY")

        self.assertEqual(res["evidence_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res["evidence_score"], 0.0)

    def test_missing_image_file(self):
        """Test missing image path returns graceful failure."""
        res = analyze_acoustic_evidence("non_existent_file_path.jpg", {"x1": 10, "y1": 10, "x2": 50, "y2": 50})
        self.assertEqual(res["evidence_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(res["evidence_score"], 0.0)

    def test_real_sonar_scan_file(self):
        """Test against an authentic sonar image from the dataset."""
        valid_dir = PROJECT_ROOT / "dataset" / "side-scan-sonar-object-detection-challenge" / "valid" / "images"
        if valid_dir.exists():
            images = list(valid_dir.glob("*.jpg"))
            if images:
                test_img = str(images[0])
                bbox = {"x1": 150.0, "y1": 120.0, "x2": 280.0, "y2": 240.0}
                res = analyze_acoustic_evidence(test_img, bbox, detection_id="DET-REAL")
                self.assertIn("evidence_score", res)
                self.assertTrue(0.0 <= res["evidence_score"] <= 100.0)
                self.assertIn(res["evidence_status"], ["STRONG_EVIDENCE", "MODERATE_EVIDENCE", "WEAK_EVIDENCE", "INSUFFICIENT_EVIDENCE"])

if __name__ == "__main__":
    unittest.main()
