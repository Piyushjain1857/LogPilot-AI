from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ParsedLogRecord(BaseModel):
    line_number: Optional[int] = None
    timestamp: Optional[datetime] = None
    severity: str = "UNKNOWN"
    service_name: str = "unknown-service"
    message: str
    raw_message: str
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    parsing_status: str = "SUCCESS"
    is_valid: bool = True
    error_reason: Optional[str] = None
    is_redacted: bool = False
