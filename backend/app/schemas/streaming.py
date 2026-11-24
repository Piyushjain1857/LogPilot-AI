from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field


class LogRecordInput(BaseModel):
    event_id: Optional[str] = Field(None, max_length=128, description="Client-supplied event ID for idempotency")
    timestamp: Optional[Union[datetime, str]] = Field(None, description="ISO-8601 or parseable timestamp")
    severity: str = Field("INFO", max_length=32, description="Log severity (e.g. INFO, ERROR, WARNING, CRITICAL, DEBUG)")
    service: Optional[str] = Field(None, max_length=128, description="Emitting microservice name")
    message: str = Field(..., min_length=1, max_length=32768, description="Log message text")
    trace_id: Optional[str] = Field(None, max_length=128, description="Distributed trace identifier")
    span_id: Optional[str] = Field(None, max_length=64, description="Distributed span identifier")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Structured contextual key-value attributes")


class SingleLogIngestResponse(BaseModel):
    status: str = Field("ACCEPTED", description="Processing status: ACCEPTED or PERSISTED")
    event_id: Optional[str] = None
    source_id: str
    service_name: str
    receipt_id: str
    accepted_at: datetime
    is_duplicate: bool = False


class BatchLogIngestRequest(BaseModel):
    batch_id: Optional[str] = Field(None, max_length=128, description="Client batch identifier")
    logs: List[LogRecordInput] = Field(..., min_length=1, max_length=500, description="Array of log records (up to 500)")


class BatchLogIngestResponse(BaseModel):
    batch_id: str
    status: str = Field("ACCEPTED", description="ACCEPTED, PARTIALLY_ACCEPTED, or REJECTED")
    total_records: int
    accepted_records: int
    rejected_records: int
    duplicate_records: int
    receipt_id: str
    accepted_at: datetime
    errors: Optional[List[Dict[str, Any]]] = None


class BatchStatusResponse(BaseModel):
    id: str
    source_id: str
    external_batch_id: Optional[str] = None
    status: str
    total_records: int
    accepted_records: int
    persisted_records: int
    duplicate_records: int
    failed_records: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_summary: Optional[List[Dict[str, Any]]] = None


class StreamStatusResponse(BaseModel):
    service_status: str
    queue_depth: int
    queue_capacity: int
    active_workers: int
    connected_clients: int
    last_persisted_event_timestamp: Optional[datetime] = None


class StreamMetricsResponse(BaseModel):
    total_received: int
    total_accepted: int
    total_persisted: int
    total_rejected: int
    total_duplicates: int
    queue_depth: int
    active_workers: int
    connected_clients: int
    requests_per_minute: float
    logs_per_second: float
    median_latency_ms: float
    p95_latency_ms: float
    source_activity: Dict[str, Any]
    severity_distribution: Dict[str, int]


class StreamEventsReplayResponse(BaseModel):
    events: List[Dict[str, Any]]
    high_water_mark: int
    total_returned: int
    has_more: bool


class SourceHealthResponse(BaseModel):
    source_id: str
    name: str
    service_name: str
    source_type: str
    status: str
    connection_status: str
    ingestion_enabled: bool
    last_seen_at: Optional[datetime] = None
    last_ingested_at: Optional[datetime] = None
    last_error_at: Optional[datetime] = None
    last_error_message: Optional[str] = None
    total_ingested_records: int
    total_failed_records: int
