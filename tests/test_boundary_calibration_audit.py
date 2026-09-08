import sys
import unittest
from pathlib import Path
import numpy as np
import cv2

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.uncertainty_service import evaluate_detection_uncertainty
from backend.services.evidence_service import analyze_acoustic_evidence
from backend.services.anomaly_service import triage_detection_contact

class TestBoundaryCalibrationAudit(unittest.TestCase):
    """
    STEP 7: Decision Boundary & Calibration Audit Suite.
    Audits the behavior of the multi-layer intelligence engine:
    1. Epsilon-neighborhood behavior immediately across all decision boundaries (T - eps, T, T + eps).
    2. Boundary proximity and margin status flagging (detecting borderline decisions).
    3. Monte Carlo stochastic sensitivity analysis under realistic sensor fluctuations.
    """

    def test_boundary_1_confirmed_vs_consistent_target(self):
        """
        Boundary 1 Audit: Conf = 60.0%, Evidence = 70.0%.
        Audits transition between CONFIRMED TARGET and CONSISTENT TARGET across +/- 0.1% epsilon.
        """
        eps = 0.1

        # A: Confidence boundary at Evidence = 70.0%
        res_below = evaluate_detection_uncertainty(0.60 - (eps/100.0), 70.0, "STRONG_EVIDENCE") # 59.9%
        res_exact = evaluate_detection_uncertainty(0.60, 70.0, "STRONG_EVIDENCE")                # 60.0%
        res_above = evaluate_detection_uncertainty(0.60 + (eps/100.0), 70.0, "STRONG_EVIDENCE") # 60.1%

        self.assertEqual(res_below["operator_assessment"], "CONSISTENT TARGET")
        self.assertEqual(res_below["boundary_audit"]["margin_status"], "CRITICAL_MARGIN")
        self.assertTrue(res_below["boundary_audit"]["near_decision_boundary"])

        self.assertEqual(res_exact["operator_assessment"], "CONFIRMED TARGET")
        self.assertEqual(res_above["operator_assessment"], "CONFIRMED TARGET")

        # B: Evidence boundary at Confidence = 70.0%
        res_ev_below = evaluate_detection_uncertainty(0.70, 70.0 - eps, "MODERATE_EVIDENCE") # 69.9%
        res_ev_exact = evaluate_detection_uncertainty(0.70, 70.0, "STRONG_EVIDENCE")          # 70.0%
        res_ev_above = evaluate_detection_uncertainty(0.70, 70.0 + eps, "STRONG_EVIDENCE")    # 70.1%

        self.assertEqual(res_ev_below["operator_assessment"], "CONSISTENT TARGET")
        self.assertEqual(res_ev_below["boundary_audit"]["margin_status"], "CRITICAL_MARGIN")

        self.assertEqual(res_ev_exact["operator_assessment"], "CONFIRMED TARGET")
        self.assertEqual(res_ev_above["operator_assessment"], "CONFIRMED TARGET")

    def test_boundary_2_consistent_vs_unconfirmed_contact(self):
        """
        Boundary 2 Audit: Conf = 55.0%, Evidence = 40.0%.
        Audits transition between CONSISTENT TARGET and UNCONFIRMED CONTACT (possible false positive).
        """
        eps = 0.1

        # Evidence boundary at Conf = 65.0%
        res_below = evaluate_detection_uncertainty(0.65, 40.0 - eps, "WEAK_EVIDENCE") # 39.9%
        res_exact = evaluate_detection_uncertainty(0.65, 40.0, "MODERATE_EVIDENCE")   # 40.0%
        res_above = evaluate_detection_uncertainty(0.65, 40.0 + eps, "MODERATE_EVIDENCE") # 40.1%

        self.assertEqual(res_below["operator_assessment"], "UNCONFIRMED CONTACT")
        self.assertIn("ANALYST VERIFICATION REQUIRED", res_below["operator_recommendation"])

        self.assertEqual(res_exact["operator_assessment"], "CONSISTENT TARGET")
        self.assertEqual(res_above["operator_assessment"], "CONSISTENT TARGET")

    def test_boundary_3_unclassified_acoustic_target(self):
        """
        Boundary 3 Audit: Conf = 50.0%, Evidence = 60.0%.
        Low neural confidence (< 50%) but strong acoustic returns yields UNCLASSIFIED TARGET.
        """
        eps = 0.1
        res_below = evaluate_detection_uncertainty(0.50 - (eps/100.0), 65.0, "STRONG_EVIDENCE") # 49.9%
        res_above = evaluate_detection_uncertainty(0.50 + (eps/100.0), 65.0, "STRONG_EVIDENCE") # 50.1%

        self.assertEqual(res_below["operator_assessment"], "UNCLASSIFIED TARGET")
        self.assertIn("SECONDARY FREQUENCY INSPECTION", res_below["operator_recommendation"])

        self.assertEqual(res_above["operator_assessment"], "PROVISIONAL CONTACT")

    def test_boundary_proximity_stable_zone(self):
        """Deep interior points far from boundaries must report STABLE margin status."""
        res_stable = evaluate_detection_uncertainty(0.85, 85.0, "STRONG_EVIDENCE")
        self.assertEqual(res_stable["boundary_audit"]["margin_status"], "STABLE")
        self.assertFalse(res_stable["boundary_audit"]["near_decision_boundary"])
        self.assertGreater(res_stable["boundary_audit"]["min_distance_to_boundary"], 5.0)

    def test_monte_carlo_sensor_perturbation_stability(self):
        """
        Monte Carlo Sensitivity Analysis:
        Applies 50 stochastic micro-perturbations (speckle, contrast, brightness)
        to a real sonar scan target to measure empirical variance and decision stability.
        """
        valid_dir = Path("dataset/side-scan-sonar-object-detection-challenge/valid/images")
        test_files = list(valid_dir.glob("*.jpg"))
        if not test_files:
            self.skipTest("Validation sonar images not available.")

        base_img = cv2.imread(str(test_files[0]), cv2.IMREAD_GRAYSCALE)
        bbox = {"x1": 148, "y1": 100, "x2": 212, "y2": 160}

        # Baseline run
        base_ev = analyze_acoustic_evidence(base_img, bbox)
        base_tri = triage_detection_contact("airplane", 0.702, base_ev["evidence_score"], base_ev["evidence_status"])
        base_unc = evaluate_detection_uncertainty(0.702, base_ev["evidence_score"], base_ev["evidence_status"], base_ev, base_tri["contact_type"])
        base_decision = base_unc["operator_assessment"]

        ev_scores = []
        unc_scores = []
        decisions = []

        np.random.seed(42)
        for _ in range(50):
            # Stochastic sensor noise: 1.5% multiplicative speckle
            noise = np.random.normal(1.0, 0.015, base_img.shape)
            # Stochastic gain drift: +/- 2 intensity offset
            bright = np.random.uniform(-2, 2)
            # Stochastic contrast perturbation: +/- 1.5%
            contrast = np.random.uniform(0.985, 1.015)

            p_img = (base_img.astype(np.float64) - 128) * contrast + 128 + bright
            p_img = (p_img * noise).clip(0, 255).astype(np.uint8)

            p_ev = analyze_acoustic_evidence(p_img, bbox)
            p_tri = triage_detection_contact("airplane", 0.702, p_ev["evidence_score"], p_ev["evidence_status"])
            p_unc = evaluate_detection_uncertainty(0.702, p_ev["evidence_score"], p_ev["evidence_status"], p_ev, p_tri["contact_type"])

            ev_scores.append(p_ev["evidence_score"])
            unc_scores.append(p_unc["uncertainty_score"])
            decisions.append(p_unc["operator_assessment"])

        ev_scores = np.array(ev_scores)
        unc_scores = np.array(unc_scores)

        # 1. Standard deviations under realistic micro-fluctuations must be small (< 1.5)
        self.assertLess(ev_scores.std(), 1.5)
        self.assertLess(unc_scores.std(), 1.5)

        # 2. Decision stability must be >= 95%
        stability_rate = sum(1 for d in decisions if d == base_decision) / len(decisions) * 100.0
        self.assertGreaterEqual(stability_rate, 95.0)

if __name__ == "__main__":
    unittest.main()
