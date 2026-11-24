import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class AgentThoughtStep(BaseModel):
    step: int
    thought: str
    tool: str
    tool_input: Dict[str, Any] = Field(default_factory=dict)
    observation: Any = None


class DiagnosticPerspective(BaseModel):
    title: str
    summary: str
    severity: str = "INFO"  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    findings: List[str] = Field(default_factory=list)


class RemediationStep(BaseModel):
    step_number: int
    action: str
    command: Optional[str] = None
    verification: str
    rollback_plan: str


class TroubleshooterRequest(BaseModel):
    incident_id: Optional[str] = None
    query: Optional[str] = None
    target_service: Optional[str] = None


class TroubleshooterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    investigation_id: str
    incident_id: Optional[str] = None
    status: str
    executive_summary: str
    root_cause_analysis: str
    perspectives: Dict[str, DiagnosticPerspective] = Field(default_factory=dict)
    remediation_steps: List[RemediationStep] = Field(default_factory=list)
    evidence_citations: List[Dict[str, Any]] = Field(default_factory=list)
    thought_steps: List[AgentThoughtStep] = Field(default_factory=list)
    model_used: str
    completed_at: datetime.datetime


class TroubleshooterChatRequest(BaseModel):
    investigation_id: Optional[str] = None
    incident_id: Optional[str] = None
    message: str
    history: List[Dict[str, str]] = Field(default_factory=list)


class TroubleshooterChatResponse(BaseModel):
    response: str
    evidence_citations: List[Dict[str, Any]] = Field(default_factory=list)
