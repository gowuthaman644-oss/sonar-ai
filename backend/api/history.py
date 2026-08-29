from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Scan
from backend.schemas.scan import HistoryItem


router = APIRouter(
    prefix="/api",
    tags=["History"]
)


@router.get(
    "/history",
    response_model=list[HistoryItem]
)
def get_history(
    db: Session = Depends(get_db)
):

    scans = (
        db.query(Scan)
        .order_by(Scan.created_at.desc())
        .all()
    )

    return scans
