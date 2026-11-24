from app.utils.redaction import SensitiveDataRedactor, redactor


def test_redact_bearer_token():
    text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 user authenticated"
    redacted = redactor.redact(text)
    assert "Bearer" in redacted
    assert "[REDACTED_TOKEN]" in redacted
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in redacted

    standalone = "Session established with Bearer testTokenValue99182312=="
    redacted_standalone = redactor.redact(standalone)
    assert "Bearer [REDACTED_TOKEN]" in redacted_standalone
    assert "testTokenValue99182312==" not in redacted_standalone


def test_redact_jwt():
    text = "JWT token value: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jV_h"
    redacted = redactor.redact(text)
    assert "[REDACTED_JWT]" in redacted
    assert "dozjgNryP4J3jV_h" not in redacted


def test_redact_api_key():
    text = "api_key=AIzaSyBv1234567890abcdef and secret_key: 'sk_live_99291048102948'"
    redacted = redactor.redact(text)
    assert "AIzaSyBv1234567890abcdef" not in redacted
    assert "sk_live_99291048102948" not in redacted


def test_redact_passwords_and_db_urls():
    text = "postgres://admin:superSecret123@db-primary.internal:5432/orders"
    redacted = redactor.redact(text)
    assert "superSecret123" not in redacted
    assert "postgres://admin:[REDACTED_PASSWORD]@db-primary.internal:5432/orders" in redacted

    pw_text = "Connecting with password='superSecretPassword!' to host"
    pw_redacted = redactor.redact(pw_text)
    assert "superSecretPassword!" not in pw_redacted


def test_redact_auth_header():
    text = "Authorization: Basic dXNlcjpwYXNzd29yZA=="
    redacted = redactor.redact(text)
    assert "[REDACTED_AUTH_HEADER]" in redacted
    assert "dXNlcjpwYXNzd29yZA==" not in redacted


def test_redact_private_key():
    key_text = (
        "-----BEGIN RSA PRIVATE KEY-----\n"
        "MIIEowIBAAKCAQEA04rU\n"
        "-----END RSA PRIVATE KEY-----"
    )
    redacted = redactor.redact(key_text)
    assert "[REDACTED_PRIVATE_KEY]" in redacted
    assert "MIIEowIBAAKCAQEA04rU" not in redacted


def test_redact_dict():
    data = {
        "user_id": "usr_100",
        "api_key": "secret1234567",
        "nested": {
            "password": "my_password",
            "message": "Bearer abc12345xyz token used",
        },
    }
    cleaned = redactor.redact_dict(data)
    assert cleaned["user_id"] == "usr_100"
    assert cleaned["api_key"] == "[REDACTED]"
    assert cleaned["nested"]["password"] == "[REDACTED]"
    assert "abc12345xyz" not in cleaned["nested"]["message"]
