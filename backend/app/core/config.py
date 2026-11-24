from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "LogPilot AI"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./logpilot.db"
    
    # Gemini AI configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    # Security and Upload
    MAX_UPLOAD_SIZE_MB: int = 25
    MAX_UPLOAD_RECORDS: int = 100000
    MAX_UPLOAD_FILES: int = 5
    MAX_LOG_MESSAGE_BYTES: int = 32768
    MAX_PREVIEW_RECORDS: int = 50
    MAX_INGESTION_ERRORS: int = 100
    INGESTION_BATCH_SIZE: int = 500
    MAX_CONCURRENT_INGESTION_JOBS: int = 2
    UPLOAD_TEMP_DIRECTORY: str = "storage/uploads"
    ENABLE_SECRET_REDACTION: bool = True
    LOG_LEVEL: str = "INFO"
    ENABLE_REMEDIATION_EXECUTION: bool = False

    # Real-Time Ingestion and Streaming Configuration (Phase 5)
    ENABLE_REALTIME_INGESTION: bool = True
    ENABLE_WEBSOCKET_STREAMING: bool = True
    MAX_INGESTION_BATCH_SIZE: int = 500
    MAX_INGESTION_REQUEST_BYTES: int = 2097152  # 2 MB
    MAX_INGESTION_QUEUE_SIZE: int = 5000
    INGESTION_WORKER_COUNT: int = 1
    INGESTION_FLUSH_INTERVAL_MS: int = 250
    INGESTION_REQUESTS_PER_MINUTE: int = 120
    INGESTION_RECORDS_PER_MINUTE: int = 10000
    MAX_WEBSOCKET_CLIENTS: int = 20
    MAX_WEBSOCKET_CLIENT_QUEUE: int = 500
    MAX_WEBSOCKET_MESSAGE_BYTES: int = 16384
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 20
    WEBSOCKET_CONNECTION_TIMEOUT: int = 60
    STREAM_EVENT_RETENTION_HOURS: int = 24
    SOURCE_ACTIVE_WINDOW_SECONDS: int = 60
    SOURCE_IDLE_WINDOW_SECONDS: int = 300
    STREAM_METRICS_WINDOW_SECONDS: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def gemini_status(self) -> str:
        """
        Distinguishes between:
        - 'not_configured': No API key present.
        - 'configured_unverified': API key is present but not yet verified with live call.
        - 'verified': API key was verified against the provider.
        """
        if not self.GEMINI_API_KEY or not self.GEMINI_API_KEY.strip():
            return "not_configured"
        # In Phase 1 foundation, if key is present, it is configured but unverified
        return "configured_unverified"


settings = Settings()
