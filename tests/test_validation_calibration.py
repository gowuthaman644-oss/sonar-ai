import sys
import unittest
from pathlib import Path
import numpy as np

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.evidence_service import analyze_acoustic_evidence
from backend.services.anomaly_service import detect_unknown_anomalies, triage_detection_contact
from backend.services.uncertainty_service import evaluate_detection_uncertainty

class TestValidationCalibration(unittest.TestCase):
    """
    STEP 5: Intelligence Validation & Calibration Suite.
    Verifies that the multi-layer pipeline behaves correctly across 5 deliberate operational scenarios:
    Case A: Strong known target
    Case B: YOLO false positive / low evidence
    Case C: Unknown object (unexplained seabed structure outside YOLO)
    Case D: Normal nominal seabed
    Case E: Low-profile target (no shadow, but clear geometric structure)
    """

    def test_case_a_strong_known_target(self):
        """Case A: Strong known target (High model conf, High acoustic evidence, No anomaly)."""
        # Create seabed with bright textured target and clear down-range shadow
        img = np.full((200, 200), 70, dtype=np.uint8)
        for i in range(50, 90):
            for j in range(50, 90):
                img[i, j] = 190 + (i % 3) * 20
        img[50:90, 90:130] = 12  # Shadow

        bbox = {"x1": 50, "y1": 50, "x2": 90, "y2": 90}
        
        # 1. Evidence Engine
        ev = analyze_acoustic_evidence(img, bbox, detection_id="DET-CASE-A")
        self.assertGreaterEqual(ev["evidence_score"], 70.0)
        self.assertEqual(ev["evidence_status"], "STRONG_EVIDENCE")
        self.assertTrue(ev["shadow_features"]["shadow_detected"])

        # 2. Contact Triage
        triage = triage_detection_contact("airplane", 0.88, ev["evidence_score"], ev["evidence_status"])
        self.assertEqual(triage["contact_type"], "KNOWN_TARGET")
        self.assertEqual(triage["assessment"], "VERIFIED_ACOUSTIC_TARGET")

        # 3. Uncertainty Layer
        unc = evaluate_detection_uncertainty(0.88, ev["evidence_score"], ev["evidence_status"], ev, triage["contact_type"])
        self.assertEqual(unc["uncertainty_level"], "LOW")
        self.assertEqual(unc["operator_assessment"], "CONFIRMED TARGET")
        self.assertIn("CONFIRMED CONTACT", unc["operator_recommendation"])

        # 4. Anomaly Engine (Masked)
        anom = detect_unknown_anomalies(img, existing_detections=[{"bbox": bbox}])
        self.assertEqual(anom["anomaly_status"], "NO_ANOMALY")

    def test_case_b_yolo_false_positive(self):
        """Case B: YOLO false positive (High model conf, but weak physical evidence)."""
        # Faint speckle on seabed
        img = np.full((200, 200), 85, dtype=np.uint8)
        img[60:90, 60:90] = 88 # Barely distinguishable 3-intensity difference

        bbox = {"x1": 60, "y1": 60, "x2": 90, "y2": 90}
        
        ev = analyze_acoustic_evidence(img, bbox, detection_id="DET-CASE-B")
        self.assertLess(ev["evidence_score"], 40.0)
        self.assertEqual(ev["evidence_status"], "WEAK_EVIDENCE")

        triage = triage_detection_contact("mine", 0.78, ev["evidence_score"], ev["evidence_status"])
        self.assertEqual(triage["contact_type"], "LOW_EVIDENCE_CONTACT")
        self.assertEqual(triage["assessment"], "POSSIBLE_ACOUSTIC_CLUTTER")

        # Uncertainty must flag HIGH due to inter-layer discrepancy (high model conf vs weak evidence)
        unc = evaluate_detection_uncertainty(0.78, ev["evidence_score"], ev["evidence_status"], ev, triage["contact_type"])
        self.assertEqual(unc["uncertainty_level"], "HIGH")
        self.assertEqual(unc["operator_assessment"], "UNCONFIRMED CONTACT")
        self.assertIn("ANALYST VERIFICATION REQUIRED", unc["operator_recommendation"])

    def test_case_c_unknown_object(self):
        """Case C: Unknown object (No YOLO detections, high unexplained seabed anomaly)."""
        np.random.seed(42)
        img = np.random.normal(70, 3, (250, 250)).clip(0, 255).astype(np.uint8)
        # Add high-contrast unexplained structure at [140:180, 140:180]
        for i in range(140, 180):
            for j in range(140, 180):
                img[i, j] = 215 + (j % 3) * 10

        # No YOLO detections reported
        anom = detect_unknown_anomalies(img, existing_detections=[])
        self.assertGreaterEqual(anom["anomaly_score"], 60.0)
        self.assertIn(anom["anomaly_status"], ["MODERATE_ANOMALY", "HIGH_ANOMALY"])
        self.assertGreater(len(anom["unexplained_regions"]), 0)

    def test_case_d_normal_nominal_seabed(self):
        """Case D: Normal nominal seabed (No detections, nominal acoustic returns)."""
        np.random.seed(42)
        img = np.random.normal(75, 4, (200, 200)).clip(0, 255).astype(np.uint8)
        anom = detect_unknown_anomalies(img, existing_detections=[])
        
        self.assertEqual(anom["anomaly_status"], "NO_ANOMALY")
        self.assertEqual(anom["anomaly_type"], "NORMAL_SEABED")
        self.assertLess(anom["anomaly_score"], 20.0)

    def test_case_e_low_profile_target(self):
        """Case E: Low-profile target (Moderate conf, shadow NOT_OBSERVED, but structural edges present)."""
        img = np.full((200, 200), 75, dtype=np.uint8)
        for i in range(60, 100):
            for j in range(60, 100):
                img[i, j] = 185 + (j % 3) * 15

        bbox = {"x1": 60, "y1": 60, "x2": 100, "y2": 100}
        ev = analyze_acoustic_evidence(img, bbox, detection_id="DET-CASE-E")

        # Shadow must be marked NOT_OBSERVED without penalizing flat object
        self.assertFalse(ev["shadow_features"]["shadow_detected"])
        self.assertEqual(ev["shadow_features"]["shadow_status"], "NOT_OBSERVED")
        self.assertGreaterEqual(ev["evidence_score"], 60.0)

        # Contact and uncertainty evaluation
        triage = triage_detection_contact("wreck", 0.65, ev["evidence_score"], ev["evidence_status"])
        self.assertEqual(triage["contact_type"], "KNOWN_TARGET")
        
        unc = evaluate_detection_uncertainty(0.65, ev["evidence_score"], ev["evidence_status"], ev, triage["contact_type"])
        self.assertIn(unc["uncertainty_level"], ["LOW", "MODERATE"])
        self.assertIn(unc["operator_assessment"], ["CONFIRMED TARGET", "CONSISTENT TARGET"])

if __name__ == "__main__":
    unittest.main()
