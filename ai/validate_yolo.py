import torch
from ultralytics import YOLO

def main():
    print("Loading pretrained YOLO model...")
    model = YOLO("yolov8n.pt")
    print("Model loaded successfully")
    
    cuda_avail = torch.cuda.is_available()
    print(f"CUDA availability: {cuda_avail}")
    if cuda_avail:
        print(f"GPU name: {torch.cuda.get_device_name(0)}")
    
    yaml_path = "dataset/side-scan-sonar-object-detection-challenge/data.yaml"
    print(f"Dataset path: {yaml_path}")
    
    # We run the YOLO internal validator for the dataset without actually training
    print("\nRunning YOLO dataset validation...")
    try:
        from ultralytics.data.utils import check_det_dataset
        dataset_info = check_det_dataset(yaml_path)
        
        nc = dataset_info.get("nc", 0)
        names = dataset_info.get("names", {})
        
        print(f"Number of classes: {nc}")
        print("Class names:")
        for idx, name in names.items():
            print(f"  {idx}: {name}")
        
        print("\nValidation result: PASS (YOLO internal validation succeeded)")
    except Exception as e:
        print(f"\nValidation result: FAIL ({e})")

if __name__ == "__main__":
    main()
