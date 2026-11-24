from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    system,
    overview,
    settings,
    uploads,
    log_sources,
    logs,
    ingest,
    source_tokens,
    streaming,
    search,
    traces,
    anomalies,
    clusters,
    incidents,
    root_cause,
    troubleshooter,
    remediation,
    notifications,
    reports,
    assistant,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(system.router)
api_router.include_router(overview.router)
api_router.include_router(settings.router)
api_router.include_router(uploads.router)
api_router.include_router(log_sources.router)
api_router.include_router(search.router)
api_router.include_router(traces.router)
api_router.include_router(anomalies.router)
api_router.include_router(clusters.router)
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(root_cause.router, prefix="/root-cause", tags=["root_cause"])
api_router.include_router(troubleshooter.router, prefix="/troubleshooter", tags=["troubleshooter"])
api_router.include_router(remediation.router, prefix="/remediation", tags=["remediation"])
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(assistant.router)
api_router.include_router(logs.router)
api_router.include_router(ingest.router)
api_router.include_router(source_tokens.router)
api_router.include_router(streaming.router)
