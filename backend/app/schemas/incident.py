import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class TimelineEvent(BaseModel):
    timestamp: datetime.datetime
    event_type: str = Field(..., description="ANOMALY_DETECTED, ERROR_BURST, CLUSTER_SPIKE, STATUS_CHANGED, NOTE_ADDED")
    service: Optional[str] = None
    description: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IncidentResponse(BaseModel):
    id: str
    incident_number: Optional[str] = None
    title: str
    description: str
    severity: str
    status: str
    primary_service: Optional[str] = None
    affected_services: List[str] = Field(default_factory=list)
    root_cause_hypothesis: Optional[str] = None
    first_detected_at: datetime.datetime
    last_detected_at: datetime.datetime
    mitigated_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    anomaly_count: int = 0
    cluster_count: int = 0
    assigned_to: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IncidentDetailResponse(IncidentResponse):
    timeline_events: List[TimelineEvent] = Field(default_factory=list)
    metrics_snapshot: Dict[str, Any] = Field(default_factory=dict)
    anomaly_ids: List[int] = Field(default_factory=list)
    cluster_ids: List[str] = Field(default_factory=list)
    resolution_notes: Optional[str] = None
    sample_logs: List[Dict[str, Any]] = Field(default_factory=list)


class IncidentListResponse(BaseModel):
    incidents: List[IncidentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class IncidentStatisticsResponse(BaseModel):
    total_incidents: int
    active_incidents: int
    critical_incidents: int
    mitigated_incidents: int
    resolved_incidents: int
    mttr_seconds: float = 0.0
    severity_breakdown: Dict[str, int] = Field(default_factory=dict)
    status_breakdown: Dict[str, int] = Field(default_factory=dict)


class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., description="active, investigating, mitigated, resolved, closed")
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentAddNoteRequest(BaseModel):
    note: str = Field(..., min_length=2, max_length=2000)
    author: Optional[str] = "Operator"


class IncidentCorrelateRequest(BaseModel):
    lookback_minutes: int = Field(60, ge=5, le=1440)
    force_recorrelate: bool = False


class IncidentCorrelateResponse(BaseModel):
    status: str
    incidents_created: int
    incidents_updated: int
    anomalies_correlated: int
    clusters_correlated: int
    incident_ids: List[str] = Field(default_factory=list)
