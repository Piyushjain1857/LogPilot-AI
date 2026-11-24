import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class CausalNode(BaseModel):
    id: str
    label: str
    status: str = Field(..., description="ROOT_CAUSE, PROPAGATING, SYMPTOM, HEALTHY")
    error_count: int = 0
    anomaly_score: float = 0.0
    first_error_time: Optional[datetime.datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CausalEdge(BaseModel):
    id: str
    source: str
    target: str
    propagation_probability: float = 0.0
    latency_ms: Optional[float] = None
    call_count: int = 1
    is_critical_path: bool = False


class CausalGraph(BaseModel):
    nodes: List[CausalNode] = Field(default_factory=list)
    edges: List[CausalEdge] = Field(default_factory=list)
    root_node_id: Optional[str] = None


class EvidenceCitation(BaseModel):
    log_id: str
    timestamp: datetime.datetime
    service_name: str
    severity: str
    message: str
    trace_id: Optional[str] = None
    relevance_score: float = 1.0
    citation_type: str = Field("LOG_ERROR", description="LOG_ERROR, ANOMALY_BREACH, CLUSTER_SPIKE")


class CausalHypothesis(BaseModel):
    rank: int
    service_name: str
    title: str
    explanation: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    temporal_precedence_score: float = 0.0
    topological_depth_score: float = 0.0
    error_severity_score: float = 0.0
    cross_trace_score: float = 0.0
    evidence_citations: List[EvidenceCitation] = Field(default_factory=list)
    recommended_action: str


class RCARequest(BaseModel):
    incident_id: Optional[str] = None
    lookback_minutes: int = Field(60, ge=5, le=1440)
    service_filter: Optional[str] = None


class RCAResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    analysis_id: str
    incident_id: Optional[str] = None
    status: str
    summary: str
    confidence_score: float
    top_root_cause_service: Optional[str] = None
    graph: CausalGraph
    hypotheses: List[CausalHypothesis] = Field(default_factory=list)
    created_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None


class GlobalTopologyResponse(BaseModel):
    nodes: List[CausalNode]
    edges: List[CausalEdge]
    total_services: int
    total_dependencies: int
