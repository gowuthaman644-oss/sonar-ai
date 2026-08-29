from pathlib import Path
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Scan, Detection, Analysis
from backend.schemas.analysis import ScanAnalysisResponse, DetectionResponse, AnalysisResponse
from backend.services.ai_service import analyze_image
from backend.services.risk_service import calculate_risk

router = APIRouter(
    prefix="/api",
    tags=["Analysis"]
)

UPLOAD_DIR = Path("outputs/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post(
    "/analyze",
    response_model=ScanAnalysisResponse
)
async def analyze_sonar(
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    allowed_types = {
        "image/png",
        "image/jpeg",
        "image/jpg"
    }

    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PNG and JPEG images are supported."
        )

    scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
    extension = Path(image.filename or "").suffix.lower()
    if extension not in {".png", ".jpg", ".jpeg"}:
        extension = ".png"

    file_path = UPLOAD_DIR / f"{scan_id}{extension}"
    contents = await image.read()
    file_path.write_bytes(contents)

    # 1. Create Scan record
    scan = Scan(
        scan_id=scan_id,
        filename=image.filename or "unknown",
        file_path=str(file_path),
        status="analyzing"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    try:
        # 2. YOLO Inference
        ai_result = analyze_image(str(file_path))
        detections_data = ai_result.get("detections", [])
        
        # 3. Risk Calculation
        risk_result = calculate_risk(detections_data)

        # 4. Save Detections to DB
        detection_responses = []
        for det in detections_data:
            bbox = det["bbox"]
            x = bbox["x1"]
            y = bbox["y1"]
            width = bbox["x2"] - bbox["x1"]
            height = bbox["y2"] - bbox["y1"]
            
            db_detection = Detection(
                scan_id=scan.id,
                class_name=det["class_name"],
                confidence=det["confidence"],
                x=x,
                y=y,
                width=width,
                height=height
            )
            db.add(db_detection)
            
            detection_responses.append(
                DetectionResponse(
                    class_name=det["class_name"],
                    confidence=det["confidence"],
                    x=x,
                    y=y,
                    width=width,
                    height=height
                )
            )

        # 5. Save Analysis to DB
        db_analysis = Analysis(
            scan_id=scan.id,
            anomaly_score=0.0, # Placeholder if needed
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            explanation=risk_result["reason"]
        )
        db.add(db_analysis)

        # 6. Update Scan status
        scan.status = "completed"
        db.commit()
        db.refresh(scan)
        
        analysis_response = AnalysisResponse(
            anomaly_score=0.0,
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            explanation=risk_result["reason"]
        )

        return ScanAnalysisResponse(
            scan_id=scan.scan_id,
            filename=scan.filename,
            status=scan.status,
            created_at=scan.created_at,
            detections=detection_responses,
            analysis=analysis_response
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        scan.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail="Error analyzing image.")
