# SONAR-AI

SONAR-AI is an automated pipeline for analyzing sonar images, running object detection (YOLO), anomaly detection, and providing risk scores with human-readable explanations. 

Built during a 48-hour hackathon.

## Architecture

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **AI Pipeline:** Python orchestration for YOLO & Anomaly Detection models
- **Database:** SQLite

## Setup Instructions

### Backend & AI Pipeline
1. `cd backend`
2. `python -m venv venv`
3. Activate venv (`source venv/bin/activate` or `venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. Run the server: `uvicorn main:app --reload`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
