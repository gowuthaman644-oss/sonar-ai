import json
from sqlalchemy.orm import Session
import sys

# Ensure backend models can be imported
sys.path.append('..')
from backend import models

from .preprocessing import preprocess_image
from .yolo_stub import detect_objects
from .anomaly_stub import detect_anomalies
from .scoring import calculate_risk
from .explanation import generate_explanation

def process_sonar_image(job_id: str, file_location: str, db: Session):
    """
    Main orchestration pipeline.
    Runs asynchronously via FastAPI BackgroundTasks.
    """
    try:
        # Update status
        job = db.query(models.SonarJob).filter(models.SonarJob.job_id == job_id).first()
        job.status = "processing"
        db.commit()

        # Pipeline Steps
        processed_img_path = preprocess_image(file_location)
        detections = detect_objects(processed_img_path)
        anomaly_score = detect_anomalies(processed_img_path)
        
        risk_level = calculate_risk(detections, anomaly_score)
        explanation = generate_explanation(risk_level, detections, anomaly_score)

        # Save results
        job.bounding_boxes = json.dumps(detections)
        job.anomaly_score = anomaly_score
        job.risk_level = risk_level
        job.explanation = explanation
        job.status = "completed"
        
        db.commit()

    except Exception as e:
        job = db.query(models.SonarJob).filter(models.SonarJob.job_id == job_id).first()
        if job:
            job.status = "failed"
            job.explanation = str(e)
            db.commit()
