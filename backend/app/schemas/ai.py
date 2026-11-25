from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class EvidenceCitation(BaseModel):
    id: str = Field(..., description="Unique evidence identifier e.g. EV-01, log-uuid")
    type: str = Field(..., description="Evidence type: log, stack_trace, metric, probe, commit")
    timestamp: Optional[str] = None
    source: str = Field(..., description="Source service, endpoint, or SDK observer")
    content: str = Field(..., description="Exact factual log or error excerpt")
    confirmed: bool = Field(True, description="Whether this is a confirmed factual finding")

    model_config = ConfigDict(from_attributes=True)


class ProbableRootCause(BaseModel):
    description: str = Field(..., description="Clear explanation of the probable failure mechanism")
    evidence_ids: List[str] = Field(default_factory=list, description="Referenced evidence IDs supporting this finding")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Estimated confidence score between 0.0 and 1.0")
    alternative_explanations: List[str] = Field(default_factory=list, description="Alternative hypotheses considered")

    model_config = ConfigDict(from_attributes=True)


class CodeFixProposal(BaseModel):
    file_path: str = Field(..., description="Target repository source file path")
    original_code: str = Field(..., description="Original problematic code snippet")
    proposed_code: str = Field(..., description="Proposed remediated code snippet")
    unified_diff: str = Field(..., description="Standard unified git diff patch")
    explanation: str = Field(..., description="Rationale for why this code patch resolves the error")
    regression_tests: Optional[str] = Field(None, description="Suggested automated tests to prevent regression")

    model_config = ConfigDict(from_attributes=True)


class TokenUsageStats(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class StageResult(BaseModel):
    stage_name: str
    status: str
    summary: str
    duration_ms: float = 0.0


class StructuredAIResponse(BaseModel):
    incident_id: str = Field(..., description="Incident or check correlation identifier")
    title: str = Field(..., description="Concise technical incident headline")
    severity: str = Field(..., description="CRITICAL, ERROR, WARNING, or INFO")
    error_category: str = Field(
        "Backend",
        description="Classification: Authentication, Database, Network, API, Frontend, Backend, Deployment, Infrastructure, Performance, Configuration"
    )
    summary: str = Field(..., description="Executive technical summary of the failure event")
    observed_facts: List[str] = Field(default_factory=list, description="Confirmed empirical facts from telemetry")
    probable_root_causes: List[ProbableRootCause] = Field(default_factory=list)
    affected_services: List[str] = Field(default_factory=list)
    supporting_evidence: List[EvidenceCitation] = Field(default_factory=list)
    missing_information: List[str] = Field(default_factory=list, description="Additional context required if root cause cannot be confirmed")
    immediate_actions: List[str] = Field(default_factory=list, description="Immediate mitigations to restore service")
    permanent_solution: str = Field(..., description="Architectural or permanent resolution")
    code_fixes: List[CodeFixProposal] = Field(default_factory=list)
    verification_steps: List[str] = Field(default_factory=list, description="Actionable verification checklist post-fix")
    prevention_measures: List[str] = Field(default_factory=list, description="Long-term prevention policies")
    requires_human_review: bool = Field(True, description="Strict safety gate: requires user approval before execution")
    stages: List[StageResult] = Field(default_factory=list)
    model_name: str = "gemini-2.5-flash"
    token_usage: TokenUsageStats = Field(default_factory=TokenUsageStats)
    analysis_duration_ms: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


# AI Copilot Schemas
class AICopilotMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text (Markdown supported)")
    timestamp: Optional[str] = None
    evidence_citations: List[EvidenceCitation] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)


class AICopilotChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question or prompt for Copilot")
    project_id: Optional[str] = None
    incident_id: Optional[str] = None
    website_id: Optional[str] = None
    history: List[AICopilotMessage] = Field(default_factory=list)


class AICopilotChatResponse(BaseModel):
    reply: str
    evidence_citations: List[EvidenceCitation] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    code_snippets: List[Dict[str, str]] = Field(default_factory=list)
    model_name: str = "gemini-2.5-flash"
    latency_ms: float = 0.0


# AI Admin Configuration Schemas
class AIConfigResponse(BaseModel):
    gemini_status: str
    gemini_model: str
    ai_enabled: bool
    ai_auto_analysis: bool
    ai_confidence_threshold: float
    api_key_masked: Optional[str] = None
    available_models: List[str] = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash-lite",
        "gemini-3.8-flash",
    ]
    total_analyses_count: int = 0
    total_tokens_consumed: int = 0
    daily_request_count: int = 0
    daily_budget_limit: int = 1000
    last_test_result: Optional[str] = None


class AIConfigUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    ai_enabled: Optional[bool] = None
    ai_auto_analysis: Optional[bool] = None
    ai_confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class AIConnectionTestResponse(BaseModel):
    success: bool
    status: str
    model: str
    latency_ms: float
    message: str
