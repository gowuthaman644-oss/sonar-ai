import sys
import unittest
import json
import csv
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from tools.evaluation.run_baseline import CLASS_NAMES, run_baseline_evaluation
from tools.evaluation.run_enhanced import run_enhanced_evaluation
from tools.evaluation.compare_experiments import generate_comparison_and_reports

class TestEvaluationLab(unittest.TestCase):
    """
    Automated test suite for Phase 7 Experimental Evaluation Lab.
    Verifies reproducibility, metric schema integrity, empty-state safety, and DB immutability.
    """

    @classmethod
    def setUpClass(cls):
        cls.db_path = str(PROJECT_ROOT / "sonar_ai.db")
        cls.eval_results_dir = str(PROJECT_ROOT / "evaluation_results")

    def test_01_canonical_class_mapping(self):
        """Assert class mapping strictly adheres to the 4 canonical classes."""
        self.assertEqual(CLASS_NAMES[0], "airplane")
        self.assertEqual(CLASS_NAMES[1], "mine")
        self.assertEqual(CLASS_NAMES[2], "drowning victim")
        self.assertEqual(CLASS_NAMES[3], "wreck")
        self.assertEqual(len(CLASS_NAMES), 4)

    def test_02_production_database_invariance_before_and_after(self):
        """Assert production database row counts remain completely unaltered."""
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        # Capture counts
        cur.execute("SELECT count(*) FROM scans")
        scans_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM detections")
        dets_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM analyses")
        analyses_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM contact_tracks")
        tracks_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM operator_feedback")
        fb_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM detections WHERE track_id IS NOT NULL")
        dets_with_track = cur.fetchone()[0]

        conn.close()

        self.assertEqual(scans_count, 119)
        self.assertEqual(dets_count, 302)
        self.assertEqual(analyses_count, 114)
        self.assertEqual(tracks_count, 0)
        self.assertEqual(fb_count, 0)
        self.assertEqual(dets_with_track, 0)

    def test_03_baseline_and_enhanced_evaluation_execution(self):
        """Assert baseline and enhanced evaluation tools produce valid metrics."""
        # Run baseline
        base_res = run_baseline_evaluation(output_dir=self.eval_results_dir)
        self.assertIn("overall_metrics", base_res)
        self.assertIn("precision", base_res["overall_metrics"])
        self.assertIn("recall", base_res["overall_metrics"])
        self.assertIn("map50", base_res["overall_metrics"])
        self.assertIn("map50_95", base_res["overall_metrics"])
        self.assertEqual(base_res["image_count"], 110)
        self.assertEqual(base_res["total_ground_truth_instances"], 172)

        # Run enhanced
        enh_res = run_enhanced_evaluation(output_dir=self.eval_results_dir)
        self.assertIn("evidence_metrics", enh_res)
        self.assertIn("uncertainty_metrics", enh_res)
        self.assertIn("contact_triage_metrics", enh_res)
        self.assertIn("risk_assessment_metrics", enh_res)
        self.assertEqual(enh_res["dataset_images_evaluated"], 110)
        self.assertGreater(enh_res["total_ai_detections"], 0)

        # Run comparison & reports
        comp_res = generate_comparison_and_reports(output_dir=self.eval_results_dir, db_path=self.db_path)
        self.assertIn("detection_performance_comparison", comp_res)
        self.assertIn("operational_intelligence_evaluation", comp_res)

    def test_04_evaluation_artifacts_exist_and_valid(self):
        """Assert all expected files exist in evaluation_results with valid format."""
        out_p = Path(self.eval_results_dir)
        
        expected_files = [
            "baseline_metrics.json",
            "enhanced_metrics.json",
            "comparison.json",
            "class_metrics.csv",
            "confusion_matrix.csv",
            "human_feedback_analysis.json",
            "tracking_analysis.json",
            "evaluation_report.md"
        ]

        for fname in expected_files:
            fp = out_p / fname
            self.assertTrue(fp.exists(), f"Missing required evaluation artifact: {fname}")
            self.assertGreater(fp.stat().st_size, 0, f"Artifact is empty: {fname}")

        # Check human feedback analysis handled empty state honestly
        with open(out_p / "human_feedback_analysis.json", "r") as f:
            fb_data = json.load(f)
            self.assertEqual(fb_data["status"], "NO_OBSERVATIONS")
            self.assertEqual(fb_data["total_feedback_records"], 0)

        # Check tracking analysis handled empty state honestly
        with open(out_p / "tracking_analysis.json", "r") as f:
            trk_data = json.load(f)
            self.assertEqual(trk_data["status"], "NO_OBSERVATIONS")
            self.assertEqual(trk_data["total_persistent_tracks"], 0)
            self.assertIn("image-plane", trk_data["spatial_telemetry_limitation"])

    def test_05_recheck_production_db_remains_unchanged(self):
        """Assert production database remains strictly untouched after full evaluation run."""
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        cur.execute("SELECT count(*) FROM scans")
        self.assertEqual(cur.fetchone()[0], 119)
        cur.execute("SELECT count(*) FROM detections")
        self.assertEqual(cur.fetchone()[0], 302)
        cur.execute("SELECT count(*) FROM analyses")
        self.assertEqual(cur.fetchone()[0], 114)
        cur.execute("SELECT count(*) FROM contact_tracks")
        self.assertEqual(cur.fetchone()[0], 0)
        cur.execute("SELECT count(*) FROM operator_feedback")
        self.assertEqual(cur.fetchone()[0], 0)

        conn.close()

if __name__ == "__main__":
    unittest.main()
