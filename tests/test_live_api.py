import urllib.request
import json
from pathlib import Path

def test_live_api():
    valid_dir = Path('dataset/side-scan-sonar-object-detection-challenge/valid/images')
    test_files = list(valid_dir.glob('*.jpg'))
    if not test_files:
        print("No validation files found.")
        return

    test_file = test_files[0]
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    data = []
    data.append(f'--{boundary}'.encode())
    data.append(f'Content-Disposition: form-data; name="image"; filename="{test_file.name}"'.encode())
    data.append(b'Content-Type: image/jpeg')
    data.append(b'')
    data.append(test_file.read_bytes())
    data.append(f'--{boundary}--'.encode())
    data.append(b'')
    body = b'\r\n'.join(data)

    req = urllib.request.Request('http://127.0.0.1:8333/api/analyze', data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

    with urllib.request.urlopen(req) as res:
        res_data = json.loads(res.read().decode())

    print('=== API /api/analyze LIVE VERIFICATION ===')
    print('Scan ID:', res_data['scan_id'])
    print('Status:', res_data['status'])
    print('Detections Count:', len(res_data['detections']))
    for i, d in enumerate(res_data['detections']):
        print(f" Contact {i+1}: {d['class_name']} (Conf: {d['confidence']*100:.1f}%)")
        print(f"   Evidence: {d['evidence']['evidence_score']}% [{d['evidence']['evidence_status']}]")
        print(f"   Contact Triage: {d['contact_type']} ({d['assessment']})")
        print(f"   Uncertainty: {d['uncertainty']['uncertainty_level']} (Score: {d['uncertainty']['uncertainty_score']})")
        print(f"   Recommendation: {d['uncertainty']['operator_recommendation']}")
        print(f"   Factors: {d['uncertainty']['factors']}")

    print('Risk Engine Result:', res_data['analysis']['risk_score'], res_data['analysis']['risk_level'])
    print('Anomaly Engine Score:', res_data['analysis']['anomaly_score'])
    print('Anomaly Status:', res_data['analysis']['anomaly_details']['anomaly_status'])
    print('Anomaly Type:', res_data['analysis']['anomaly_details']['anomaly_type'])

    # Test Image Retrieval Endpoint
    img_url = f"http://127.0.0.1:8333/api/history/{res_data['scan_id']}/image"
    with urllib.request.urlopen(img_url) as img_res:
        img_bytes = img_res.read()
    print('Image Endpoint verification: OK (Bytes received:', len(img_bytes), ')')

if __name__ == "__main__":
    test_live_api()
