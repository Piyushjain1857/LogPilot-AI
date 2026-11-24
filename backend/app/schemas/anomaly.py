import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class AnomalyResponse(BaseModel):
    id: int
    detected_at: datetime.datetime
    time_window_start: datetime.datetime
    time_window_end: datetime.datetime
    service_name: str
    anomaly_type: str
    severity: str
    anomaly_score: float
    algorithm: str
    metric_name: str
    observed_value: float
    expected_value: float
    threshold: float
    context_payload: Optional[Dict[str, Any]] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class AnomalyDetailResponse(AnomalyResponse):
    baseline: Optional[Dict[str, Any]] = None
    surrounding_logs: List[Dict[str, Any]] = Field(default_factory=list)


class AnomalyListResponse(BaseModel):
    items: List[AnomalyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AnomalyStatusUpdate(BaseModel):
    status: Literal["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE"]


class DetectionTriggerRequest(BaseModel):
    start_time: Optional[datetime.datetime] = None
    end_time: Optional[datetime.datetime] = None
    window_minutes: int = Field(default=5, ge=1, le=1440)
    service_name: Optional[str] = None
    algorithm: Literal["ALL", "Z_SCORE", "MAD", "EWMA", "ISOLATION_FOREST"] = "ALL"


class DetectionRunResponse(BaseModel):
    id: int
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    status: str
    algorithm: str
    window_minutes: int
    total_windows_analyzed: int
    anomalies_detected: int
    summary: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class AnomalyStatisticsResponse(BaseModel):
    total_active: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    most_anomalous_service: Optional[str] = None
    avg_anomaly_score: float
    recent_trend: List[Dict[str, Any]] = Field(default_factory=list)


class ServiceBaselineResponse(BaseModel):
    id: int
    service_name: str
    metric_name: str
    time_window: str
    mean: float
    std_dev: float
    median: float
    mad: float
    ewma_mean: float
    p95: float
    min_val: float
    max_val: float
    sample_count: int
    updated_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DetectionConfigResponse(BaseModel):
    z_score_threshold: float = 3.0
    mad_threshold: float = 3.5
    ewma_alpha: float = 0.3
    ewma_threshold_std: float = 2.5
    isolation_forest_contamination: float = 0.05
    min_samples_for_baseline: int = 5
    enabled_algorithms: List[str] = Field(default_factory=lambda: ["Z_SCORE", "MAD", "EWMA", "ISOLATION_FOREST"])


class DetectionConfigUpdate(BaseModel):
    z_score_threshold: Optional[float] = Field(default=None, ge=1.0, le=10.0)
    mad_threshold: Optional[float] = Field(default=None, ge=1.0, le=10.0)
    ewma_alpha: Optional[float] = Field(default=None, ge=0.01, le=1.0)
    ewma_threshold_std: Optional[float] = Field(default=None, ge=1.0, le=10.0)
    isolation_forest_contamination: Optional[float] = Field(default=None, ge=0.01, le=0.5)
    min_samples_for_baseline: Optional[int] = Field(default=None, ge=3, le=100)
    enabled_algorithms: Optional[List[str]] = None
