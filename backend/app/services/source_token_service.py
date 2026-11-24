import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List
from fastapi import HTTPException, Security, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.models.source import LogSource
from app.models.ingestion_token import IngestionToken
from app.core.logging import logger

security_scheme = HTTPBearer(auto_error=False)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def hash_token(raw_token: str) -> str:
    """Computes a cryptographically secure SHA-256 digest of the raw token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class SourceTokenService:
    """Manages source-specific ingestion credentials with cryptographic hashing and verification."""

    @classmethod
    def create_token(
        cls,
        db: Session,
        source_id: str,
        name: str,
        expires_in_days: Optional[int] = None,
    ) -> Tuple[IngestionToken, str]:
        """
        Generates a new secure ingestion token for a source.
        Returns the persistent IngestionToken record and the plaintext token (shown only once).
        """
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Log source {source_id} not found."
            )

        # Token format: lp_live_<random_bytes_hex>
        raw_secret = secrets.token_hex(24)
        raw_token = f"lp_live_{raw_secret}"
        prefix = raw_token[:12]
        digest = hash_token(raw_token)

        expires_at = None
        if expires_in_days:
            expires_at = utc_now() + timedelta(days=expires_in_days)

        token_record = IngestionToken(
            source_id=source_id,
            token_prefix=prefix,
            token_hash=digest,
            name=name,
            created_at=utc_now(),
            expires_at=expires_at,
            is_active=True,
        )
        db.add(token_record)
        db.commit()
        db.refresh(token_record)

        return token_record, raw_token

    @classmethod
    def verify_token(cls, db: Session, raw_token: str) -> Tuple[LogSource, IngestionToken]:
        """
        Validates raw token against stored digests using constant-time comparison.
        Ensures the token is active, unexpired, and its associated source is enabled.
        """
        if not raw_token or not raw_token.startswith("lp_live_"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or malformed ingestion token format.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        computed_hash = hash_token(raw_token)
        # Query by prefix for fast lookup
        prefix = raw_token[:12]
        candidates: List[IngestionToken] = db.query(IngestionToken).filter(
            IngestionToken.token_prefix == prefix,
            IngestionToken.is_active == True,
            IngestionToken.revoked_at.is_(None),
        ).all()

        matching_token: Optional[IngestionToken] = None
        for cand in candidates:
            if hmac.compare_digest(cand.token_hash, computed_hash):
                matching_token = cand
                break

        if not matching_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid ingestion token or token revoked.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check expiration
        if matching_token.expires_at and ensure_utc(matching_token.expires_at) < utc_now():
            matching_token.is_active = False
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ingestion token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check associated source
        source = db.query(LogSource).filter(LogSource.id == matching_token.source_id).first()
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Log source associated with token does not exist."
            )

        if not source.ingestion_enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Ingestion is currently disabled for source '{source.name}'."
            )

        # Update last used timestamp
        try:
            matching_token.last_used_at = utc_now()
            source.last_seen_at = utc_now()
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to update token last_used_at: {e}")

        return source, matching_token

    @classmethod
    def revoke_token(cls, db: Session, source_id: str, token_id: str) -> IngestionToken:
        token = db.query(IngestionToken).filter(
            IngestionToken.id == token_id,
            IngestionToken.source_id == source_id,
        ).first()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ingestion token {token_id} not found."
            )
        token.is_active = False
        token.revoked_at = utc_now()
        db.commit()
        db.refresh(token)
        return token

    @classmethod
    def rotate_token(cls, db: Session, source_id: str, token_id: str) -> Tuple[IngestionToken, str]:
        old_token = db.query(IngestionToken).filter(
            IngestionToken.id == token_id,
            IngestionToken.source_id == source_id,
        ).first()
        if not old_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ingestion token {token_id} not found."
            )

        # Revoke old token
        old_token.is_active = False
        old_token.revoked_at = utc_now()

        # Create new token with same name and lifespan if applicable
        raw_secret = secrets.token_hex(24)
        new_raw_token = f"lp_live_{raw_secret}"
        new_prefix = new_raw_token[:12]
        new_digest = hash_token(new_raw_token)

        new_expires_at = None
        if old_token.expires_at and old_token.created_at:
            lifespan = old_token.expires_at - old_token.created_at
            new_expires_at = utc_now() + lifespan

        new_token = IngestionToken(
            source_id=source_id,
            token_prefix=new_prefix,
            token_hash=new_digest,
            name=f"{old_token.name} (Rotated)",
            created_at=utc_now(),
            expires_at=new_expires_at,
            is_active=True,
        )
        db.add(new_token)
        db.commit()
        db.refresh(new_token)

        return new_token, new_raw_token

    @classmethod
    def list_tokens(cls, db: Session, source_id: str) -> List[IngestionToken]:
        return db.query(IngestionToken).filter(
            IngestionToken.source_id == source_id
        ).order_by(IngestionToken.created_at.desc()).all()


def get_authenticated_source(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Tuple[LogSource, IngestionToken]:
    """FastAPI security dependency to authenticate ingestion requests."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization: Bearer <TOKEN> header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return SourceTokenService.verify_token(db, auth.credentials)
