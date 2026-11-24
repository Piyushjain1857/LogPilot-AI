from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class LogSourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    source_type: str = Field("file", max_length=64)
    service_name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None


class LogSourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    service_name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = None
    status: Optional[str] = Field(None, max_length=32)


class LogSourceResponse(BaseModel):
    id: str
    name: str
    source_type: str
    service_name: str
    description: Optional[str] = None
    status: str
    total_records: int = 0
    last_ingested_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LogSourceListResponse(BaseModel):
    items: List[LogSourceResponse]
    total: int
