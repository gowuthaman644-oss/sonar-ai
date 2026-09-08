import cv2
import numpy as np
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.evidence_service import analyze_acoustic_evidence
from backend.services.uncertainty_service import evaluate_detection_uncertainty

def run_curve():
    valid_dir = Path('dataset/side-scan-sonar-object-detection-challenge/valid/images')
    test_files = list(valid_dir.glob('*.jpg'))
    if not test_files:
        print("No test files found.")
        return
    
    base_img = cv2.imread(str(test_files[0]), cv2.IMREAD_GRAYSCALE)
    bbox = {'x1': 148, 'y1': 100, 'x2': 212, 'y2': 160}

    base_ev = analyze_acoustic_evidence(base_img, bbox)
    base_unc = evaluate_detection_uncertainty(0.702, base_ev['evidence_score'], base_ev['evidence_status'], base_ev)
    print("=== SENSITIVITY CURVE BENCHMARK ===")
    print(f"Clean Baseline: Ev = {base_ev['evidence_score']:.1f}% [{base_ev['evidence_status']}], Unc = {base_unc['uncertainty_score']:.1f} [{base_unc['uncertainty_level']}], Assessment = {base_unc['operator_assessment']}")

    print("\n--- 1. SENSOR DEFOCUS & REVERBERATION (BLUR) DEGRADATION ---")
    for sigma in [0.0, 1.5, 3.0, 6.0, 10.0, 16.0]:
        if sigma == 0.0:
            deg_img = base_img.copy()
        else:
            k = int(sigma * 3) | 1
            deg_img = cv2.GaussianBlur(base_img, (k, k), sigma)

        ev = analyze_acoustic_evidence(deg_img, bbox)
        unc = evaluate_detection_uncertainty(0.702, ev['evidence_score'], ev['evidence_status'], ev)
        print(f"Blur sigma={sigma:4.1f}: Ev={ev['evidence_score']:5.1f}% [{ev['evidence_status']:18s}] | Unc={unc['uncertainty_score']:4.1f} [{unc['uncertainty_level']:8s}] | EdgeEnergy={ev['structural_features']['gradient_energy']:5.1f} | Assessment={unc['operator_assessment']}")

    print("\n--- 2. DYNAMIC CONTRAST ATTENUATION DEGRADATION ---")
    for contrast_factor in [1.0, 0.7, 0.5, 0.3, 0.15, 0.05]:
        mean_val = np.mean(base_img)
        att_img = (mean_val + (base_img.astype(np.float64) - mean_val) * contrast_factor).clip(0, 255).astype(np.uint8)

        ev = analyze_acoustic_evidence(att_img, bbox)
        unc = evaluate_detection_uncertainty(0.702, ev['evidence_score'], ev['evidence_status'], ev)
        print(f"Contrast x{contrast_factor:4.2f}: Ev={ev['evidence_score']:5.1f}% [{ev['evidence_status']:18s}] | Unc={unc['uncertainty_score']:4.1f} [{unc['uncertainty_level']:8s}] | TBCR={ev['contrast_features']['tbcr']:5.3f} | Assessment={unc['operator_assessment']}")

    print("\n--- 3. MULTIPLICATIVE SPECKLE NOISE REGIMES ---")
    for noise_pct in [1.5, 5.0, 15.0, 30.0, 50.0]:
        noise_sigma = noise_pct / 100.0
        np.random.seed(42)
        noise = np.random.normal(1.0, noise_sigma, base_img.shape)
        noisy_img = (base_img.astype(np.float64) * noise).clip(0, 255).astype(np.uint8)

        ev = analyze_acoustic_evidence(noisy_img, bbox)
        unc = evaluate_detection_uncertainty(0.702, ev['evidence_score'], ev['evidence_status'], ev)
        print(f"+{noise_pct:4.1f}% Noise: Ev={ev['evidence_score']:5.1f}% [{ev['evidence_status']:18s}] | Unc={unc['uncertainty_score']:4.1f} [{unc['uncertainty_level']:8s}] | BG_Std={ev['background_features']['bg_std_intensity']:5.2f}")

if __name__ == "__main__":
    run_curve()
