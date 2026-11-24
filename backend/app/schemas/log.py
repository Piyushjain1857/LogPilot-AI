from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class LogEntryResponse(BaseModel):
    id: str
    source_id: str
    upload_batch_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    severity: str
    service_name: str
    message: str
    raw_message: str
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    metadata_json: Optional[str] = None
    line_number: Optional[int] = None
    parsing_status: str = "SUCCESS"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LogListResponse(BaseModel):
    items: List[LogEntryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
