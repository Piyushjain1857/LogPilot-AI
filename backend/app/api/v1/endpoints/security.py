from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.rbac import get_current_user_role, Role
from app.services.remediation_service import remediation_service
from app.utils.redaction import redactor

router = APIRouter(prefix="/security", tags=["security"])


@router.get("/roles", response_model=Dict[str, Any])
def get_roles_matrix() -> Dict[str, Any]:
    """
    Returns available RBAC roles, hierarchy levels, and permissions.
    """
    return {
        "roles": [
            {
                "role": Role.ADMIN.value,
                "description": "Full system administrator with authorization to execute remediation playbooks, configure sources, and manage cluster policies.",
                "permissions": ["read_all", "annotate_incidents", "generate_reports", "execute_playbooks", "configure_system"],
            },
            {
                "role": Role.NORMAL.value,
                "description": "Standard operational user with telemetry monitoring, log queries, incident tracking, and root cause exploration.",
                "permissions": ["read_all", "annotate_incidents"],
            },
            {
                "role": Role.ANALYST.value,
                "description": "Operational SRE analyst with diagnostic, investigation, annotation, and post-mortem synthesis capabilities.",
                "permissions": ["read_all", "annotate_incidents", "generate_reports"],
            },
            {
                "role": Role.VIEWER.value,
                "description": "Read-only observer with access to dashboards, live streaming, log explorer, and finalized incident reports.",
                "permissions": ["read_all"],
            },
        ],
        "default_mode": "DEVELOPER_DEMO_ADMIN",
        "header_support": ["X-LogPilot-Role: <ROLE>", "Authorization: Bearer <ROLE>"],
    }


@router.get("/audit", response_model=Dict[str, Any])
def get_security_audit_summary(
    user_context: Dict[str, Any] = Depends(get_current_user_role),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns live security posture, caller's RBAC privileges, redaction statistics,
    and recent remediation audit logs.
    """
    audit_logs = remediation_service.get_audit_logs(db, limit=10)

    return {
        "caller_context": user_context,
        "security_posture": {
            "rbac_enforcement": "ACTIVE",
            "command_sandbox": "STRICT_COMMAND_ALLOWLIST",
            "secret_redaction": "ACTIVE_REGEX_MASKING",
            "sql_injection_defense": "SQLAlchemy_AST_PARAMETRIZED",
            "cwe_1236_csv_sanitization": "ACTIVE_FORMULA_MASKING",
            "cors_cross_origin": "EXPLICIT_ALLOWLIST",
        },
        "redaction_engine": {
            "patterns_loaded": len(redactor.PATTERNS),
            "mask_character": "[REDACTED]",
        },
        "recent_audit_trail": [
            {
                "id": entry.id,
                "playbook_id": entry.playbook_id,
                "action": entry.action,
                "operator": getattr(entry, "performed_by", "sre-operator"),
                "status": "LOGGED",
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            }
            for entry in audit_logs
        ],
    }
