# SONAR-AI API Contract

## Base URL

Development:

http://localhost:8000

---

# 1. Analyze Sonar Image

## Endpoint

POST /api/analyze

## Purpose

Upload a Side-Scan Sonar image and analyze it using the AI pipeline.

## Request

Content-Type:

multipart/form-data

Field:

image

Example:

image = sonar_image.png

---

## Response

```json
{
  "scan_id": "SCAN-001",

  "image": {
    "original": "/outputs/original.png",
    "processed": "/outputs/detected.png",
    "heatmap": "/outputs/heatmap.png"
  },

  "detections": [
    {
      "class_name": "object",
      "confidence": 0.92,
      "bbox": [100, 120, 300, 400]
    }
  ],

  "anomaly": {
    "score": 87
  },

  "risk": {
    "score": 89,
    "level": "CRITICAL"
  },

  "explanation": [
    "Unusual sonar pattern detected",
    "High anomaly score"
  ],

  "location": {
    "latitude": 0,
    "longitude": 0,
    "depth_m": 0
  },

  "created_at": "2026-08-29T10:00:00"
}
```

---

# 2. Get Scan History

## Endpoint

GET /api/history

## Purpose

Return previous sonar scans.

## Response

```json
[
  {
    "scan_id": "SCAN-001",
    "risk_score": 89,
    "risk_level": "CRITICAL",
    "created_at": "2026-08-29T10:00:00"
  }
]
```

---

# 3. Get Dashboard Statistics

## Endpoint

GET /api/stats

## Purpose

Return statistics for the dashboard.

## Response

```json
{
  "total_scans": 100,
  "total_detections": 42,
  "total_anomalies": 17,
  "critical_alerts": 6
}
```

---

# 4. Get Individual Scan

## Endpoint

GET /api/scans/{scan_id}

## Purpose

Return complete information about one scan.

Example:

GET /api/scans/SCAN-001

---

# Error Response

All API errors should follow:

```json
{
  "error": true,
  "message": "Description of the error",
  "code": "ERROR_CODE"
}
```

> **Important**
>
> Those numbers like `89`, `87`, `42` are only examples for the API contract. They are NOT real AI results. Later the AI will generate the actual values.
