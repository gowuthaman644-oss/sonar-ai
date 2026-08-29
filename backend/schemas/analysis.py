from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DetectionResponse(BaseModel):
    class_name: str
    confidence: float
    x: float
    y: float
    width: float
    height: float


class AnalysisResponse(BaseModel):
    anomaly_score: float
    risk_score: float
    risk_level: str
    explanation: Optional[str] = None


class ScanAnalysisResponse(BaseModel):
    scan_id: str
    filename: str
    status: str
    created_at: Optional[datetime] = None
    detections: list[DetectionResponse]
    analysis: Optional[AnalysisResponse] = None
