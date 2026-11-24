# LogPilot AI — Data Security & Privacy Architecture

Security, privacy, and defensive engineering are fundamental pillars of the LogPilot AI platform.

---

## 1. Automated Secret & PII Redaction

LogPilot AI integrates an inline regular-expression redaction pipeline executed **before** log records are persisted into the database, shown in preview tables, or logged in error summaries:

| Secret Category | Target Pattern | Mask Token |
|:---|:---|:---|
| **Bearer Tokens** | `Bearer [A-Za-z0-9_\-\.=]+` | `[REDACTED_BEARER_TOKEN]` |
| **JSON Web Tokens (JWT)** | `ey[A-Za-z0-9_\-]{10,}\.ey[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}` | `[REDACTED_JWT]` |
| **API Keys** | `(?:api[_-]?key\|secret[_-]?key)[=:]\s*([A-Za-z0-9_\-]{16,})` | `[REDACTED_API_KEY]` |
| **Passwords** | `(?:password\|passwd\|pwd)[=:]\s*([^\s,;]+)` | `[REDACTED_PASSWORD]` |
| **Database URLs** | `(?:postgres\|mysql\|mongodb)\:\/\/[^:]+:[^@]+@[^\s]+` | `[REDACTED_DB_URL]` |
| **Private Keys** | `-----BEGIN (?:RSA\|EC\|DSA\|OPENSSH)? PRIVATE KEY-----[\s\S]*?-----END (?:...)? PRIVATE KEY-----` | `[REDACTED_PRIVATE_KEY]` |

---

## 2. File Ingestion Defense in Depth

1. **Path Traversal Protection**: Filenames are sanitized with `os.path.basename` and regex stripping of control characters and special path markers (`..`, `/`, `\`).
2. **Binary & Executable Blocking**:
   - Explicitly rejects dangerous extensions: `.exe`, `.bin`, `.sh`, `.bat`, `.dll`, `.so`, `.zip`, `.tar`, `.gz`, `.pdf`, `.png`, etc.
   - Inspects the first 8 KB of file bytes for null bytes (`\x00`), which indicate binary content even if disguised with a `.log` extension.
3. **Strict Size Limits**: Files greater than 25 MB (`MAX_UPLOAD_SIZE_MB=25`) are rejected before reading into memory.
4. **Encoding Enforcement**: Safely reads files encoded in UTF-8 and UTF-8 with BOM (`utf-8-sig`), cleanly replacing invalid byte sequences without crashing.
5. **SHA-256 Deduplication**: Calculates an unforgeable SHA-256 cryptographic digest of the file contents. Re-uploading an identical file is blocked unless explicitly confirmed with `confirm_duplicate=true`.
6. **Remediation Execution Safety**: The application enforces `ENABLE_REMEDIATION_EXECUTION=false`. LogPilot AI **never** executes commands, scripts, or URLs extracted from ingested log files.
