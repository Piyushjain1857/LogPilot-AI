from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.source import LogSource
from app.schemas.ingestion_token import (
    TokenCreateRequest,
    TokenCreatedResponse,
    TokenResponse,
    TokenRotateResponse,
)
from app.schemas.streaming import SourceHealthResponse
from app.services.source_token_service import SourceTokenService
from app.services.source_health_service import SourceHealthService

router = APIRouter(prefix="/log-sources", tags=["Source Tokens & Health"])


@router.post(
    "/{source_id}/tokens",
    status_code=status.HTTP_201_CREATED,
    response_model=TokenCreatedResponse,
    summary="Generate a source-specific ingestion credential",
)
def create_source_token(
    source_id: str,
    req: TokenCreateRequest,
    db: Session = Depends(get_db),
):
    token_record, raw_token = SourceTokenService.create_token(
        db=db,
        source_id=source_id,
        name=req.name,
        expires_in_days=req.expires_in_days,
    )
    return TokenCreatedResponse(
        id=token_record.id,
        source_id=token_record.source_id,
        name=token_record.name,
        token_prefix=token_record.token_prefix,
        token=raw_token,
        created_at=token_record.created_at,
        expires_at=token_record.expires_at,
    )


@router.get(
    "/{source_id}/tokens",
    response_model=List[TokenResponse],
    summary="List active and historical tokens for a source (safe metadata)",
)
def list_source_tokens(
    source_id: str,
    db: Session = Depends(get_db),
):
    tokens = SourceTokenService.list_tokens(db=db, source_id=source_id)
    return [
        TokenResponse(
            id=t.id,
            source_id=t.source_id,
            name=t.name,
            token_prefix=t.token_prefix,
            created_at=t.created_at,
            last_used_at=t.last_used_at,
            expires_at=t.expires_at,
            revoked_at=t.revoked_at,
            is_active=t.is_active,
        )
        for t in tokens
    ]


@router.post(
    "/{source_id}/tokens/{token_id}/revoke",
    response_model=TokenResponse,
    summary="Revoke an ingestion token",
)
def revoke_source_token(
    source_id: str,
    token_id: str,
    db: Session = Depends(get_db),
):
    revoked = SourceTokenService.revoke_token(db=db, source_id=source_id, token_id=token_id)
    return TokenResponse(
        id=revoked.id,
        source_id=revoked.source_id,
        name=revoked.name,
        token_prefix=revoked.token_prefix,
        created_at=revoked.created_at,
        last_used_at=revoked.last_used_at,
        expires_at=revoked.expires_at,
        revoked_at=revoked.revoked_at,
        is_active=revoked.is_active,
    )


@router.post(
    "/{source_id}/tokens/{token_id}/rotate",
    response_model=TokenRotateResponse,
    summary="Rotate an ingestion token securely",
)
def rotate_source_token(
    source_id: str,
    token_id: str,
    db: Session = Depends(get_db),
):
    new_token, raw_token = SourceTokenService.rotate_token(db=db, source_id=source_id, token_id=token_id)
    return TokenRotateResponse(
        id=new_token.id,
        source_id=new_token.source_id,
        name=new_token.name,
        token_prefix=new_token.token_prefix,
        token=raw_token,
        created_at=new_token.created_at,
        expires_at=new_token.expires_at,
    )


@router.patch(
    "/{source_id}/ingestion-status",
    summary="Enable or disable real-time ingestion for a log source",
)
def update_ingestion_status(
    source_id: str,
    enabled: bool,
    db: Session = Depends(get_db),
):
    source = db.query(LogSource).filter(LogSource.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log source {source_id} not found."
        )
    source.ingestion_enabled = enabled
    source.connection_status = "ACTIVE" if enabled else "DISABLED"
    db.commit()
    return {
        "source_id": source.id,
        "name": source.name,
        "ingestion_enabled": source.ingestion_enabled,
        "connection_status": source.connection_status,
    }


@router.get(
    "/{source_id}/health",
    response_model=SourceHealthResponse,
    summary="Retrieve real-time observed connection health and activity",
)
def get_source_health(
    source_id: str,
    db: Session = Depends(get_db),
):
    source = db.query(LogSource).filter(LogSource.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log source {source_id} not found."
        )

    computed_status = SourceHealthService.compute_connection_status(source)
    # Persist updated computed status if changed
    if source.connection_status != computed_status:
        source.connection_status = computed_status
        db.commit()

    return SourceHealthResponse(
        source_id=source.id,
        name=source.name,
        service_name=source.service_name,
        source_type=source.source_type,
        status=source.status,
        connection_status=computed_status,
        ingestion_enabled=source.ingestion_enabled,
        last_seen_at=source.last_seen_at,
        last_ingested_at=source.last_ingested_at,
        last_error_at=source.last_error_at,
        last_error_message=source.last_error_message,
        total_ingested_records=source.total_ingested_records or 0,
        total_failed_records=source.total_failed_records or 0,
    )
