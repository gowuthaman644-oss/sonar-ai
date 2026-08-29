from datetime import datetime

from pydantic import BaseModel


class ScanResponse(BaseModel):
    scan_id: str
    filename: str
    status: str
    message: str


class HistoryItem(BaseModel):
    scan_id: str
    filename: str
    status: str
    created_at: datetime
