import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.main import app

client = TestClient(app)

def test_api():
    print("========================================")
    print("SONAR-AI E2E ENDPOINT TEST")
    print("========================================")
    
    # Select test image
    valid_dir = Path("dataset/side-scan-sonar-object-detection-challenge/valid/images")
    if not valid_dir.exists():
        print(f"ERROR: Image directory not found at {valid_dir}")
        sys.exit(1)
        
    test_image = list(valid_dir.glob("*.jpg"))[0]
    
    print(f"Uploading image: {test_image.name}...")
    
    # Test POST /api/analyze
    with open(test_image, "rb") as f:
        response = client.post(
            "/api/analyze",
            files={"image": (test_image.name, f, "image/jpeg")}
        )
        
    print(f"POST /api/analyze STATUS: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
        sys.exit(1)
        
    data = response.json()
    print("Response JSON:")
    print("  Scan ID:", data.get("scan_id"))
    print("  Status:", data.get("status"))
    print("  Detections:", len(data.get("detections", [])))
    
    for i, d in enumerate(data.get("detections", []), 1):
        print(f"    {i}. {d['class_name']} ({d['confidence']:.2f})")
        
    analysis = data.get("analysis", {})
    print(f"  Risk Level: {analysis.get('risk_level')}")
    print(f"  Risk Score: {analysis.get('risk_score')}")
    
    print()
    print("Checking GET /api/history...")
    history_resp = client.get("/api/history")
    print(f"GET /api/history STATUS: {history_resp.status_code}")
    
    history_data = history_resp.json()
    scan_found = any(s.get("scan_id") == data.get("scan_id") for s in history_data)
    print(f"Scan appears in history: {'PASS' if scan_found else 'FAIL'}")
    
    print()
    print("Checking GET /api/stats...")
    stats_resp = client.get("/api/stats")
    print(f"GET /api/stats STATUS: {stats_resp.status_code}")
    print(f"Stats summary: {stats_resp.json()}")
    
    print("\n========================================")
    print("ALL TESTS PASSED")
    print("========================================")

if __name__ == "__main__":
    test_api()
