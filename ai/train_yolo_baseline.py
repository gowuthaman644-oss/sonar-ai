import sys
import torch
from pathlib import Path
from ultralytics import YOLO

def main():
    print("==================================================")
    print("SONAR-AI YOLO BASELINE TRAINING")
    print("==================================================")
    
    # 18. Print CUDA availability
    cuda_avail = torch.cuda.is_available()
    print(f"CUDA available: {cuda_avail}")
    
    device = "cpu"
    if cuda_avail:
        # 19. Print the GPU name
        gpu_name = torch.cuda.get_device_name(0)
        print(f"GPU name: {gpu_name}")
        # 5. Explicitly use device=0
        device = 0
    else:
        print("WARNING: CUDA not available. Training will run on CPU and may be slow.")
        
    print(f"Target device: {device}")
    print()
    
    # Paths
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    base_dir = PROJECT_ROOT / "dataset" / "side-scan-sonar-object-detection-challenge"
    yaml_path = base_dir / "data.yaml"
    
    RUNS_DIR = PROJECT_ROOT / "runs" / "sonar"
    
    if not yaml_path.exists():
        print(f"ERROR: Dataset configuration not found at {yaml_path}")
        sys.exit(1)
        
    # 1. Use YOLO11n detection model
    # 2. Load the pretrained YOLO11n weights
    print("Loading pretrained YOLO11n model...")
    model = YOLO("yolo11n.pt")
    
    # Training configuration
    print(f"Starting training on dataset: {yaml_path}")
    print("Parameters: epochs=50, batch=8, imgsz=640, patience=15")
    
    # 3-14. Train the model
    results = model.train(
        data=str(yaml_path),
        epochs=50,
        batch=8,
        imgsz=640,
        patience=15,
        device=device,
        pretrained=True,
        project=str(RUNS_DIR),
        name="baseline_yolo11n",
        exist_ok=True
    )
    
    # 20. Print the location of best.pt
    best_weights = RUNS_DIR / "baseline_yolo11n" / "weights" / "best.pt"
    
    if not best_weights.exists():
        raise FileNotFoundError(
            f"Training completed but best.pt was not found at: {best_weights}"
        )
    
    print()
    print("==================================================")
    print("TRAINING COMPLETE")
    print(f"Best model weights saved to: {best_weights}")
    print(f"File size: {best_weights.stat().st_size:,} bytes")
    
    # 21. Run validation using the best model
    print("\nRunning final validation with best model...")
    best_model = YOLO(str(best_weights))
    val_results = best_model.val()
    
    # 22. Print validation metrics
    print("\n==================================================")
    print("VALIDATION METRICS")
    print("==================================================")
    # The results object contains mean metrics across classes
    print(f"mAP@0.5:   {val_results.box.map50:.4f}")
    print(f"mAP@0.5:0.95: {val_results.box.map:.4f}")
    
    # If precision and recall arrays are available, print their mean
    if hasattr(val_results.box, 'mp') and hasattr(val_results.box, 'mr'):
        print(f"Precision: {val_results.box.mp:.4f}")
        print(f"Recall:    {val_results.box.mr:.4f}")
    
    print("==================================================")

if __name__ == "__main__":
    main()
