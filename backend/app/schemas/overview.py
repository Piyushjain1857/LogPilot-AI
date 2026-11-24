from typing import List, Optional
from pydantic import BaseModel


class OverviewSummaryResponse(BaseModel):
    total_logs: int
    error_logs: int
    warning_logs: int
    critical_logs: int
    active_incidents: int
    configured_sources: int


class LogActivityPoint(BaseModel):
    timestamp: str
    count: int
    error_count: int
    warning_count: int


class LogActivityResponse(BaseModel):
    range: str
    bucket_minutes: int
    points: List[LogActivityPoint]


class SeverityDistributionItem(BaseModel):
    severity: str
    count: int
    percentage: float


class SeverityDistributionResponse(BaseModel):
    total: int
    distribution: List[SeverityDistributionItem]


class RecentIncidentItem(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    affected_services: List[str]
    first_detected_at: str
    last_detected_at: str


class RecentIncidentsResponse(BaseModel):
    incidents: List[RecentIncidentItem]


class SourceHealthItem(BaseModel):
    id: str
    name: str
    source_type: str
    service_name: str
    status: str
    health: str  # healthy, degraded, unhealthy, unknown
    last_seen_at: Optional[str] = None


class SourceHealthResponse(BaseModel):
    sources: List[SourceHealthItem]


class ServiceMatrixItem(BaseModel):
    service_name: str
    tier: str
    health: str  # HEALTHY, DEGRADED, CRITICAL
    log_count: int
    error_count: int
    error_rate: float
    avg_latency_ms: int
    last_seen_at: Optional[str] = None
    open_incidents: int = 0


class ServiceMatrixResponse(BaseModel):
    services: List[ServiceMatrixItem]


class CommandCenterTelemetryResponse(BaseModel):
    system_health_index: int  # 0 to 100
    system_status: str  # HEALTHY, DEGRADED, CRITICAL
    events_per_second: float
    errors_per_minute: float
    active_incidents_count: int
    unresolved_anomalies_count: int
    total_logs: int
    error_rate_percentage: float

