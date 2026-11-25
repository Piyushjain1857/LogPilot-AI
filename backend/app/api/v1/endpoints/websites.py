import uuid
import json
import asyncio
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.website import MonitoredWebsite, WebsiteCheckResult, WebsiteSDKEvent
from app.schemas.website import (
    WebsiteCreate,
    WebsiteUpdate,
    WebsiteResponse,
    WebsiteListResponse,
    WebsiteCheckResultSchema,
    WebsiteSDKEventSchema,
    SDKBatchIngestRequest,
    SDKTelemetryEvent,
    SDKIngestResponse,
    AIDiagnosticResponse,
    GitHubPatchResponse,
)
from app.services.website_monitor import WebsiteMonitorService
from app.core.logging import logger

router = APIRouter(prefix="/websites", tags=["websites"])


@router.post("", response_model=WebsiteResponse, status_code=status.HTTP_201_CREATED)
async def create_website(
    payload: WebsiteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Connect a new website for continuous live monitoring and telemetry ingestion.
    Generates a secure, project-scoped ingestion key (`lp_live_...`).
    """
    # Pre-validate SSRF safety
    is_safe, resolved_ip, err = WebsiteMonitorService.is_ssrf_safe(payload.url, allow_local=True)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid website URL: {err}",
        )

    # Generate ingestion key
    ingestion_key = f"lp_live_{uuid.uuid4().hex}"

    website = MonitoredWebsite(
        name=payload.name.strip(),
        url=payload.url.strip(),
        ingestion_key=ingestion_key,
        interval_seconds=payload.interval_seconds,
        check_ssl=payload.check_ssl,
        check_dns=payload.check_dns,
        expected_status_code=payload.expected_status_code,
        timeout_seconds=payload.timeout_seconds,
        github_repo=payload.github_repo,
        github_branch=payload.github_branch or "main",
    )
    db.add(website)
    db.commit()
    db.refresh(website)

    # Run immediate initial probe check
    try:
        await WebsiteMonitorService.perform_website_check(db, website)
        db.refresh(website)
    except Exception as e:
        logger.warning(f"Initial check on {website.url} encountered error: {e}")

    return website


@router.get("", response_model=WebsiteListResponse)
def list_websites(
    db: Session = Depends(get_db),
):
    """
    List all connected websites along with aggregated health metrics.
    """
    sites = db.query(MonitoredWebsite).order_by(desc(MonitoredWebsite.created_at)).all()
    
    online = sum(1 for s in sites if s.last_status == "up")
    offline = sum(1 for s in sites if s.last_status == "down")
    degraded = sum(1 for s in sites if s.last_status == "degraded")

    return WebsiteListResponse(
        websites=sites,
        total_count=len(sites),
        online_count=online,
        offline_count=offline,
        degraded_count=degraded,
    )


@router.get("/{website_id}", response_model=WebsiteResponse)
def get_website_detail(
    website_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve full dashboard telemetry, recent checks, and SDK events for a specific website.
    """
    site = db.query(MonitoredWebsite).filter(MonitoredWebsite.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")

    recent_checks = (
        db.query(WebsiteCheckResult)
        .filter(WebsiteCheckResult.website_id == website_id)
        .order_by(desc(WebsiteCheckResult.checked_at))
        .limit(20)
        .all()
    )
    recent_events = (
        db.query(WebsiteSDKEvent)
        .filter(WebsiteSDKEvent.website_id == website_id)
        .order_by(desc(WebsiteSDKEvent.timestamp))
        .limit(20)
        .all()
    )

    site.recent_checks = recent_checks
    site.recent_sdk_events = recent_events
    return site


@router.put("/{website_id}", response_model=WebsiteResponse)
def update_website(
    website_id: str,
    payload: WebsiteUpdate,
    db: Session = Depends(get_db),
):
    """Update website configuration, intervals, or GitHub repo connection."""
    site = db.query(MonitoredWebsite).filter(MonitoredWebsite.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "url" in update_data and update_data["url"]:
        is_safe, _, err = WebsiteMonitorService.is_ssrf_safe(update_data["url"], allow_local=True)
        if not is_safe:
            raise HTTPException(status_code=400, detail=f"Invalid URL: {err}")

    for k, v in update_data.items():
        setattr(site, k, v)

    db.commit()
    db.refresh(site)
    return site


@router.post("/{website_id}/pause", response_model=WebsiteResponse)
def pause_monitoring(
    website_id: str,
    db: Session = Depends(get_db),
):
    """Pause synthetic monitoring checks for this website."""
    site = db.query(MonitoredWebsite).filter(MonitoredWebsite.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")
    site.status = "paused"
    db.commit()
    db.refresh(site)
    return site


@router.post("/{website_id}/resume", response_model=WebsiteResponse)
def resume_monitoring(
    website_id: str,
    db: Session = Depends(get_db),
):
    """Resume continuous monitoring checks for this website."""
    site = db.query(MonitoredWebsite).filter(MonitoredWebsite.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")
    site.status = "active"
    db.commit()
    db.refresh(site)
    return site


@router.post("/{website_id}/check", response_model=WebsiteCheckResultSchema)
async def trigger_immediate_check(
    website_id: str,
    db: Session = Depends(get_db),
):
    """Manually triggers an immediate synthetic probe check."""
    site = db.query(MonitoredWebsite).filter(MonitoredWebsite.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")

    result = await WebsiteMonitorService.perform_website_check(db, site)
    return result


@router.delete("/{website_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_website(
    website_id: str,
    db: Session = Depends(get_db),
):
    """Remove a website and delete all associated telemetry history."""
    site = db.query(MonitoredWebsite).filter(MonitoredWebsite.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")

    db.delete(site)
    db.commit()
    return None


# -------------------------------------------------------------------------
# Telemetry Ingestion (Public with Project API Key)
# -------------------------------------------------------------------------
@router.post("/ingest", response_model=SDKIngestResponse)
def ingest_telemetry_events(
    payload: SDKBatchIngestRequest,
    x_logpilot_key: Optional[str] = Header(None, alias="X-LogPilot-Key"),
    key: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Public ingestion endpoint for client-side JavaScript SDK and backend log shipping.
    Authenticates via `X-LogPilot-Key` header or `?key=` query parameter.
    """
    project_key = x_logpilot_key or key
    if not project_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required project authentication key (X-LogPilot-Key or ?key=).",
        )

    website = db.query(MonitoredWebsite).filter(MonitoredWebsite.ingestion_key == project_key).first()
    if not website:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid project ingestion key. Access denied.",
        )

    count = WebsiteMonitorService.ingest_sdk_telemetry(db, website, payload.events)

    return SDKIngestResponse(
        status="success",
        ingested_count=count,
        website_id=website.id,
        website_name=website.name,
    )


# -------------------------------------------------------------------------
# AI Debugging Engine & GitHub Code Fix Integration
# -------------------------------------------------------------------------
@router.post("/{website_id}/ai-troubleshoot", response_model=AIDiagnosticResponse)
def troubleshoot_website_with_ai(
    website_id: str,
    db: Session = Depends(get_db),
):
    """
    Autonomous AI Debugging: analyzes probe telemetry, status codes, and SDK error traces.
    Produces evidence-grounded root causes, solutions, code patches, and prevention steps.
    """
    try:
        diagnosis = WebsiteMonitorService.diagnose_website_with_ai(db, website_id)
        return diagnosis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"AI Troubleshooting error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to synthesize AI diagnostic report.")


@router.post("/{website_id}/github/patch", response_model=GitHubPatchResponse)
def get_github_code_patch(
    website_id: str,
    db: Session = Depends(get_db),
):
    """
    Generates a proposed git unified diff patch matching the affected code repository.
    Strictly review-only; requires explicit human inspection.
    """
    return WebsiteMonitorService.generate_github_patch(db, website_id)


# -------------------------------------------------------------------------
# Server-Sent Events (SSE) Live Monitoring Stream
# -------------------------------------------------------------------------
@router.get("/{website_id}/stream")
async def stream_website_telemetry(
    website_id: str,
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events (SSE) stream providing real-time telemetry updates,
    synthetic check results, and streaming SDK logs.
    """
    site = db.query(MonitoredWebsite).filter(MonitoredWebsite.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Website not found")

    async def event_generator():
        try:
            while True:
                # Poll latest metric snapshot
                # In production or test, yields data every 3 seconds
                snapshot = {
                    "website_id": site.id,
                    "name": site.name,
                    "last_status": site.last_status,
                    "last_status_code": site.last_status_code,
                    "last_response_time_ms": site.last_response_time_ms,
                    "uptime_percentage": site.uptime_percentage,
                    "timestamp": datetime.utcnow().isoformat(),
                }
                yield f"data: {json.dumps(snapshot)}\n\n"
                await asyncio.sleep(3)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
