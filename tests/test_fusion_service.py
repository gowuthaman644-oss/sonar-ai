import sys
import unittest
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.fusion_service import (
    calculate_operational_score,
    generate_triage_rationale,
    fuse_detection_intelligence,
    CLASS_HAZARD_WEIGHTS,
    TRACKING_STATUS_BONUSES
)

class TestFusionService(unittest.TestCase):
    """
    Comprehensive unit tests for Phase 8 Evidence Fusion & Decision Intelligence service.
    Verifies mathematical bounds, class hazard multipliers, tracking bonuses, discrepancy penalties,
    deterministic tie-breaking, failure isolation, and production DB immutability.
    """

    def test_01_score_bounded_0_to_100(self):
        """Assert operational decision score is strictly bounded in [0, 100]."""
        test_cases = [
            (0.0, 0.0, "wreck", "NEW"),
            (1.0, 100.0, "mine", "RECURRENT"),
            (0.5, 50.0, "airplane", "ACTIVE"),
            (0.95, 95.0, "drowning victim", "RECURRENT"),
            (0.1, 10.0, "wreck", "NEW"),
            (0.0, 100.0, "mine", "NEW"),
            (1.0, 0.0, "wreck", "NEW")
        ]
        for conf, ev, cls_name, trk in test_cases:
            s_ops, tier, delta, p_unc, reason = calculate_operational_score(conf, ev, cls_name, trk)
            self.assertGreaterEqual(s_ops, 0.0, f"Score underflow: {s_ops}")
            self.assertLessEqual(s_ops, 100.0, f"Score overflow: {s_ops}")
            self.assertIn(tier, ["IMMEDIATE_ACTION", "REVIEW_REQUIRED", "DEFERRED_INSPECTION"])

    def test_02_deterministic_output(self):
        """Assert identical inputs produce identical scores and rationales."""
        res1 = calculate_operational_score(0.85, 80.0, "mine", "RECURRENT")
        res2 = calculate_operational_score(0.85, 80.0, "mine", "RECURRENT")
        self.assertEqual(res1, res2)

    def test_03_class_hazard_weights(self):
        """Assert class hazard multipliers are correctly applied."""
        self.assertEqual(CLASS_HAZARD_WEIGHTS["mine"], 1.15)
        self.assertEqual(CLASS_HAZARD_WEIGHTS["drowning victim"], 1.10)
        self.assertEqual(CLASS_HAZARD_WEIGHTS["airplane"], 0.90)
        self.assertEqual(CLASS_HAZARD_WEIGHTS["wreck"], 0.75)

        # Equal confidence and evidence (80%) on different classes:
        # Base = 0.45*80 + 0.45*80 = 72.0
        # Mine (1.15): 72 * 1.15 = 82.8
        # Wreck (0.75): 72 * 0.75 = 54.0
        s_mine, tier_m, _, _, _ = calculate_operational_score(0.80, 80.0, "mine", "NEW")
        s_wreck, tier_w, _, _, _ = calculate_operational_score(0.80, 80.0, "wreck", "NEW")
        self.assertEqual(s_mine, 82.8)
        self.assertEqual(tier_m, "IMMEDIATE_ACTION")
        self.assertEqual(s_wreck, 54.0)
        self.assertEqual(tier_w, "REVIEW_REQUIRED")
        self.assertGreater(s_mine, s_wreck)

    def test_04_tracking_bonuses(self):
        """Assert persistent tracking bonuses are added correctly."""
        # Base on airplane (conf=0.70, ev=70): Base = 63.0. Airplane (0.90) = 56.7
        s_new, _, _, _, _ = calculate_operational_score(0.70, 70.0, "airplane", "NEW")
        s_active, _, _, _, _ = calculate_operational_score(0.70, 70.0, "airplane", "ACTIVE")
        s_recurrent, _, _, _, _ = calculate_operational_score(0.70, 70.0, "airplane", "RECURRENT")

        self.assertEqual(s_new, 56.7)
        self.assertEqual(s_active, 56.7 + 4.0)      # 60.7
        self.assertEqual(s_recurrent, 56.7 + 8.0)   # 64.7

    def test_05_discrepancy_penalty_and_review_trigger(self):
        """Assert severe discrepancy (delta >= 50) triggers penalty and REVIEW_REQUIRED."""
        # High neural conf (95%), low evidence (20%) -> delta = 75.0
        # Base = 0.45*95 + 0.45*20 = 42.75 + 9.0 = 51.75
        # Mine (1.15): 51.75 * 1.15 = 59.5125
        # Penalty P_unc = 10.0 -> Score = 49.5
        s_ops, tier, delta, p_unc, reason = calculate_operational_score(0.95, 20.0, "mine", "NEW")
        self.assertEqual(delta, 75.0)
        self.assertEqual(p_unc, 10.0)
        self.assertEqual(s_ops, 49.5)
        self.assertEqual(tier, "REVIEW_REQUIRED")
        self.assertIn("discrepancy", reason.lower())

    def test_06_priority_tiers(self):
        """Assert priority tier boundaries are respected."""
        # Score >= 70.0 -> IMMEDIATE_ACTION
        s_imm, tier_imm, _, _, _ = calculate_operational_score(0.90, 90.0, "mine", "NEW")
        self.assertGreaterEqual(s_imm, 70.0)
        self.assertEqual(tier_imm, "IMMEDIATE_ACTION")

        # Score in [45, 69.9] -> REVIEW_REQUIRED
        s_rev, tier_rev, _, _, _ = calculate_operational_score(0.60, 60.0, "airplane", "NEW")
        self.assertTrue(45.0 <= s_rev < 70.0)
        self.assertEqual(tier_rev, "REVIEW_REQUIRED")

        # Score < 45.0 -> DEFERRED_INSPECTION
        s_def, tier_def, _, _, _ = calculate_operational_score(0.30, 30.0, "wreck", "NEW")
        self.assertLess(s_def, 45.0)
        self.assertEqual(tier_def, "DEFERRED_INSPECTION")

    def test_07_deterministic_ranking_and_tie_breaking(self):
        """Assert multi-detection scans are sorted with deterministic sequential ranks."""
        dets = [
            {"id": 1, "class_name": "wreck", "confidence": 0.80, "evidence": {"evidence_score": 75.0}},
            {"id": 2, "class_name": "mine", "confidence": 0.85, "evidence": {"evidence_score": 85.0}},
            {"id": 3, "class_name": "drowning victim", "confidence": 0.70, "evidence": {"evidence_score": 70.0}},
            {"id": 4, "class_name": "airplane", "confidence": 0.50, "evidence": {"evidence_score": 40.0}}
        ]

        fused = fuse_detection_intelligence(dets, scan_risk={"risk_level": "HIGH"})
        self.assertEqual(len(fused), 4)

        # Check ranks are sequential 1, 2, 3, 4
        ranks = [d["triage_rank"] for d in fused]
        self.assertEqual(ranks, [1, 2, 3, 4])

        # Mine should be Rank #1 due to hazard weight 1.15 and high score
        self.assertEqual(fused[0]["class_name"], "mine")
        self.assertEqual(fused[0]["triage_rank"], 1)
        self.assertEqual(fused[0]["priority_tier"], "IMMEDIATE_ACTION")

        # Verify scores are sorted descending
        scores = [d["priority_score"] for d in fused]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_08_empty_and_null_safe_handling(self):
        """Assert empty and missing fields are handled safely."""
        self.assertEqual(fuse_detection_intelligence([]), [])

        # Detection with missing evidence and tracking dicts
        sparse_det = [{"id": 10, "class_name": "unknown_target", "confidence": 0.55}]
        fused = fuse_detection_intelligence(sparse_det)
        self.assertEqual(len(fused), 1)
        self.assertEqual(fused[0]["triage_rank"], 1)
        self.assertIsNotNone(fused[0]["priority_score"])

    def test_09_failure_isolation(self):
        """Assert if an error occurs during fusion, original detections are returned safely."""
        # Non-iterable object or invalid format should not crash
        res = fuse_detection_intelligence(None)
        self.assertEqual(res, [])

    def test_10_production_database_immutability(self):
        """Assert production database row counts remain 100% unchanged."""
        db_path = str(PROJECT_ROOT / "sonar_ai.db")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        cur.execute("SELECT count(*) FROM scans")
        scans = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM detections")
        dets = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM analyses")
        analyses = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM contact_tracks")
        tracks = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM operator_feedback")
        fb = cur.fetchone()[0]

        conn.close()

        self.assertEqual(scans, 119)
        self.assertEqual(dets, 302)
        self.assertEqual(analyses, 114)
        self.assertEqual(tracks, 0)
        self.assertEqual(fb, 0)

if __name__ == "__main__":
    unittest.main()
