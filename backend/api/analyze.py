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
from backend.database.models import Scan
from backend.schemas.scan import ScanResponse
from backend.services.ai_service import analyze_image


router = APIRouter(
    prefix="/api",
    tags=["Analysis"]
)


UPLOAD_DIR = Path("outputs/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post(
    "/analyze",
    response_model=ScanResponse
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

    extension = Path(
        image.filename or ""
    ).suffix.lower()

    if extension not in {".png", ".jpg", ".jpeg"}:
        extension = ".png"

    file_path = (
        UPLOAD_DIR /
        f"{scan_id}{extension}"
    )

    contents = await image.read()

    file_path.write_bytes(contents)

    scan = Scan(
        scan_id=scan_id,
        filename=image.filename or "unknown",
        file_path=str(file_path),
        status="uploaded"
    )

    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Temporary AI call.
    # YOLO will replace this later.
    ai_result = analyze_image(
        str(file_path)
    )

    return {
        "scan_id": scan_id,
        "filename": image.filename or "unknown",
        "status": "uploaded",
        "message": ai_result["message"]
    }
