from datetime import datetime
from enum import Enum
from typing import Optional, Any, Dict

from pydantic import BaseModel


class OperatorDecision(str, Enum):
    CONFIRM = "CONFIRM"
    REJECT = "REJECT"
    UNCERTAIN = "UNCERTAIN"


class OperatorFeedbackCreate(BaseModel):
    detection_id: int
    decision: OperatorDecision
    reason: Optional[str] = None
    notes: Optional[str] = None


class OperatorFeedbackResponse(BaseModel):
    id: int
    detection_id: int
    decision: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DetectionResponse(BaseModel):
    id: Optional[int] = None
    class_name: str
    confidence: float
    x: float
    y: float
    width: float
    height: float
    track_id: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    contact_type: Optional[str] = None
    assessment: Optional[str] = None
    uncertainty: Optional[Dict[str, Any]] = None
    tracking: Optional[Dict[str, Any]] = None
    operator_feedback: Optional[OperatorFeedbackResponse] = None
    priority_score: Optional[float] = None
    priority_tier: Optional[str] = None
    triage_rank: Optional[int] = None
    triage_rationale: Optional[str] = None
    fusion: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class AnalysisResponse(BaseModel):
    anomaly_score: float
    risk_score: float
    risk_level: str
    explanation: Optional[str] = None
    anomaly_details: Optional[Dict[str, Any]] = None


class ScanAnalysisResponse(BaseModel):
    scan_id: str
    filename: str
    status: str
    created_at: Optional[datetime] = None
    detections: list[DetectionResponse]
    analysis: Optional[AnalysisResponse] = None


class ContactTrackSummary(BaseModel):
    track_id: str
    class_name: str
    status: str
    observation_count: int
    first_observed: Optional[datetime] = None
    last_observed: Optional[datetime] = None
    latest_confidence: Optional[float] = None
    latest_evidence: Optional[float] = None
    latest_risk: Optional[str] = None
    latest_cx_norm: Optional[float] = None
    latest_cy_norm: Optional[float] = None
    latest_w_norm: Optional[float] = None
    latest_h_norm: Optional[float] = None

    model_config = {"from_attributes": True}


class TrackObservationItem(BaseModel):
    observation_index: int
    detection_id: int
    scan_id: str
    scan_timestamp: Optional[datetime] = None
    filename: str
    class_name: str
    confidence: float
    x: float
    y: float
    width: float
    height: float
    image_url: Optional[str] = None
    operator_feedback: Optional[OperatorFeedbackResponse] = None

    model_config = {"from_attributes": True}


class ContactTrackDetail(BaseModel):
    track_id: str
    class_name: str
    status: str
    observation_count: int
    first_observed: Optional[datetime] = None
    last_observed: Optional[datetime] = None
    latest_confidence: Optional[float] = None
    latest_evidence: Optional[float] = None
    latest_risk: Optional[str] = None
    confidence_trend: list[float] = []
    evidence_trend: list[float] = []
    risk_trend: list[str] = []
    trend_summary: str = "Trend unavailable"
    observations: list[TrackObservationItem] = []

    model_config = {"from_attributes": True}

