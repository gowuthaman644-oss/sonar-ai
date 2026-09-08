# 🌊 SONAR-AI 2.0: Evidence-Driven Maritime Intelligence Platform

**SONAR-AI 2.0** is an operational underwater intelligence system for side-scan sonar analysis. It pairs a **YOLO11n** neural vision detector with downstream physics-based **Acoustic Evidence Consistency**, **Uncertainty Quantification**, **HEURISTIC V2 Risk Assessment**, **Persistent Contact Tracking**, **Human-in-the-Loop Verification**, and **Operational Evidence Fusion**.

---

## 🏗️ Multi-Layer Intelligence Architecture

```
                                  SONAR IMAGE (Raw Side-Scan Sonar)
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │  LAYER 1: YOLO11n Neural Perception Backbone     │
                         │  Object Localization, Confidence, Class Bounding │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │  LAYER 2: Acoustic Evidence Consistency Engine   │
                         │  Physics Analysis: SNR, Shadow Contrast, TBCR    │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │  LAYER 3: Uncertainty Quantification Engine      │
                         │  Neural/Acoustic Discrepancy & Boundary Margins  │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │  LAYER 4: HEURISTIC V2 Risk Assessment Engine    │
                         │  Class Hazard, Spatial Clustering, Seabed Anom.  │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │  LAYER 5: Temporal Contact Associator & Tracking │
                         │  Image-Plane Track Persistence (NEW/ACTIVE/REC)  │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │  LAYER 6: Evidence Fusion & Operational Triage   │
                         │  Deterministic Prioritization Queue (S_ops)      │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      ▼                                                       ▼
     ┌───────────────────────────────────┐               ┌───────────────────────────────────┐
     │  LAYER 7: Human-in-the-Loop Store │               │  LAYER 8: Maritime Command Center │
     │  CONFIRM / REJECT / UNCERTAIN     │               │  Prioritized Queue, Map, Reports  │
     │  Audit Trail (409 Conflict Safe)  │               │  Glassmorphism UI (React + Vite)  │
     └───────────────────────────────────┘               └───────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **OS**: Windows / Linux / macOS
- **Python**: Python 3.11+ (with PyTorch and Ultralytics)
- **Node.js**: Node 18+ (with npm)

### 1. Start the Backend API (FastAPI)
```powershell
# Activate Python Virtualenv
.\.venv-yolo\Scripts\Activate.ps1

# Launch FastAPI on port 8333
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8333
```
*API docs available at `http://127.0.0.1:8333/docs`*

### 2. Start the Frontend Command Center (React + Vite)
```powershell
# Open a new terminal in frontend directory
cd frontend
npm install
npm run dev
```
*Frontend interface available at `http://localhost:5173`*

---

## 🖥️ Live Demonstration Walkthrough

Follow this step-by-step user journey during presentations or live demos:

1. **Dashboard (`/`)**:
   - Live telemetry status, threat level breakdowns, database health, and quick actions.
2. **New Scan (`/scan`)**:
   - Upload any raw side-scan sonar image from `dataset/side-scan-sonar-object-detection-challenge/valid/images/`.
   - Click **EXECUTE SCAN ANALYSIS**.
3. **Detection Results (`/results`)**:
   - **Tactical Acquisition Feed**: Bounding boxes rendered in real-time with priority tier borders (Crimson for Immediate Action, Amber for Review Required, Teal for Deferred).
   - **Operator Decision Matrix**: 5-layer telemetry readout synthesizing YOLO confidence, acoustic evidence, uncertainty level, anomaly presence, and risk score.
   - **Prioritized Action Queue**: Detections ranked deterministically by operational priority score ($S_{\text{ops}}$) with transparent multi-signal breakdown chips (`YOLO`, `EVIDENCE`, `HAZARD`, `TRACK`, `DELTA`).
   - **Persistent Contact Card**: Displays track persistence (`NEW`, `ACTIVE`, `RECURRENT`), historical observation counts, and confidence/evidence trajectories.
   - **Operator Verification Panel**: Click `[CONFIRM]`, `[REJECT]`, or `[UNCERTAIN]` to record immutable human audit entries.
4. **Mission History Archive (`/history`)**:
   - Search, filter by threat level, and inspect historical scans.
   - Switch to the **Persistent Tracks** tab to view multi-scan target associations.
5. **Tactical SonarMap (`/map`)**:
   - Interactive 2D operational map displaying geolocated survey points, threat clusters, and persistent track breadcrumbs.
6. **Intelligence Reports (`/reports`)**:
   - Select any scan to inspect comprehensive threat assessments, download raw CSV data, or trigger formatted PDF printing.

---

## 🔬 Scientific Evaluation & Benchmarks

The project includes an **Experimental Evaluation Lab** evaluating the pipeline across 110 authentic validation sonar scans (172 ground-truth instances, 158 operational predictions):

### Core Findings
- **Detector Invariance**: Baseline YOLO11n weights (`best.pt`) remain 100% unmodified ($\Delta\text{mAP} = 0.0\%$, achieving **44.2% mAP@50** at operational `conf=0.25` and **52.1% mAP@50** at academic `conf=0.001`).
- **Orthogonal Acoustic Signal**: Neural confidence and acoustic evidence consistency exhibit near-zero linear correlation ($r = 0.0689$), proving acoustic evidence is an independent physical validation signal.
- **Critical Target Elevation**: Evidence Fusion elevates high-consequence mission targets (`mine`, `drowning victim`) by **+41.6 queue positions** on average (from rank #75.9 down to #34.3).
- **Top-10 Queue Capture**: Evidence Fusion captures **12.0%** of all critical ground-truth targets in the first 10 inspections compared to only **4.0%** for baseline confidence ranking (**3.0x improvement**).
- **Monotonic Precision Gradient**: Precision scales cleanly with assigned priority tier (**83.3% Immediate Action $\to$ 67.0% Review Required $\to$ 37.8% Deferred Inspection**).

### Running the Evaluation Lab
```powershell
# Run Baseline Detector Evaluation
python tools/evaluation/run_baseline.py

# Run Enhanced Multi-Layer Pipeline Evaluation
python tools/evaluation/run_enhanced.py

# Run Comparative Analysis & Generate Reports
python tools/evaluation/compare_experiments.py

# Run Evidence Fusion Prioritization Benchmark
python tools/evaluation/run_fusion_evaluation.py
```
*Generated artifacts and research figures are stored in `evaluation_results/`.*

---

## 🔒 Project Integrity & Backup Safety

- **Database Backups**:
  - `sonar_ai.db.frozen_final.backup`: Frozen baseline snapshot (`119 scans`, `302 detections`, `114 analyses`, `0 tracks`, `0 feedback`).
- **Trained Model Weights**:
  - `runs/sonar/baseline_yolo11n/weights/best.pt`: Canonical trained YOLO11n model weights.
- **Automated Verification**:
  ```powershell
  # Run full backend test suite (95 tests)
  python -m unittest discover -s tests

  # Run artifact audit
  python tools/audit_phase8.py
  ```

---

## 📁 Repository Structure

```
sonar-ai/
├── backend/                  # FastAPI Application & Intelligence Services
│   ├── api/                  # Route handlers (/analyze, /history, /feedback, /stats)
│   ├── database/             # SQLAlchemy SQLite models & migrations
│   ├── schemas/              # Pydantic request/response schemas
│   └── services/             # Core Intelligence Algorithms
│       ├── ai_service.py          # YOLO11n inference engine
│       ├── evidence_service.py    # Acoustic SNR, contrast, shadow analyzer
│       ├── uncertainty_service.py # Neural/evidence uncertainty quantifier
│       ├── risk_service.py        # HEURISTIC V2 risk calculator
│       ├── tracking_service.py    # Temporal contact associator
│       └── fusion_service.py      # Operational decision intelligence
├── frontend/                 # React 19 + Vite Command Center
│   ├── src/
│   │   ├── components/       # SonarDetectionViewer, GlassPanel, Navigation
│   │   ├── pages/            # Dashboard, NewScan, Results, History, SonarMap, Reports
│   │   └── services/         # Axios API client
├── evaluation_results/       # Machine-readable benchmarks, CSVs, and plots
├── runs/                     # YOLO11n trained weights (best.pt)
├── tests/                    # 95 automated unit and regression tests
├── tools/                    # Evaluation, audit, and health-check scripts
├── sonar_ai.db               # Active production SQLite database
└── README.md                 # Master platform documentation
```
