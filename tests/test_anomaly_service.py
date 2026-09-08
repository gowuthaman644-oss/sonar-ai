import sys
import unittest
from pathlib import Path
import numpy as np

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.anomaly_service import detect_unknown_anomalies, triage_detection_contact

class TestAnomalyService(unittest.TestCase):

    def test_normal_uniform_seabed(self):
        """A uniform seabed image with minimal variation produces NO_ANOMALY."""
        np.random.seed(42)
        img = np.random.normal(80, 4, (200, 200)).clip(0, 255).astype(np.uint8)
        res = detect_unknown_anomalies(img)

        self.assertEqual(res["anomaly_status"], "NO_ANOMALY")
        self.assertEqual(res["anomaly_type"], "NORMAL_SEABED")
        self.assertLess(res["anomaly_score"], 20.0)

    def test_known_target_masked_out(self):
        """A strong highlight that is inside a known YOLO bounding box is masked out."""
        np.random.seed(42)
        img = np.random.normal(70, 3, (200, 200)).clip(0, 255).astype(np.uint8)
        # Add highlight at [50:90, 50:90]
        img[50:90, 50:90] = 220

        # Provide this box as a known YOLO detection
        known_dets = [{
            "class_name": "wreck",
            "confidence": 0.85,
            "bbox": {"x1": 50, "y1": 50, "x2": 90, "y2": 90}
        }]

        res = detect_unknown_anomalies(img, existing_detections=known_dets)

        # Because the highlight is masked out as known, the remaining seabed should have no high anomaly
        self.assertEqual(res["anomaly_status"], "NO_ANOMALY")
        self.assertEqual(res["anomaly_type"], "NORMAL_SEABED")

    def test_unexplained_acoustic_structure(self):
        """A strong highlight with edges OUTSIDE any known detection triggers an anomaly."""
        np.random.seed(42)
        img = np.random.normal(65, 3, (250, 250)).clip(0, 255).astype(np.uint8)
        # Add an unexplained physical anomaly at [150:190, 150:190]
        for i in range(150, 190):
            for j in range(150, 190):
                img[i, j] = 210 + (i % 3) * 10

        res = detect_unknown_anomalies(img, existing_detections=[])

        self.assertGreater(res["anomaly_score"], 60.0)
        self.assertIn(res["anomaly_status"], ["MODERATE_ANOMALY", "HIGH_ANOMALY"])
        self.assertGreater(len(res["unexplained_regions"]), 0)
        self.assertIn("contrast", res["features"])
        self.assertIn("edge_energy", res["features"])

    def test_triage_known_target(self):
        """High evidence contact triaged as KNOWN_TARGET."""
        res = triage_detection_contact("mine", 0.72, 85.0, "STRONG_EVIDENCE")
        self.assertEqual(res["contact_type"], "KNOWN_TARGET")
        self.assertEqual(res["assessment"], "VERIFIED_ACOUSTIC_TARGET")

    def test_triage_possible_clutter(self):
        """Low evidence contact triaged as LOW_EVIDENCE_CONTACT / POSSIBLE_ACOUSTIC_CLUTTER."""
        res = triage_detection_contact("mine", 0.55, 28.0, "WEAK_EVIDENCE")
        self.assertEqual(res["contact_type"], "LOW_EVIDENCE_CONTACT")
        self.assertEqual(res["assessment"], "POSSIBLE_ACOUSTIC_CLUTTER")
        self.assertIn("Possible acoustic clutter", res["clarification"])

if __name__ == "__main__":
    unittest.main()
