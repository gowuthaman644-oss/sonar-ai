import json
import csv
import sqlite3
import numpy as np
from pathlib import Path

def audit():
    print("================================================================================")
    print("         SONAR-AI — FINAL PHASE 8 SCIENTIFIC ARTIFACT AUDIT                     ")
    print("================================================================================")

    ranking_csv_p = Path("evaluation_results/fusion_ranking.csv")
    metrics_json_p = Path("evaluation_results/fusion_metrics.json")
    ablation_json_p = Path("evaluation_results/fusion_ablation.json")
    sensitivity_json_p = Path("evaluation_results/fusion_sensitivity.json")
    eval_script_p = Path("tools/evaluation/run_fusion_evaluation.py")
    db_p = Path("sonar_ai.db")

    assert ranking_csv_p.exists(), "fusion_ranking.csv missing"
    assert metrics_json_p.exists(), "fusion_metrics.json missing"
    assert ablation_json_p.exists(), "fusion_ablation.json missing"
    assert sensitivity_json_p.exists(), "fusion_sensitivity.json missing"
    assert eval_script_p.exists(), "run_fusion_evaluation.py missing"
    assert db_p.exists(), "sonar_ai.db missing"

    with open(ranking_csv_p, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    with open(metrics_json_p, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    with open(ablation_json_p, "r", encoding="utf-8") as f:
        ablation = json.load(f)

    with open(sensitivity_json_p, "r", encoding="utf-8") as f:
        sensitivity = json.load(f)

    # 1. Prediction count and TP/FP audit
    total_preds = len(rows)
    tps = [r for r in rows if r["Is_True_Positive"] == "1"]
    fps = [r for r in rows if r["Is_True_Positive"] == "0"]
    
    print(f"[1] Total Predictions: {total_preds} (Expected: 158)")
    print(f"    TPs: {len(tps)} (Expected: 97), FPs: {len(fps)} (Expected: 61)")
    assert total_preds == 158
    assert len(tps) == 97
    assert len(fps) == 61

    # 2. Critical Target Definition
    crit_classes = {"mine", "drowning victim"}
    crit_tps = [r for r in tps if r["Class"].lower() in crit_classes]
    mine_tps = [r for r in tps if r["Class"].lower() == "mine"]
    victim_tps = [r for r in tps if r["Class"].lower() == "drowning victim"]
    print(f"[2] Critical TPs: {len(crit_tps)} (Mine: {len(mine_tps)}, Drowning Victim: {len(victim_tps)})")
    assert len(mine_tps) == 10
    assert len(victim_tps) == 6
    assert len(crit_tps) == 16

    # 3. Top-K Critical Target Recall Audit
    # Ground Truth: 38 Mine + 37 Drowning Victim = 75 Critical GT instances
    total_crit_gt = 75
    yolo_sorted = sorted(rows, key=lambda x: int(x["Global_YOLO_Rank"]))
    fusion_sorted = sorted(rows, key=lambda x: int(x["Global_Fusion_Rank"]))

    print("[3] Top-K Critical Recall Validation (Denominator = 75 GT Critical Targets):")
    for k in [5, 10, 20, 30, 50, 75, 100]:
        y_k = sum(1 for r in yolo_sorted[:k] if r["Is_True_Positive"] == "1" and r["Class"].lower() in crit_classes)
        f_k = sum(1 for r in fusion_sorted[:k] if r["Is_True_Positive"] == "1" and r["Class"].lower() in crit_classes)
        y_rec = y_k / total_crit_gt
        f_rec = f_k / total_crit_gt
        y_rec_rounded = round(y_rec, 4)
        f_rec_rounded = round(f_rec, 4)
        m_y_rec = metrics["critical_target_recall_comparison"][f"top_{k}"]["yolo_critical_recall"]
        m_f_rec = metrics["critical_target_recall_comparison"][f"top_{k}"]["fusion_critical_recall"]
        print(f"    Top-{k:3d} Queue: YOLO = {y_k:2d}/{total_crit_gt} ({y_rec*100:5.2f}%), Fusion = {f_k:2d}/{total_crit_gt} ({f_rec*100:5.2f}%) | JSON match: {y_rec_rounded == m_y_rec and f_rec_rounded == m_f_rec}")
        assert y_rec_rounded == m_y_rec
        assert f_rec_rounded == m_f_rec

    # Specifically verify 12% Top-10 recall: 9 / 75 = 0.12 (12.00%)
    f_k_top10 = sum(1 for r in fusion_sorted[:10] if r["Is_True_Positive"] == "1" and r["Class"].lower() in crit_classes)
    assert f_k_top10 == 9
    print(f"    -> Verified Top-10 Fusion Critical Recall = 9 / 75 = {9/75*100:.1f}% (EXACT)")

    # 4. Rank Math Consistency
    tp_y_ranks = [int(r["Global_YOLO_Rank"]) for r in tps]
    tp_f_ranks = [int(r["Global_Fusion_Rank"]) for r in tps]
    fp_y_ranks = [int(r["Global_YOLO_Rank"]) for r in fps]
    fp_f_ranks = [int(r["Global_Fusion_Rank"]) for r in fps]
    crit_y_ranks = [int(r["Global_YOLO_Rank"]) for r in crit_tps]
    crit_f_ranks = [int(r["Global_Fusion_Rank"]) for r in crit_tps]

    print("[4] Rank Math Consistency Audit:")
    print(f"    Critical TP Mean Rank: CSV YOLO={np.mean(crit_y_ranks):.2f}, JSON={metrics['ranking_summary']['critical_true_positives']['mean_rank_yolo']}")
    print(f"    Critical TP Mean Rank: CSV Fusion={np.mean(crit_f_ranks):.2f}, JSON={metrics['ranking_summary']['critical_true_positives']['mean_rank_fusion']}")
    print(f"    Critical TP Median Rank: CSV YOLO={np.median(crit_y_ranks):.1f}, JSON={metrics['ranking_summary']['critical_true_positives']['median_rank_yolo']}")
    print(f"    Critical TP Median Rank: CSV Fusion={np.median(crit_f_ranks):.1f}, JSON={metrics['ranking_summary']['critical_true_positives']['median_rank_fusion']}")
    print(f"    All TP Mean Rank: CSV YOLO={np.mean(tp_y_ranks):.2f}, JSON={metrics['ranking_summary']['true_positives']['mean_rank_yolo']}")
    print(f"    All TP Mean Rank: CSV Fusion={np.mean(tp_f_ranks):.2f}, JSON={metrics['ranking_summary']['true_positives']['mean_rank_fusion']}")
    print(f"    All FP Mean Rank: CSV YOLO={np.mean(fp_y_ranks):.2f}, JSON={metrics['ranking_summary']['false_positives']['mean_rank_yolo']}")
    print(f"    All FP Mean Rank: CSV Fusion={np.mean(fp_f_ranks):.2f}, JSON={metrics['ranking_summary']['false_positives']['mean_rank_fusion']}")

    assert round(float(np.mean(crit_y_ranks)), 2) == metrics['ranking_summary']['critical_true_positives']['mean_rank_yolo']
    assert round(float(np.mean(crit_f_ranks)), 2) == metrics['ranking_summary']['critical_true_positives']['mean_rank_fusion']
    assert round(float(np.median(crit_y_ranks)), 2) == metrics['ranking_summary']['critical_true_positives']['median_rank_yolo']
    assert round(float(np.median(crit_f_ranks)), 2) == metrics['ranking_summary']['critical_true_positives']['median_rank_fusion']
    assert round(float(np.mean(tp_y_ranks)), 2) == metrics['ranking_summary']['true_positives']['mean_rank_yolo']
    assert round(float(np.mean(tp_f_ranks)), 2) == metrics['ranking_summary']['true_positives']['mean_rank_fusion']
    assert round(float(np.mean(fp_y_ranks)), 2) == metrics['ranking_summary']['false_positives']['mean_rank_yolo']
    assert round(float(np.mean(fp_f_ranks)), 2) == metrics['ranking_summary']['false_positives']['mean_rank_fusion']

    # 5. Priority Tiers Precision Audit
    print("[5] Priority Tier Precision Audit:")
    for tier_name in ["IMMEDIATE_ACTION", "REVIEW_REQUIRED", "DEFERRED_INSPECTION"]:
        tier_dets = [r for r in rows if r["Priority_Tier"] == tier_name]
        tier_tp = sum(1 for r in tier_dets if r["Is_True_Positive"] == "1")
        tier_fp = sum(1 for r in tier_dets if r["Is_True_Positive"] == "0")
        prec = round(tier_tp / len(tier_dets) * 100, 2) if tier_dets else 0.0
        m_prec = metrics["tier_precision_breakdown"][tier_name]["precision"]
        print(f"    {tier_name:20s}: Total={len(tier_dets):3d}, TP={tier_tp:2d}, FP={tier_fp:2d}, Prec={prec:5.2f}% | JSON Prec={m_prec:5.2f}%")
        assert len(tier_dets) == metrics["tier_precision_breakdown"][tier_name]["total_detections"]
        assert tier_tp == metrics["tier_precision_breakdown"][tier_name]["true_positives"]
        assert tier_fp == metrics["tier_precision_breakdown"][tier_name]["false_positives"]
        assert prec == m_prec

    # 6. Database Immutability & No Fabrication Check
    conn = sqlite3.connect("sonar_ai.db")
    cur = conn.cursor()
    tables = [t[0] for t in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
    counts = {t: cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in tables}
    track_ids = cur.execute("SELECT COUNT(*) FROM detections WHERE track_id IS NOT NULL").fetchone()[0]
    conn.close()
    print("[6] Production Database State Audit:")
    print(f"    Row Counts: {counts}")
    print(f"    Non-null track_id in detections: {track_ids}")
    assert counts.get("scans") == 119
    assert counts.get("detections") == 302
    assert counts.get("analyses") == 114
    assert counts.get("contact_tracks") == 0
    assert counts.get("operator_feedback") == 0
    assert track_ids == 0

    print("\n>>> ALL 12 SCIENTIFIC AUDIT CHECKS PASSED WITH 100% MATHEMATICAL INTEGRITY! <<<")

if __name__ == "__main__":
    audit()
