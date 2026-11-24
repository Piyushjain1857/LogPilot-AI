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
    LOG_LEVEL: str = "INFO"
    ENABLE_REMEDIATION_EXECUTION: bool = False

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
