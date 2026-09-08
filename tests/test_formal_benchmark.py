import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from tests.run_comprehensive_benchmark import generate_benchmark_dataset, run_evaluation
from backend.services.evidence_service import analyze_acoustic_evidence
from backend.services.anomaly_service import detect_unknown_anomalies, triage_detection_contact
from backend.services.uncertainty_service import evaluate_detection_uncertainty

class TestFormalBenchmark(unittest.TestCase):
    """
    Formal Scientific Benchmark Test Suite for SONAR-AI 2.0.
    Asserts precision, recall, false-positive mitigation, and anomaly discovery rates.
    """

    def test_benchmark_metrics(self):
        dataset = generate_benchmark_dataset()
        self.assertEqual(len(dataset), 30)

        tp_targets = 0
        fp_targets = 0
        fn_targets = 0
        fp_caught = 0
        total_fp = 0
        tp_anomalies = 0
        total_anomalies = 0

        for item in dataset:
            img = item["image"]
            bbox = item["bbox"]

            if item["type"] in ["KNOWN_TARGET", "FALSE_POSITIVE_CLUTTER"]:
                ev = analyze_acoustic_evidence(img, bbox)
                tri = triage_detection_contact(item["class_name"], item["yolo_conf"], ev["evidence_score"], ev["evidence_status"])
                unc = evaluate_detection_uncertainty(item["yolo_conf"], ev["evidence_score"], ev["evidence_status"], ev, tri["contact_type"])
                assessment = unc["operator_assessment"]

                if item["ground_truth"] == "VALID_TARGET":
                    if assessment in ["CONFIRMED TARGET", "CONSISTENT TARGET"]:
                        tp_targets += 1
                    else:
                        fn_targets += 1
                elif item["ground_truth"] == "FALSE_POSITIVE_CLUTTER":
                    total_fp += 1
                    if assessment in ["UNCONFIRMED CONTACT", "POSSIBLE CLUTTER"]:
                        fp_caught += 1
                    else:
                        fp_targets += 1

            elif item["type"] == "UNKNOWN_ANOMALY":
                total_anomalies += 1
                anom = detect_unknown_anomalies(img, existing_detections=[])
                if anom["anomaly_status"] in ["MODERATE_ANOMALY", "HIGH_ANOMALY"] and len(anom["unexplained_regions"]) > 0:
                    tp_anomalies += 1

        precision = tp_targets / (tp_targets + fp_targets) if (tp_targets + fp_targets) > 0 else 0
        recall = tp_targets / (tp_targets + fn_targets) if (tp_targets + fn_targets) > 0 else 0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

        self.assertGreaterEqual(precision, 0.90)
        self.assertGreaterEqual(recall, 0.90)
        self.assertGreaterEqual(f1, 0.90)
        self.assertGreaterEqual(fp_caught / total_fp, 0.90)
        self.assertGreaterEqual(tp_anomalies / total_anomalies, 0.90)

if __name__ == "__main__":
    unittest.main()
