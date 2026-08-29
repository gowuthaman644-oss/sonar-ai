# 🌊 SONAR-AI: Underwater Intelligence Command Center

**SONAR-AI** is a high-performance, automated pipeline for analyzing raw side-scan sonar imagery. Built during a 48-hour hackathon, this system leverages a YOLO11n computer vision backbone, accelerated by CUDA, to detect underwater objects (wrecks, mines, airplanes, and victims). 

Detections are automatically passed through an intelligence layer to assess risk severity, persisted in a local database, and surfaced in real-time through a cinematic, glassmorphism-styled React Command Center interface.

![Sonar-AI Command Center](frontend/public/vite.svg) <!-- Replace with an actual screenshot of the dashboard -->

---

## 🏗️ Architecture

SONAR-AI enforces a strict separation of concerns across three intelligence layers:

1. **Perception Layer (AI):** YOLO11n trained natively on a side-scan sonar dataset. (CUDA / PyTorch)
2. **Intelligence Layer (Backend):** FastAPI handles routing, coordinates bounding-box calculations, evaluates application-level Risk Scores, and persists telemetry in SQLite.
3. **Operations Layer (Frontend):** React + Vite Command Center with Tailwind CSS v4, delivering a responsive, cinematic maritime intelligence UI without sacrificing performance.

---

## 🚀 Quick Start

### 1. The AI Environment (`.venv-yolo`)
SONAR-AI utilizes a strictly isolated Python 3.11 environment to ensure PyTorch and CUDA 12.6 run flawlessly on NVIDIA RTX hardware.

```powershell
# Create and activate the AI environment
py -3.11 -m venv .venv-yolo
.\.venv-yolo\Scripts\Activate.ps1

# Install PyTorch (CUDA 12.6) and Ultralytics
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
pip install -U ultralytics
```

### 2. The Backend Server (FastAPI)
The FastAPI server orchestrates the YOLO inference and handles SQLite connections.

```powershell
# Open a new terminal
.\.venv-yolo\Scripts\Activate.ps1
uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. The Frontend Command Center (React 19 / Vite)
The UI is styled using Tailwind CSS v4 and Lucide-React icons.

```powershell
# Open a new terminal
cd frontend
npm install
npm run dev
```
*The Command Center will be available at `http://localhost:5173` (or `5174`).*

---

## 🧠 AI Pipeline Details
- **Base Model:** YOLO11n (`ultralytics`)
- **Classes Detected:** `0: airplane`, `1: mine`, `2: drowning victim`, `3: wreck`
- **Inference Engine:** Natively utilizes CUDA 0 (`torch.cuda.is_available()`) for real-time bounding box generation.
- **Risk Assessment Engine:** Analyzes the AI's pure detection confidence and cross-references it with the object class to output an operational **Risk Level** (LOW/MEDIUM/HIGH) and a quantifiable **Risk Score** (0-100).

---

## 📸 Hackathon Demo Flow
1. **Command Center:** Real-time telemetry, database status, and scan history.
2. **New Scan:** Upload a `.jpg` from the side-scan sonar validation dataset.
3. **Inference:** YOLO11n processes the image via FastAPI.
4. **Results:** The image is rendered with dynamic CSS-percentage bounding boxes. The AI Confidence and Application Risk Score are explicitly separated for analytical clarity.
5. **Persistence:** The intelligence report is permanently archived in the SQLite database and surfaced in the History ledger.
