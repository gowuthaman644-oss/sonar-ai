from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import os
import json

from .. import models, schemas
from ..database import get_db

# We will import the AI pipeline orchestrator
import sys
sys.path.append('..')
from ai.pipeline import process_sonar_image

router = APIRouter(
    prefix="/api/sonar",
    tags=["sonar"]
)

UPLOAD_DIR = "../dataset/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.SonarJobStatus)
async def upload_sonar(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    job_id = str(uuid.uuid4())
    file_location = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
    
    with open(file_location, "wb+") as file_object:
        file_object.write(await file.read())

    # Create job in database
    db_job = models.SonarJob(job_id=job_id, status="pending", filename=file.filename)
    db.add(db_job)
    db.commit()

    # Trigger AI pipeline in background
    background_tasks.add_task(process_sonar_image, job_id, file_location, db)

    return {"job_id": job_id, "status": "pending"}

@router.get("/status/{job_id}", response_model=schemas.SonarJobStatus)
def get_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.SonarJob).filter(models.SonarJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job.job_id, "status": job.status}

@router.get("/results/{job_id}", response_model=schemas.SonarJobResult)
def get_results(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.SonarJob).filter(models.SonarJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed. Current status: {job.status}")
    
    return {
        "job_id": job.job_id,
        "status": job.status,
        "bounding_boxes": json.loads(job.bounding_boxes) if job.bounding_boxes else [],
        "anomaly_score": job.anomaly_score,
        "risk_level": job.risk_level,
        "explanation": job.explanation
    }
