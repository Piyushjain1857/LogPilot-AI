from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SearchFilters(BaseModel):
    severity: Optional[str] = None
    severities: Optional[List[str]] = None
    service_name: Optional[str] = None
    services: Optional[List[str]] = None
    source_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    request_id: Optional[str] = None
    environment: Optional[str] = None
    template_id: Optional[str] = None
    parsing_status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    min_duration_ms: Optional[float] = None
    max_duration_ms: Optional[float] = None


class AdvancedSearchRequest(BaseModel):
    query: Optional[str] = Field(None, description="Safe query syntax e.g. service:auth AND severity:ERROR")
    filters: Optional[SearchFilters] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=200)
    sort_by: str = Field("timestamp", description="Field to sort by: timestamp, severity, service_name")
    sort_order: str = Field("desc", description="asc or desc")


class SearchStats(BaseModel):
    total_matches: int = 0
    query_duration_ms: float = 0.0
    fts_enabled: bool = True
    matched_services: List[str] = Field(default_factory=list)
    severity_breakdown: Dict[str, int] = Field(default_factory=dict)


class SearchResultItem(BaseModel):
    id: str
    source_id: str
    upload_batch_id: Optional[str] = None
    ingestion_batch_id: Optional[str] = None
    external_event_id: Optional[str] = None
    ingestion_method: str = "FILE_UPLOAD"
    timestamp: Optional[datetime] = None
    severity: str
    service_name: str
    message: str
    raw_message: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    template_id: Optional[str] = None
    line_number: Optional[int] = None
    parsing_status: str = "SUCCESS"
    metadata: Optional[Dict[str, Any]] = None
    highlight_snippet: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SearchResponse(BaseModel):
    items: List[SearchResultItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: SearchStats


class SuggestionItem(BaseModel):
    value: str
    label: str
    category: str  # "field", "value", "operator", "template"
    example: Optional[str] = None


class SavedSearchCreate(BaseModel):
    name: str = Field(..., max_length=128)
    query: str
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    query: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


class SavedSearchResponse(BaseModel):
    id: str
    name: str
    query: str
    description: Optional[str] = None
    filters_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SearchHistoryResponse(BaseModel):
    id: str
    query: str
    filters_json: Optional[str] = None
    result_count: int
    execution_time_ms: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TraceSummaryItem(BaseModel):
    trace_id: str
    service_count: int
    event_count: int
    error_count: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_ms: float = 0.0
    root_service: str
    services: List[str]


class TraceListResponse(BaseModel):
    items: List[TraceSummaryItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class TraceSpanEvent(BaseModel):
    id: str
    timestamp: Optional[datetime] = None
    service_name: str
    severity: str
    message: str
    span_id: Optional[str] = None
    relative_start_ms: float = 0.0
    duration_ms: Optional[float] = None
    is_error: bool = False
    metadata: Optional[Dict[str, Any]] = None
    template_id: Optional[str] = None


class TraceDetailResponse(BaseModel):
    trace_id: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_ms: float = 0.0
    total_events: int = 0
    error_count: int = 0
    services: List[str] = Field(default_factory=list)
    request_ids: List[str] = Field(default_factory=list)
    events: List[TraceSpanEvent] = Field(default_factory=list)


class ExportRequest(BaseModel):
    query: Optional[str] = None
    filters: Optional[SearchFilters] = None
    format: str = Field("csv", description="csv or json")
    fields: Optional[List[str]] = None
    limit: int = Field(5000, ge=1, le=20000)
