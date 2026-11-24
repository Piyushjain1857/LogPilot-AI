import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class ClusterResponse(BaseModel):
    id: str
    signature_hash: str
    name: Optional[str] = None
    service_name: str
    template: str
    pattern_regex: Optional[str] = None
    severity: str
    occurrence_count: int
    error_count: int
    sample_log_ids: Optional[List[str]] = None
    variable_parameters: Optional[Dict[str, List[str]]] = None
    status: str
    first_seen_at: datetime.datetime
    last_seen_at: datetime.datetime
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class ClusterEvolutionPoint(BaseModel):
    timestamp: datetime.datetime
    count: int
    anomaly_detected: bool

    model_config = ConfigDict(from_attributes=True)


class ClusterDetailResponse(ClusterResponse):
    timeline: List[ClusterEvolutionPoint] = Field(default_factory=list)
    member_logs: List[Dict[str, Any]] = Field(default_factory=list)


class ClusterListResponse(BaseModel):
    items: List[ClusterResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ClusterStatusUpdate(BaseModel):
    status: Literal["ACTIVE", "MUTED", "RESOLVED"]


class ClusterMineRequest(BaseModel):
    service_name: Optional[str] = None
    hours: int = Field(default=24, ge=1, le=168)
    limit: int = Field(default=2000, ge=10, le=10000)


class ClusterMineResponse(BaseModel):
    status: str
    logs_processed: int
    clusters_created: int
    clusters_updated: int
    total_active_clusters: int


class TopClusterSummary(BaseModel):
    id: str
    name: Optional[str] = None
    template: str
    service_name: str
    severity: str
    occurrence_count: int
    error_count: int


class ClusterStatisticsResponse(BaseModel):
    total_clusters: int
    active_clusters: int
    muted_clusters: int
    resolved_clusters: int
    new_last_24h: int
    total_grouped_errors: int
    top_clusters: List[TopClusterSummary] = Field(default_factory=list)
