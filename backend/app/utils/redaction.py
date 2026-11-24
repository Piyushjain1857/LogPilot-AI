import re
from typing import Any, Dict


class SensitiveDataRedactor:
    """
    Regex-based redaction utility for sanitizing sensitive credentials,
    tokens, authorization headers, and secrets before storage or LLM processing.
    """

    PATTERNS = [
        # Bearer tokens
        (re.compile(r"(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE), r"\1[REDACTED_TOKEN]"),
        # JWT tokens (header.payload.signature)
        (re.compile(r"ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"), r"[REDACTED_JWT]"),
        # Basic / Generic API Key patterns
        (re.compile(r"(?i)(api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\s*[:=]\s*['\"]?([A-Za-z0-9_\-]{8,})['\"]?"), r"\1=[REDACTED_KEY]"),
        # Passwords in key-value pairs or URLs
        (re.compile(r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"]?([^'\" \r\n]{3,})['\"]?"), r"\1=[REDACTED_PASSWORD]"),
        # Database connection strings with credentials (e.g. postgres://user:pass@host)
        (re.compile(r"(?i)(postgres|postgresql|mysql|mongodb|redis|amqp):\/\/([^:]+):([^@]+)@"), r"\1://\2:[REDACTED_PASSWORD]@"),
        # Generic Authorization header lines (if not already matched by Bearer)
        (re.compile(r"(?i)(Authorization:\s*(?:Basic|Digest|Token)\s*)([^\r\n]+)"), r"\1[REDACTED_AUTH_HEADER]"),
        # Private Keys (RSA, EC, OPENSSH)
        (re.compile(r"-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+ PRIVATE KEY-----"), r"[REDACTED_PRIVATE_KEY]"),
    ]

    @classmethod
    def redact(cls, text: str) -> str:
        """Redacts sensitive occurrences from a string."""
        if not text:
            return text
        redacted = text
        for pattern, replacement in cls.PATTERNS:
            redacted = pattern.sub(replacement, redacted)
        return redacted

    @classmethod
    def redact_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitizes values in a dictionary."""
        sanitized = {}
        sensitive_keys = {"password", "passwd", "secret", "token", "api_key", "authorization", "private_key"}
        for k, v in data.items():
            if isinstance(k, str) and any(sk in k.lower() for sk in sensitive_keys):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, str):
                sanitized[k] = cls.redact(v)
            elif isinstance(v, dict):
                sanitized[k] = cls.redact_dict(v)
            elif isinstance(v, list):
                sanitized[k] = [
                    cls.redact(item) if isinstance(item, str)
                    else (cls.redact_dict(item) if isinstance(item, dict) else item)
                    for item in v
                ]
            else:
                sanitized[k] = v
        return sanitized


redactor = SensitiveDataRedactor()
