import sys
import unittest
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.uncertainty_service import evaluate_detection_uncertainty

class TestUncertaintyService(unittest.TestCase):

    def test_quadrant_1_high_conf_strong_evidence(self):
        """High confidence model detection with strong acoustic evidence yields LOW uncertainty."""
        ev_features = {
            "contrast_features": {"tbcr": 3.2, "intensity_delta": 45.0},
            "structural_features": {"gradient_energy": 42.0},
            "shadow_features": {"shadow_detected": True}
        }
        res = evaluate_detection_uncertainty(0.85, 82.0, "STRONG_EVIDENCE", ev_features)

        self.assertEqual(res["uncertainty_level"], "LOW")
        self.assertLess(res["uncertainty_score"], 40.0)
        self.assertEqual(res["operator_assessment"], "CONFIRMED TARGET")
        self.assertIn("CONFIRMED CONTACT", res["operator_recommendation"])
        self.assertTrue(any("Corroborating down-range acoustic shadow" in f for f in res["factors"]))

    def test_quadrant_2_high_conf_weak_evidence(self):
        """High model confidence but weak physical evidence yields HIGH uncertainty."""
        ev_features = {
            "contrast_features": {"tbcr": 0.8, "intensity_delta": 5.0},
            "structural_features": {"gradient_energy": 10.0},
            "shadow_features": {"shadow_detected": False}
        }
        res = evaluate_detection_uncertainty(0.78, 25.0, "WEAK_EVIDENCE", ev_features)

        self.assertEqual(res["uncertainty_level"], "HIGH")
        self.assertGreater(res["uncertainty_score"], 50.0)
        self.assertIn("ANALYST VERIFICATION REQUIRED", res["operator_recommendation"])
        self.assertTrue(any("Low object-to-seabed contrast" in f for f in res["factors"]))

    def test_quadrant_3_low_conf_strong_evidence(self):
        """Low model confidence but salient physical acoustic feature yields MODERATE uncertainty."""
        ev_features = {
            "contrast_features": {"tbcr": 3.0, "intensity_delta": 40.0},
            "structural_features": {"gradient_energy": 38.0},
            "shadow_features": {"shadow_detected": False}
        }
        res = evaluate_detection_uncertainty(0.38, 75.0, "STRONG_EVIDENCE", ev_features)

        self.assertEqual(res["uncertainty_level"], "MODERATE")
        self.assertTrue(any("Marginal YOLO classification confidence" in f for f in res["factors"]))

    def test_quadrant_4_low_conf_weak_evidence(self):
        """Low model confidence and weak physical evidence yields CRITICAL uncertainty (clutter)."""
        ev_features = {
            "contrast_features": {"tbcr": 0.5, "intensity_delta": 3.0},
            "structural_features": {"gradient_energy": 8.0},
            "shadow_features": {"shadow_detected": False}
        }
        res = evaluate_detection_uncertainty(0.32, 20.0, "WEAK_EVIDENCE", ev_features)

        self.assertEqual(res["uncertainty_level"], "CRITICAL")
        self.assertGreater(res["uncertainty_score"], 60.0)
        self.assertIn("PROBABLE SEABED CLUTTER", res["operator_recommendation"])

if __name__ == "__main__":
    unittest.main()
