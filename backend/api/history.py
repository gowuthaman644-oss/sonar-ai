from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from backend.database.database import get_db
from backend.database.models import Scan, Detection, ContactTrack
from backend.schemas.analysis import (
    ScanAnalysisResponse,
    ContactTrackSummary,
    ContactTrackDetail,
    TrackObservationItem,
)
from backend.services.tracking_service import calculate_track_trends

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
        .options(
            joinedload(Scan.detections).joinedload(Detection.operator_feedback),
            joinedload(Scan.analysis)
        )
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
@router.get(
    "/tracks",
    response_model=list[ContactTrackSummary]
)
def get_tracks(
    db: Session = Depends(get_db)
):
    """
    Returns persistent contact tracks ordered by most recently observed.
    Additive, read-only endpoint for cross-mission intelligence.
    """
    tracks = (
        db.query(ContactTrack)
        .order_by(ContactTrack.last_observed.desc())
        .all()
    )
    return tracks


@router.get(
    "/tracks/{track_id}",
    response_model=ContactTrackDetail
)
def get_track_detail(
    track_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns full chronological observation history and actual trajectories for a persistent track.
    """
    from fastapi import HTTPException
    
    track = (
        db.query(ContactTrack)
        .filter(ContactTrack.track_id == track_id)
        .first()
    )
    if not track:
        raise HTTPException(status_code=404, detail=f"Contact track {track_id} not found")

    # Fetch and sort associated detections chronologically
    detections = (
        db.query(Detection)
        .options(
            joinedload(Detection.scan),
            joinedload(Detection.operator_feedback)
        )
        .filter(Detection.track_id == track_id)
        .all()
    )
    detections.sort(key=lambda d: d.scan.created_at if d.scan and d.scan.created_at else d.id)

    obs_items = []
    obs_for_trends = []
    for idx, det in enumerate(detections):
        scan_id_val = det.scan.scan_id if det.scan else "UNKNOWN"
        scan_ts = det.scan.created_at if det.scan else None
        fname = det.scan.filename if det.scan else "unknown"
        
        obs_items.append(
            TrackObservationItem(
                observation_index=idx + 1,
                detection_id=det.id,
                scan_id=scan_id_val,
                scan_timestamp=scan_ts,
                filename=fname,
                class_name=det.class_name,
                confidence=det.confidence,
                x=det.x,
                y=det.y,
                width=det.width,
                height=det.height,
                image_url=f"/api/history/{scan_id_val}/image" if det.scan else None,
                operator_feedback=det.operator_feedback
            )
        )
        obs_for_trends.append({
            "confidence": det.confidence,
            "evidence": track.latest_evidence if idx == len(detections) - 1 else None,
            "risk": track.latest_risk if idx == len(detections) - 1 else None
        })

    trends = calculate_track_trends(obs_for_trends)

    return ContactTrackDetail(
        track_id=track.track_id,
        class_name=track.class_name,
        status=track.status,
        observation_count=track.observation_count,
        first_observed=track.first_observed,
        last_observed=track.last_observed,
        latest_confidence=track.latest_confidence,
        latest_evidence=track.latest_evidence,
        latest_risk=track.latest_risk,
        confidence_trend=trends.get("confidence_trend", []),
        evidence_trend=trends.get("evidence_trend", []),
        risk_trend=trends.get("risk_trend", []),
        trend_summary=trends.get("trend_summary", "Trend unavailable"),
        observations=obs_items
    )
