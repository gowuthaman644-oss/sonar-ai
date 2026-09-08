import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from tools.evaluation.run_baseline import run_baseline_evaluation
from tools.evaluation.run_enhanced import run_enhanced_evaluation
from tools.evaluation.compare_experiments import generate_comparison_and_reports

def run_evaluation_lab():
    print("================================================================================")
    print("           SONAR-AI 2.0 — EXPERIMENTAL EVALUATION LAB (PHASE 7)                 ")
    print("================================================================================")
    
    # 1. Run Baseline YOLO11n Evaluation
    print("\n>>> STEP 1: Executing Baseline YOLO11n Detector Evaluation...")
    base_res = run_baseline_evaluation()

    # 2. Run Enhanced Multi-Layer Pipeline Evaluation
    print("\n>>> STEP 2: Executing Enhanced Multi-Layer Pipeline Evaluation...")
    enh_res = run_enhanced_evaluation()

    # 3. Generate Comparative Analysis and Scientific Report
    print("\n>>> STEP 3: Generating Comparative Analysis, Tables, and Report...")
    comp_res = generate_comparison_and_reports()

    print("\n================================================================================")
    print("                       EVALUATION COMPLETE — PASS                               ")
    print("================================================================================")
    return base_res, enh_res, comp_res

if __name__ == "__main__":
    run_evaluation_lab()
