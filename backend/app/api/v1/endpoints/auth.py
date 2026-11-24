from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut, DemoAccount
from app.core.security import verify_password, create_access_token
from app.core.rbac import get_current_authenticated_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user with username/email and password, returning a signed JWT token.
    Supports both 'admin' and 'normal' roles.
    """
    identifier = login_req.username.strip()
    user = db.query(User).filter(
        or_(
            User.username == identifier,
            User.email == identifier.lower(),
        )
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(login_req.password, user.hashed_password, user.salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact an administrator.",
        )

    # Issue signed JWT with standard claims
    token_claims = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role.lower(),
        "email": user.email,
    }
    access_token = create_access_token(data=token_claims)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role.lower(),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_current_profile(current_user: User = Depends(get_current_authenticated_user)):
    """
    Returns the authenticated user's profile and active role based on JWT.
    """
    return UserOut.model_validate(current_user)


@router.post("/logout")
def logout():
    """
    Stateless JWT logout confirmation. Client drops token from storage.
    """
    return {
        "status": "success",
        "message": "Session terminated successfully.",
    }


@router.get("/demo-accounts")
def get_demo_accounts():
    """
    Provides pre-seeded demo credentials for instant 1-click evaluation of both
    'admin' and 'normal' roles.
    """
    return {
        "accounts": [
            {
                "username": "admin",
                "password": "Admin@LogPilot2026!",
                "role": "admin",
                "label": "Administrator",
                "description": "Full platform control: system settings, incident remediation, telemetry export, and cluster policies.",
            },
            {
                "username": "operator",
                "password": "Operator@LogPilot2026!",
                "role": "normal",
                "label": "Normal User / Operator",
                "description": "Operational observability: live streaming, logs, distributed traces, and root cause diagnosis.",
            },
        ]
    }
