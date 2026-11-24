import json
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.rbac import require_role, Role
from app.services.remediation_service import remediation_service, SecurityError
from app.schemas.remediation import (
    PlaybookResponse,
    PlaybookCreate,
    PlaybookRecommendation,
    StepApprovalRequest,
    SimulationRequest,
    SimulationResponse,
    RollbackRequest,
    RollbackResponse,
    AuditLogResponse,
)

router = APIRouter()


class RecommendRequest(BaseModel):
    incident_id: str


def _format_playbook_response(pb: Any) -> Dict[str, Any]:
    steps = json.loads(pb.steps_json) if isinstance(pb.steps_json, str) else (pb.steps_json or [])
    simulation_log = json.loads(pb.simulation_log_json) if isinstance(pb.simulation_log_json, str) else (pb.simulation_log_json or [])
    return {
        "id": pb.id,
        "playbook_number": pb.playbook_number,
        "title": pb.title,
        "slug": pb.slug,
        "category": pb.category,
        "description": pb.description,
        "target_service": pb.target_service,
        "risk_level": pb.risk_level,
        "estimated_downtime": pb.estimated_downtime,
        "incident_id": pb.incident_id,
        "approval_status": pb.approval_status,
        "execution_status": pb.execution_status,
        "steps": steps,
        "simulation_log": simulation_log,
        "created_at": pb.created_at,
        "updated_at": pb.updated_at,
    }


@router.get("/playbooks", response_model=List[PlaybookResponse])
def get_playbooks(
    category: Optional[str] = Query(None, description="DATABASE, CONTAINER, CIRCUIT_BREAKER, CACHE, NETWORK, STORAGE"),
    risk_level: Optional[str] = Query(None, description="SAFE, CAUTION, CRITICAL_DESTRUCTIVE"),
    search: Optional[str] = Query(None, description="Search keyword"),
    incident_id: Optional[str] = Query(None, description="Filter by bound incident"),
    db: Session = Depends(get_db),
):
    """Lists all available runbooks with optional category and risk filters."""
    playbooks = remediation_service.list_playbooks(
        db,
        category=category,
        risk_level=risk_level,
        search=search,
        incident_id=incident_id,
    )
    return [_format_playbook_response(pb) for pb in playbooks]


@router.get("/playbooks/{playbook_id}", response_model=PlaybookResponse)
def get_playbook(playbook_id: str, db: Session = Depends(get_db)):
    """Retrieves full playbook details and operational steps."""
    playbook = remediation_service.get_playbook(db, playbook_id)
    if not playbook:
        raise HTTPException(status_code=404, detail=f"Playbook {playbook_id} not found")
    return _format_playbook_response(playbook)


@router.post("/playbooks", response_model=PlaybookResponse)
def create_playbook(data: PlaybookCreate, db: Session = Depends(get_db)):
    """Registers a customized operational remediation runbook."""
    playbook = remediation_service.create_playbook(db, data.dict())
    return _format_playbook_response(playbook)


@router.post("/recommend", response_model=List[PlaybookRecommendation])
def recommend_playbooks(request: RecommendRequest, db: Session = Depends(get_db)):
    """Evaluates an incident's symptoms and ranks relevant mitigation runbooks."""
    recommendations = remediation_service.recommend_playbooks(db, request.incident_id)
    return [
        {
            "playbook": _format_playbook_response(rec["playbook"]),
            "match_score": rec["match_score"],
            "match_reasons": rec["match_reasons"],
            "confidence": rec["confidence"],
        }
        for rec in recommendations
    ]


@router.post("/playbooks/{playbook_id}/approve", response_model=PlaybookResponse)
def approve_step(
    playbook_id: str,
    request: StepApprovalRequest,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role(Role.ADMIN.value)),
):
    """Toggles human-in-the-loop approval gate for a specific playbook step."""
    try:
        updated_playbook = remediation_service.update_step_approval(
            db,
            playbook_id=playbook_id,
            step_number=request.step_number,
            approved=request.approved,
            approver_note=request.approver_note,
            performed_by=request.performed_by or "sre-operator",
        )
        return _format_playbook_response(updated_playbook)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/playbooks/{playbook_id}/simulate", response_model=SimulationResponse)
def simulate_playbook(
    playbook_id: str,
    request: SimulationRequest,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role(Role.ADMIN.value)),
):
    """Executes safe dry-run simulation of approved steps in the sandbox environment."""
    try:
        res = remediation_service.simulate_playbook(
            db,
            playbook_id=playbook_id,
            dry_run=request.dry_run,
            enforce_approvals=request.enforce_approvals,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SecurityError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/playbooks/{playbook_id}/rollback", response_model=RollbackResponse)
def rollback_playbook(
    playbook_id: str,
    request: RollbackRequest,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(require_role(Role.ADMIN.value)),
):
    """Executes compensating rollback actions for previously simulated/completed steps."""
    try:
        res = remediation_service.rollback_playbook(
            db,
            playbook_id=playbook_id,
            steps_to_rollback=request.steps_to_rollback,
            performed_by=request.performed_by or "sre-operator",
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/playbooks/{playbook_id}/export")
def export_playbook(
    playbook_id: str,
    format: str = Query("yaml", description="yaml, ansible, or shell"),
    db: Session = Depends(get_db),
):
    """Generates deployable automation manifests (Kubernetes YAML, Ansible, or Bash)."""
    try:
        content = remediation_service.export_playbook(db, playbook_id, export_format=format)
        media_type = "text/x-shellscript" if format.lower() in ("shell", "bash") else "application/x-yaml"
        return Response(content=content, media_type=media_type)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    playbook_id: Optional[str] = Query(None, description="Filter by playbook ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieves immutable audit trail of operator approval and simulation events."""
    logs = remediation_service.get_audit_logs(db, playbook_id=playbook_id, limit=limit)
    return [
        {
            "id": l.id,
            "playbook_id": l.playbook_id,
            "action": l.action,
            "step_number": l.step_number,
            "performed_by": l.performed_by,
            "details": json.loads(l.details_json) if isinstance(l.details_json, str) else (l.details_json or {}),
            "created_at": l.created_at,
        }
        for l in logs
    ]
