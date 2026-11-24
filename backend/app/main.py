import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.database.session import init_db
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.process_time import ProcessTimeMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.api.v1.router import api_router
from app.schemas.meta import MetaResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    setup_logging()
    app.state.server_start_time = time.time()
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.APP_ENV})")
    
    # Initialize database tables
    try:
        init_db()
        logger.info("Database schema verified and tables initialized.")
        from app.ingestion.ingestion_manager import IngestionManager
        IngestionManager.recover_interrupted_jobs()

        # Start real-time ingestion worker if enabled
        if settings.ENABLE_REALTIME_INGESTION:
            from app.ingestion.ingestion_worker import ingestion_worker
            ingestion_worker.start()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
    
    yield
    
    # Shutdown actions
    logger.info(f"Shutting down {settings.APP_NAME}")
    if settings.ENABLE_REALTIME_INGESTION:
        try:
            from app.ingestion.ingestion_worker import ingestion_worker
            await ingestion_worker.stop()
        except Exception as e:
            logger.warning(f"Error stopping ingestion worker: {e}")
    try:
        from app.websocket.manager import ws_manager
        await ws_manager.close_all()
    except Exception as e:
        logger.warning(f"Error closing WebSocket connections: {e}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Logs Analyser and Troubleshooter Agent — Enterprise Observability Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Middleware Pipeline (executed in reverse registration order)
# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)

# 2. Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Process Time Tracking
app.add_middleware(ProcessTimeMiddleware)

# 4. Request ID Tracing
app.add_middleware(RequestIDMiddleware)


# Centralized Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "request_id": request_id,
            "status_code": exc.status_code,
        },
        headers={"X-Request-ID": request_id} if request_id else {},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": str(exc.errors()),
            "request_id": request_id,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
        },
        headers={"X-Request-ID": request_id} if request_id else {},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"Unhandled server error [Request-ID: {request_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "request_id": request_id,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
        headers={"X-Request-ID": request_id} if request_id else {},
    )


# Root Metadata Endpoint
@app.get(
    "/",
    response_model=MetaResponse,
    tags=["Root"],
    summary="Application Identity & Metadata",
)
def get_root():
    """Return application name, version, and description."""
    return MetaResponse(
        name=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered Logs Analyser and Troubleshooter Agent",
    )


# Include Versioned API Routes
app.include_router(api_router, prefix="/api/v1")


# WebSocket Real-Time Log Streaming Endpoint
from starlette.websockets import WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager


@app.websocket("/ws/v1/logs")
async def websocket_logs_endpoint(websocket: WebSocket):
    """
    Real-time log streaming WebSocket endpoint.
    Supports subscriptions, heartbeat pings, and delivery of committed log events.
    """
    client_id = await ws_manager.connect(websocket)
    if not client_id:
        return

    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.handle_client_message(client_id, data)
    except WebSocketDisconnect:
        await ws_manager.disconnect(client_id)
    except Exception as e:
        logger.debug(f"WebSocket client loop ended for {client_id}: {e}")
        await ws_manager.disconnect(client_id)


# Optional Single-Page Application (SPA) Production Static Mount
import os
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse

_possible_dist_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist")),
    "/app/frontend/dist",
]
_frontend_dist = next((p for p in _possible_dist_paths if os.path.exists(p)), None)

if _frontend_dist:
    _assets_dir = os.path.join(_frontend_dist, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="spa-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(request: Request, full_path: str):
        if (
            full_path.startswith("api/")
            or full_path.startswith("docs")
            or full_path.startswith("openapi.json")
            or full_path.startswith("redoc")
            or full_path.startswith("ws/")
        ):
            raise StarletteHTTPException(status_code=404, detail="Not Found")
        index_path = os.path.join(_frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise StarletteHTTPException(status_code=404, detail="SPA index not found")

