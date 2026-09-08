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
from backend.services.evidence_service import analyze_acoustic_evidence
from backend.services.anomaly_service import detect_unknown_anomalies, triage_detection_contact
from backend.services.uncertainty_service import evaluate_detection_uncertainty

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
        for idx, det in enumerate(detections_data):
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
            
            # Acoustic Evidence Analysis Engine (Measurable properties on image pixels)
            try:
                evidence_data = analyze_acoustic_evidence(
                    str(file_path),
                    bbox,
                    detection_id=f"DET-{idx + 1}"
                )
                triage = triage_detection_contact(
                    det["class_name"],
                    det["confidence"],
                    evidence_data.get("evidence_score", 0.0),
                    evidence_data.get("evidence_status", "INSUFFICIENT_EVIDENCE")
                )
                uncertainty_data = evaluate_detection_uncertainty(
                    det["confidence"],
                    evidence_data.get("evidence_score", 0.0),
                    evidence_data.get("evidence_status", "INSUFFICIENT_EVIDENCE"),
                    evidence_features=evidence_data,
                    contact_type=triage.get("contact_type")
                )
            except Exception as ev_err:
                evidence_data = None
                triage = {"contact_type": "PROVISIONAL_TARGET", "assessment": "MODERATE_EVIDENCE_CONTACT"}
                uncertainty_data = None

            # Temporal Target Tracking Association (Additive intelligence layer)
            tracking_payload = None
            try:
                from backend.services.tracking_service import default_associator, calculate_track_trends
                track, is_new, tel = default_associator.associate_detection(
                    db=db,
                    candidate_det={
                        "class_name": det["class_name"],
                        "confidence": det["confidence"],
                        "x": x, "y": y, "width": width, "height": height
                    },
                    scan=scan,
                    img_width=640.0,
                    img_height=640.0,
                    evidence_score=evidence_data.get("evidence_score") if evidence_data else None,
                    risk_level=risk_result.get("risk_level")
                )
                db_detection.track_id = track.track_id
                db.commit()

                # Collect chronological observations linked to this track
                track_obs = []
                for ob in track.detections:
                    track_obs.append({
                        "confidence": ob.confidence,
                        "evidence": track.latest_evidence if ob.id == db_detection.id else None,
                        "risk": track.latest_risk if ob.id == db_detection.id else None
                    })
                trends = calculate_track_trends(track_obs)

                tracking_payload = {
                    "track_id": track.track_id,
                    "class_name": track.class_name,
                    "status": track.status,
                    "observation_count": track.observation_count,
                    "first_observed": track.first_observed.isoformat() if track.first_observed else None,
                    "last_observed": track.last_observed.isoformat() if track.last_observed else None,
                    "latest_confidence": track.latest_confidence,
                    "latest_evidence": track.latest_evidence,
                    "latest_risk": track.latest_risk,
                    "confidence_trend": trends.get("confidence_trend", []),
                    "evidence_trend": trends.get("evidence_trend", []),
                    "risk_trend": trends.get("risk_trend", []),
                    "trend_summary": trends.get("trend_summary", "Trend unavailable")
                }
            except Exception as trk_err:
                tracking_payload = None

            db.flush()

            detection_responses.append(
                DetectionResponse(
                    id=db_detection.id,
                    class_name=det["class_name"],
                    confidence=det["confidence"],
                    x=x,
                    y=y,
                    width=width,
                    height=height,
                    track_id=db_detection.track_id,
                    evidence=evidence_data,
                    contact_type=triage.get("contact_type"),
                    assessment=triage.get("assessment"),
                    uncertainty=uncertainty_data,
                    tracking=tracking_payload,
                    operator_feedback=None
                )
            )

        # Phase 8 Evidence Fusion & Decision Intelligence Prioritization
        try:
            from backend.services.fusion_service import fuse_detection_intelligence
            detection_responses = fuse_detection_intelligence(
                detection_responses,
                scan_risk=risk_result,
                tracking_context=None
            )
        except Exception as fusion_err:
            pass

        # 5. Unknown Acoustic Anomaly Analysis (outside known YOLO targets)
        try:
            anomaly_data = detect_unknown_anomalies(
                str(file_path),
                existing_detections=detections_data
            )
            calculated_anomaly_score = anomaly_data.get("anomaly_score", 0.0)
        except Exception as anom_err:
            anomaly_data = None
            calculated_anomaly_score = 0.0

        # 6. Save Analysis to DB
        db_analysis = Analysis(
            scan_id=scan.id,
            anomaly_score=calculated_anomaly_score,
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            explanation=risk_result["reason"]
        )
        db.add(db_analysis)

        # 7. Update Scan status
        scan.status = "completed"
        db.commit()
        db.refresh(scan)
        
        analysis_response = AnalysisResponse(
            anomaly_score=calculated_anomaly_score,
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            explanation=risk_result["reason"],
            anomaly_details=anomaly_data
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
