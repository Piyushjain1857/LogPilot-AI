from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TokenCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128, description="Friendly descriptive name for the token")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Optional lifespan in days")


class TokenCreatedResponse(BaseModel):
    id: str
    source_id: str
    name: str
    token_prefix: str
    token: str = Field(..., description="Plaintext token displayed ONCE upon creation. Store securely.")
    created_at: datetime
    expires_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    id: str
    source_id: str
    name: str
    token_prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    is_active: bool


class TokenRotateResponse(BaseModel):
    id: str
    source_id: str
    name: str
    token_prefix: str
    token: str = Field(..., description="Newly generated plaintext token displayed ONCE.")
    created_at: datetime
    expires_at: Optional[datetime] = None
