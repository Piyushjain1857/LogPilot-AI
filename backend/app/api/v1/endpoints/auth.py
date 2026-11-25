from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut, DemoAccount, DemoLoginRequest
from app.core.security import verify_password, hash_password, create_access_token
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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(reg_req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user account with role selection ('normal' or 'admin') and returns a signed JWT.
    """
    username = reg_req.username.strip()
    email = reg_req.email.strip().lower()

    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long.",
        )

    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required.",
        )

    if len(reg_req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    # Check for existing user
    existing = db.query(User).filter(
        or_(
            User.username == username,
            User.email == email,
        )
    ).first()

    if existing:
        if existing.username == username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{username}' is already taken. Please choose another.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{email}' already exists.",
            )

    role = (reg_req.role or "normal").strip().lower()
    if role not in ("admin", "normal"):
        role = "normal"

    pwd_hash, salt = hash_password(reg_req.password)
    new_user = User(
        username=username,
        email=email,
        hashed_password=pwd_hash,
        salt=salt,
        role=role,
        full_name=reg_req.full_name or username.capitalize(),
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_claims = {
        "sub": new_user.username,
        "user_id": new_user.id,
        "role": new_user.role.lower(),
        "email": new_user.email,
    }
    access_token = create_access_token(data=token_claims)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=new_user.role.lower(),
        user=UserOut.model_validate(new_user),
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


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(demo_req: DemoLoginRequest, db: Session = Depends(get_db)):
    """
    Secure isolated 1-click evaluation demo login.
    Issues signed JWT for Administrator or Analyst without exposing credentials in frontend source code.
    """
    requested_role = demo_req.role.strip().lower()
    if requested_role in ("admin", "administrator"):
        target_username = "admin"
    else:
        target_username = "operator"

    user = db.query(User).filter(User.username == target_username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pre-seeded demo user for role '{requested_role}' not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo account is deactivated.",
        )

    token_claims = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role.lower(),
        "email": user.email,
        "is_demo": True,
    }
    access_token = create_access_token(data=token_claims)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role.lower(),
        user=UserOut.model_validate(user),
    )


@router.get("/demo-accounts")
def get_demo_accounts():
    """
    Provides pre-seeded demo metadata for instant 1-click evaluation of both
    'admin' and 'analyst' (normal) roles without exposing raw credentials.
    """
    return {
        "accounts": [
            {
                "username": "admin",
                "role": "admin",
                "label": "Administrator",
                "description": "Full platform control: system settings, incident remediation, telemetry export, and cluster policies.",
            },
            {
                "username": "operator",
                "role": "normal",
                "label": "Analyst",
                "description": "Operational observability: live streaming, logs, distributed traces, and root cause diagnosis.",
            },
        ]
    }
