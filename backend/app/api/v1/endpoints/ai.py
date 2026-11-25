from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.services.gemini_engine import GeminiEngine
from app.schemas.ai import (
    StructuredAIResponse,
    AICopilotChatRequest,
    AICopilotChatResponse,
    AIConfigResponse,
    AIConfigUpdate,
    AIConnectionTestResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Engine & Copilot"])


@router.post("/analyze-incident", response_model=StructuredAIResponse)
def analyze_incident_with_gemini(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    """
    Executes the 5-stage Generative AI debugging pipeline:
    Stage A (Error Classification) -> Stage B (RAG & Evidence Context) ->
    Stage C (Gemini Root Cause Investigation) -> Stage D (Solution & Code Diff Formulation) ->
    Stage E (Independent Verification & Safety Gating).
    """
    incident_id = payload.get("incident_id") or "INC-001"
    website_id = payload.get("website_id")
    error_context = payload.get("error_context")

    try:
        response = GeminiEngine.analyze_incident(
            db=db,
            incident_id=incident_id,
            website_id=website_id,
            error_context=error_context,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI diagnostic failure: {str(e)}")


@router.post("/chat", response_model=AICopilotChatResponse)
def chat_with_copilot(
    request: AICopilotChatRequest,
    db: Session = Depends(get_db),
):
    """
    AI Troubleshooting Copilot.
    Provides streaming-ready conversational diagnostics grounded in verified telemetry and runbooks.
    """
    try:
        return GeminiEngine.chat_copilot(db=db, request=request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot service error: {str(e)}")


@router.get("/config", response_model=AIConfigResponse)
def get_ai_configuration():
    """
    Retrieves administrator AI configuration, model tier, masked credentials, and usage statistics.
    """
    return GeminiEngine.get_ai_config()


@router.put("/config", response_model=AIConfigResponse)
def update_ai_configuration(update: AIConfigUpdate):
    """
    Updates administrator AI configuration (model, key, auto-analysis toggle, confidence threshold).
    """
    if update.gemini_api_key is not None:
        settings.GEMINI_API_KEY = update.gemini_api_key.strip()
    if update.gemini_model is not None:
        settings.GEMINI_MODEL = update.gemini_model
    if update.ai_enabled is not None:
        settings.AI_ENABLED = update.ai_enabled
    if update.ai_auto_analysis is not None:
        settings.AI_AUTO_ANALYSIS = update.ai_auto_analysis
    if update.ai_confidence_threshold is not None:
        settings.AI_CONFIDENCE_THRESHOLD = update.ai_confidence_threshold

    return GeminiEngine.get_ai_config()


@router.post("/test-connection", response_model=AIConnectionTestResponse)
def test_gemini_connection():
    """
    Verifies live connectivity to the Google Gemini API with the configured model and measures latency.
    """
    return GeminiEngine.test_connection()


@router.get("/history", response_model=List[StructuredAIResponse])
def get_ai_analysis_history():
    """
    Retrieves in-memory history of recent Generative AI incident analyses.
    """
    return GeminiEngine.get_analysis_history()
