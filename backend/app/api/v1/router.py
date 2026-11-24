from fastapi import APIRouter
from app.api.v1.endpoints import health, system, overview, settings, uploads, log_sources, logs

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(system.router)
api_router.include_router(overview.router)
api_router.include_router(settings.router)
api_router.include_router(uploads.router)
api_router.include_router(log_sources.router)
api_router.include_router(logs.router)
