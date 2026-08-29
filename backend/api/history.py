from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from backend.database.database import get_db
from backend.database.models import Scan
from backend.schemas.analysis import ScanAnalysisResponse

router = APIRouter(
    prefix="/api",
    tags=["History"]
)

@router.get(
    "/history",
    response_model=list[ScanAnalysisResponse]
)
def get_history(
    db: Session = Depends(get_db)
):

    scans = (
        db.query(Scan)
        .options(joinedload(Scan.detections), joinedload(Scan.analysis))
        .order_by(Scan.created_at.desc())
        .all()
    )

    return scans
@router.get("/history/{scan_id}/image")
def get_scan_image(scan_id: str, db: Session = Depends(get_db)):
    import os
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    
    scan = db.query(Scan).filter(Scan.scan_id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if not os.path.exists(scan.file_path):
        raise HTTPException(status_code=404, detail="Image file not found")
        
    return FileResponse(scan.file_path)
