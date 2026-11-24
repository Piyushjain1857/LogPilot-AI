from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.assistant_service import assistant_service
from app.schemas.report import ChatRequest, ChatResponse

router = APIRouter(prefix="/assistant", tags=["AI SRE Assistant"])


class QueryTranslationRequest(BaseModel):
    query: str


class QueryTranslationResponse(BaseModel):
    natural_query: str
    translated_query: str


@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    """Conversational SRE Assistant interface grounded in live telemetry."""
    return assistant_service.handle_chat(
        db=db,
        message=request.message,
        incident_id=request.context_incident_id,
    )


@router.post("/translate-query", response_model=QueryTranslationResponse)
def translate_query(request: QueryTranslationRequest):
    """Translates natural language questions into LogPilot Boolean Query Syntax."""
    translated = assistant_service.translate_query(request.query)
    return {
        "natural_query": request.query,
        "translated_query": translated,
    }
