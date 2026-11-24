from enum import Enum
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException, status


class Role(str, Enum):
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


ROLE_HIERARCHY: Dict[str, int] = {
    Role.VIEWER.value: 1,
    Role.ANALYST.value: 2,
    Role.ADMIN.value: 3,
}


def get_current_user_role(
    x_logpilot_role: Optional[str] = Header(None, alias="X-LogPilot-Role"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Dict[str, Any]:
    """
    Resolves the operator's RBAC role from HTTP headers.
    Supports 'X-LogPilot-Role: <ROLE>' or 'Authorization: Bearer <ROLE>'.
    Defaults to Role.ADMIN in development/demo mode when unspecified.
    """
    role_str = Role.ADMIN.value

    if x_logpilot_role:
        role_str = x_logpilot_role.strip().upper()
    elif authorization and authorization.lower().startswith("bearer "):
        token_candidate = authorization[7:].strip().upper()
        if token_candidate in ROLE_HIERARCHY:
            role_str = token_candidate

    if role_str not in ROLE_HIERARCHY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid RBAC role '{role_str}'. Valid roles: {list(ROLE_HIERARCHY.keys())}",
        )

    return {
        "role": role_str,
        "level": ROLE_HIERARCHY[role_str],
        "is_admin": role_str == Role.ADMIN.value,
        "can_write": ROLE_HIERARCHY[role_str] >= ROLE_HIERARCHY[Role.ANALYST.value],
        "can_execute_remediation": role_str == Role.ADMIN.value,
    }


def require_role(min_required_role: str):
    """
    FastAPI dependency factory enforcing minimum RBAC level.
    """
    min_required_role = min_required_role.upper()
    if min_required_role not in ROLE_HIERARCHY:
        raise ValueError(f"Unknown required role: {min_required_role}")

    min_level = ROLE_HIERARCHY[min_required_role]

    def role_checker(
        x_logpilot_role: Optional[str] = Header(None, alias="X-LogPilot-Role"),
        authorization: Optional[str] = Header(None, alias="Authorization"),
    ) -> Dict[str, Any]:
        user_info = get_current_user_role(x_logpilot_role=x_logpilot_role, authorization=authorization)
        if user_info["level"] < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Insufficient privileges. Required role '{min_required_role}', provided role '{user_info['role']}'.",
            )
        return user_info

    return role_checker
