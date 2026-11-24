from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class PlaybookStep(BaseModel):
    step_number: int = Field(..., description="1-based step order")
    name: str = Field(..., description="Short title of the remediation step")
    description: str = Field(..., description="Operational intent of the step")
    command: str = Field(..., description="Allowlisted command or script snippet")
    safety_tier: str = Field("SAFE", description="SAFE, CAUTION, or CRITICAL_DESTRUCTIVE")
    requires_approval: bool = Field(False, description="Whether human confirmation gate is enforced")
    approved: bool = Field(False, description="Whether this step has been explicitly approved")
    rollback_command: Optional[str] = Field(None, description="Compensating rollback action")
    verification_command: Optional[str] = Field(None, description="Post-execution health check command")
    status: str = Field("pending", description="pending, approved, simulated, completed, rolled_back, failed")


class PlaybookBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=256)
    playbook_number: Optional[str] = Field(None, description="e.g. PB-101")
    slug: Optional[str] = Field(None, description="URL-safe unique identifier")
    category: str = Field("GENERAL", description="DATABASE, CONTAINER, CIRCUIT_BREAKER, CACHE, NETWORK, STORAGE")
    description: str = Field(..., min_length=5)
    target_service: str = Field("all", description="Target service name or 'all'")
    risk_level: str = Field("SAFE", description="SAFE, CAUTION, CRITICAL_DESTRUCTIVE")
    estimated_downtime: str = Field("0 seconds", description="Estimated operational impact")


class PlaybookCreate(PlaybookBase):
    incident_id: Optional[str] = None
    steps: List[PlaybookStep] = Field(default_factory=list)


class PlaybookResponse(PlaybookBase):
    id: str
    incident_id: Optional[str] = None
    approval_status: str
    execution_status: str
    steps: List[PlaybookStep]
    simulation_log: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlaybookRecommendation(BaseModel):
    playbook: PlaybookResponse
    match_score: float = Field(..., ge=0.0, le=1.0)
    match_reasons: List[str]
    confidence: str = Field("HIGH", description="HIGH, MEDIUM, or LOW")


class StepApprovalRequest(BaseModel):
    step_number: int = Field(..., description="Target step order number")
    approved: bool = Field(..., description="True to approve, False to reject")
    approver_note: Optional[str] = Field(None, description="Audit rationale for decision")
    performed_by: Optional[str] = Field("sre-operator", description="Operator identifier")


class SimulationRequest(BaseModel):
    dry_run: bool = Field(True, description="Enforce dry-run sandbox execution")
    enforce_approvals: bool = Field(True, description="Strictly skip or halt unapproved steps")


class SimulationStepLog(BaseModel):
    step_number: int
    step_name: str
    command: str
    safety_tier: str
    preflight_passed: bool
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int
    verification_passed: bool
    verification_output: str
    status: str


class SimulationResponse(BaseModel):
    playbook_id: str
    execution_status: str
    all_passed: bool
    total_duration_ms: int
    steps: List[SimulationStepLog]
    rollback_ready: bool
    completed_at: datetime


class RollbackRequest(BaseModel):
    steps_to_rollback: Optional[List[int]] = Field(None, description="Specific step numbers or all if None")
    performed_by: Optional[str] = Field("sre-operator", description="Operator identifier")


class RollbackResponse(BaseModel):
    playbook_id: str
    execution_status: str
    rolled_back_steps: List[Dict[str, Any]]
    message: str


class AuditLogResponse(BaseModel):
    id: str
    playbook_id: str
    action: str
    step_number: Optional[str] = None
    performed_by: str
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
