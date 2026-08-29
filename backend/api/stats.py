from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Scan


router = APIRouter(
    prefix="/api",
    tags=["Statistics"]
)


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db)
):

    total_scans = (
        db.query(Scan)
        .count()
    )

    return {
        "total_scans": total_scans,
        "message": "Statistics retrieved successfully."
    }
