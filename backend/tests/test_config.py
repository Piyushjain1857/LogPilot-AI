from app.core.config import Settings


def test_config_startup_without_gemini_credentials():
    custom_settings = Settings(GEMINI_API_KEY=None)
    assert custom_settings.gemini_status == "not_configured"

    empty_key_settings = Settings(GEMINI_API_KEY="")
    assert empty_key_settings.gemini_status == "not_configured"


def test_config_with_gemini_key_unverified():
    key_settings = Settings(GEMINI_API_KEY="AIzaSyDummyKey12345")
    assert key_settings.gemini_status == "configured_unverified"


def test_remediation_execution_disabled_by_default():
    settings = Settings()
    assert settings.ENABLE_REMEDIATION_EXECUTION is False


def test_cors_origins_configured():
    settings = Settings()
    assert "http://localhost:5173" in settings.CORS_ORIGINS
    assert "http://127.0.0.1:5173" in settings.CORS_ORIGINS
