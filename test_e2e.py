
import requests
import json
import time

url = 'http://127.0.0.1:8001/api/analyze'
files = {'image': ('test.jpg', open('dataset/side-scan-sonar-object-detection-challenge/valid/images/000008_jpg.rf.9fcda58b0c5acab328c191a8bd4ebd7d.jpg', 'rb'), 'image/jpeg')}

print('Sending request to FastAPI...')
response = requests.post(url, files=files)
print(f'Status Code: {response.status_code}')

try:
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print('Failed to parse JSON:', e)
    print(response.text)

print('\nTesting History endpoint...')
history_resp = requests.get('http://127.0.0.1:8001/api/history')
print(f'History Status Code: {history_resp.status_code}')
try:
    data = history_resp.json()
    print(f'Retrieved {len(data)} items in history.')
    if len(data) > 0:
        print('First item detections count:', len(data[0].get('detections', [])))
except Exception as e:
    print('Failed to parse history:', e)
