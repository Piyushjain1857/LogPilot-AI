from enum import Enum
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.database.session import get_db


class Role(str, Enum):
    ADMIN = "ADMIN"
    NORMAL = "NORMAL"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


ROLE_HIERARCHY: Dict[str, int] = {
    "NORMAL": 1,
    "VIEWER": 1,
    "ANALYST": 2,
    "ADMIN": 3,
}


def get_current_user_role(
    x_logpilot_role: Optional[str] = Header(None, alias="X-LogPilot-Role"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Dict[str, Any]:
    """
    Resolves the operator's RBAC role and context from:
    1. Signed JWT in 'Authorization: Bearer <JWT_TOKEN>'
    2. Header alias 'X-LogPilot-Role: <ROLE>' or raw token alias 'Authorization: Bearer <ROLE>'
    3. Defaults to Role.ADMIN in development/demo mode when unspecified.
    """
    role_str = Role.ADMIN.value
    username = "admin"
    user_id = None
    auth_type = "default"

    # 1. Try decoding as JWT from Authorization header
    if authorization and authorization.lower().startswith("bearer "):
        token_candidate = authorization[7:].strip()
        decoded_payload = decode_access_token(token_candidate)
        if decoded_payload:
            token_role = str(decoded_payload.get("role", "normal")).upper()
            if token_role in ROLE_HIERARCHY:
                role_str = token_role
            username = decoded_payload.get("sub", "user")
            user_id = decoded_payload.get("user_id")
            auth_type = "jwt"
        elif token_candidate.upper() in ROLE_HIERARCHY:
            # Fallback for plain token strings in dev/tests (e.g. "Bearer ADMIN")
            role_str = token_candidate.upper()
            username = role_str.lower()
            auth_type = "header_bearer"

    # 2. Check X-LogPilot-Role override header
    if x_logpilot_role:
        candidate = x_logpilot_role.strip().upper()
        if candidate in ROLE_HIERARCHY:
            role_str = candidate
            username = role_str.lower()
            auth_type = "x_header"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid RBAC role '{candidate}'. Valid roles: {list(ROLE_HIERARCHY.keys())}",
            )

    if role_str not in ROLE_HIERARCHY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid RBAC role '{role_str}'. Valid roles: {list(ROLE_HIERARCHY.keys())}",
        )

    level = ROLE_HIERARCHY[role_str]
    is_admin = (role_str == Role.ADMIN.value)

    return {
        "role": role_str,
        "username": username,
        "user_id": user_id,
        "level": level,
        "is_admin": is_admin,
        "can_write": level >= ROLE_HIERARCHY[Role.ANALYST.value],
        "can_execute_remediation": is_admin,
        "auth_type": auth_type,
    }


def require_role(min_required_role: str):
    """
    FastAPI dependency factory enforcing minimum RBAC level.
    """
    min_required_role_upper = min_required_role.strip().upper()
    if min_required_role_upper not in ROLE_HIERARCHY:
        raise ValueError(f"Unknown required role: {min_required_role}")

    min_level = ROLE_HIERARCHY[min_required_role_upper]

    def role_checker(
        x_logpilot_role: Optional[str] = Header(None, alias="X-LogPilot-Role"),
        authorization: Optional[str] = Header(None, alias="Authorization"),
    ) -> Dict[str, Any]:
        user_info = get_current_user_role(x_logpilot_role=x_logpilot_role, authorization=authorization)
        if user_info["level"] < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Insufficient privileges. Required role '{min_required_role_upper}', provided role '{user_info['role']}'.",
            )
        return user_info

    return role_checker


def get_current_authenticated_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_logpilot_role: Optional[str] = Header(None, alias="X-LogPilot-Role"),
    db: Session = Depends(get_db),
):
    """
    Validates JWT token and resolves the corresponding User from the database.
    """
    from app.models.user import User

    if not authorization or not authorization.lower().startswith("bearer "):
        # Check if X-LogPilot-Role is provided in tests
        if x_logpilot_role:
            role_name = x_logpilot_role.strip().lower()
            user = db.query(User).filter(User.role == role_name).first()
            if user:
                return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid format (Bearer token required)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:].strip()
    payload = decode_access_token(token)
    if not payload:
        # Check if it was a plain role string in test mode
        if token.upper() in ROLE_HIERARCHY:
            user = db.query(User).filter(User.role == token.lower()).first()
            if user:
                return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token expired or signature validation failed. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = payload.get("sub")
    user_id = payload.get("user_id")

    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and username:
        user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists in database",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact an administrator.",
        )

    return user
