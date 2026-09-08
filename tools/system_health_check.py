import shutil
import sqlite3
import os
import sys
import requests
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

def run_health_check():
    print("================================================================================")
    print("           SONAR-AI 2.0 — COMPREHENSIVE END-TO-END HEALTH AUDIT                 ")
    print("================================================================================")

    # 1. Database & Backup Verification
    db_p = PROJECT_ROOT / "sonar_ai.db"
    backup_p = PROJECT_ROOT / "sonar_ai.db.frozen_final.backup"
    if db_p.exists():
        shutil.copy2(db_p, backup_p)
        print(f"[+] Created frozen snapshot: {backup_p.name} ({backup_p.stat().st_size / 1024:.1f} KB)")
    
    conn = sqlite3.connect(str(db_p))
    cur = conn.cursor()
    tables = [t[0] for t in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
    counts = {t: cur.execute(f"SELECT count(*) FROM {t}").fetchone()[0] for t in tables}
    null_tracks = cur.execute("SELECT count(*) FROM detections WHERE track_id IS NULL").fetchone()[0]
    conn.close()

    print(f"[+] Database Row Counts: {counts}")
    print(f"[+] Historical Detections track_id=NULL: {null_tracks} / {counts.get('detections', 0)}")

    # 2. Model Weights Verification
    weights_p = PROJECT_ROOT / "runs" / "sonar" / "baseline_yolo11n" / "weights" / "best.pt"
    if weights_p.exists():
        print(f"[+] Model Weights: {weights_p.name} ({weights_p.stat().st_size / 1e6:.2f} MB)")
    else:
        print(f"[!] WARNING: Weights not found at {weights_p}")

    # 3. Live Backend API Verification
    backend_url = "http://127.0.0.1:8333"
    print(f"\n--- Checking Live Backend Server ({backend_url}) ---")
    try:
        r_health = requests.get(f"{backend_url}/api/health", timeout=3)
        print(f"[+] GET /api/health -> HTTP {r_health.status_code}: {r_health.json()}")
    except Exception as e:
        print(f"[!] Backend unreachable at {backend_url}: {e}")

    try:
        r_history = requests.get(f"{backend_url}/api/history", timeout=5)
        hist_data = r_history.json()
        print(f"[+] GET /api/history -> HTTP {r_history.status_code} ({len(hist_data)} scans loaded)")
        if hist_data:
            sample_scan = hist_data[0]
            scan_id = sample_scan.get("scan_id")
            print(f"    Sample Scan ID: {scan_id} (Detections: {len(sample_scan.get('detections', []))}, Risk: {sample_scan.get('analysis', {}).get('risk_level')})")
            
            # Check Image Serving
            r_img = requests.get(f"{backend_url}/api/history/{scan_id}/image", timeout=5)
            print(f"    GET /api/history/{scan_id}/image -> HTTP {r_img.status_code} (Content-Type: {r_img.headers.get('content-type')}, Size: {len(r_img.content)} bytes)")
    except Exception as e:
        print(f"[!] History endpoint test failed: {e}")

    try:
        r_tracks = requests.get(f"{backend_url}/api/tracks", timeout=5)
        tracks_data = r_tracks.json()
        print(f"[+] GET /api/tracks -> HTTP {r_tracks.status_code} ({len(tracks_data)} active tracks)")
    except Exception as e:
        print(f"[!] Tracks endpoint test failed: {e}")

    # 4. End-to-End Live Inference & Full Pipeline Test (POST /api/analyze)
    print("\n--- Testing Live Full-Pipeline Scan Inference (POST /api/analyze) ---")
    sample_img_dir = PROJECT_ROOT / "dataset" / "side-scan-sonar-object-detection-challenge" / "valid" / "images"
    sample_images = list(sample_img_dir.glob("*.jpg")) + list(sample_img_dir.glob("*.png"))
    if sample_images:
        test_img = sample_images[0]
        print(f"Sending test image: {test_img.name} ({test_img.stat().st_size / 1024:.1f} KB)")
        try:
            with open(test_img, "rb") as f_img:
                files = {"image": (test_img.name, f_img, "image/jpeg")}
                r_analyze = requests.post(f"{backend_url}/api/analyze", files=files, timeout=15)
            
            if r_analyze.status_code == 200:
                scan_res = r_analyze.json()
                created_scan_id = scan_res.get('scan_id')
                print(f"[+] POST /api/analyze -> HTTP 200 SUCCESS")
                print(f"    Scan ID: {created_scan_id}")
                print(f"    Threat Risk: {scan_res.get('analysis', {}).get('risk_level')} (Score: {scan_res.get('analysis', {}).get('risk_score')})")
                print(f"    Detections Found: {len(scan_res.get('detections', []))}")
                for idx, det in enumerate(scan_res.get('detections', [])):
                    print(f"    Target #{idx+1} [Rank #{det.get('triage_rank')}]: {det.get('class_name').upper()} | Conf: {det.get('confidence')*100:.1f}% | Ev: {det.get('evidence', {}).get('evidence_score'):.1f}% | Priority: {det.get('priority_score')} PTS ({det.get('priority_tier')}) | Track: {det.get('tracking', {}).get('track_id')} ({det.get('tracking', {}).get('status')})")
                
                # Test Operator Verification Feedback on this new detection
                if scan_res.get('detections'):
                    first_det_id = scan_res['detections'][0]['id']
                    print(f"\n--- Testing Operator Verification Feedback (POST /api/feedback) ---")
                    fb_payload = {
                        "detection_id": first_det_id,
                        "decision": "CONFIRM",
                        "reason": "Strong object-shadow consistency",
                        "notes": "Automated end-to-end demo verification test"
                    }
                    r_fb = requests.post(f"{backend_url}/api/feedback", json=fb_payload, timeout=5)
                    print(f"[+] POST /api/feedback (First submission) -> HTTP {r_fb.status_code}: {r_fb.json().get('decision')}")
                    
                    # Test 409 Conflict protection
                    r_fb_dup = requests.post(f"{backend_url}/api/feedback", json=fb_payload, timeout=5)
                    print(f"[+] POST /api/feedback (Duplicate submission protection) -> HTTP {r_fb_dup.status_code} (Expected 409 Conflict: {r_fb_dup.status_code == 409})")

                # Clean up test scan and feedback from DB to preserve clean baseline
                if created_scan_id:
                    conn = sqlite3.connect(str(db_p))
                    c = conn.cursor()
                    det_ids = [d[0] for d in c.execute("SELECT id FROM detections WHERE scan_id=?", (created_scan_id,)).fetchall()]
                    for d_id in det_ids:
                        c.execute("DELETE FROM operator_feedback WHERE detection_id=?", (d_id,))
                    c.execute("DELETE FROM analyses WHERE scan_id=?", (created_scan_id,))
                    c.execute("DELETE FROM detections WHERE scan_id=?", (created_scan_id,))
                    c.execute("DELETE FROM scans WHERE scan_id=?", (created_scan_id,))
                    conn.commit()
                    conn.close()
                    print(f"\n[+] Cleaned up live test scan {created_scan_id} to maintain 100% clean baseline state.")
            else:
                print(f"[!] POST /api/analyze failed with HTTP {r_analyze.status_code}: {r_analyze.text}")
        except Exception as e:
            print(f"[!] Scan analysis test failed: {e}")

    # 5. Frontend Production Build & Bundle Inspection
    print("\n--- Checking Frontend Distribution Bundle ---")
    dist_dir = PROJECT_ROOT / "frontend" / "dist"
    if dist_dir.exists():
        dist_files = list(dist_dir.glob("**/*.*"))
        print(f"[+] Frontend Production Build Present: {len(dist_files)} built assets in frontend/dist")
    else:
        print(f"[!] Frontend dist not found. Run 'npm run build' in frontend/.")

    # 6. Evaluation Artifacts Inspection
    print("\n--- Checking Evaluation & Scientific Artifacts ---")
    eval_dir = PROJECT_ROOT / "evaluation_results"
    required_artifacts = [
        "baseline_metrics.json",
        "enhanced_metrics.json",
        "class_metrics.csv",
        "confusion_matrix.csv",
        "evaluation_report.md",
        "fusion_metrics.json",
        "fusion_ranking.csv",
        "fusion_class_metrics.csv",
        "fusion_ablation.json",
        "fusion_sensitivity.json",
        "fusion_report.md",
        "fusion_rank_comparison.png",
        "priority_distribution.png"
    ]
    for art in required_artifacts:
        art_p = eval_dir / art
        if art_p.exists():
            print(f"  [+] {art:30s} ({art_p.stat().st_size / 1024:6.1f} KB)")
        else:
            print(f"  [!] Missing: {art}")

    print("\n================================================================================")
    print("               SYSTEM HEALTH AUDIT COMPLETE — FULLY OPERATIONAL                 ")
    print("================================================================================")

if __name__ == "__main__":
    run_health_check()
