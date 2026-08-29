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
