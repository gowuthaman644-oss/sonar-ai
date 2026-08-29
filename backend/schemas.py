from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class SonarJobCreate(BaseModel):
    filename: str

class SonarJobStatus(BaseModel):
    job_id: str
    status: str

class SonarJobResult(BaseModel):
    job_id: str
    status: str
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    anomaly_score: Optional[float] = None
    risk_level: Optional[str] = None
    explanation: Optional[str] = None
    
    class Config:
        from_attributes = True
