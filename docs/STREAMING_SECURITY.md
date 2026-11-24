# Streaming & Ingestion Security Architecture

LogPilot AI implements defense-in-depth security principles across token authentication, zero-trust log transmission, sensitive data redaction, rate limiting, and backpressure protection.

---

## 1. Ingestion Token Security

1. **Entropy & Generation**: Tokens are generated using Python's cryptographically secure pseudo-random number generator (`secrets.token_urlsafe(32)`), producing a high-entropy string prefixed with `lpt_`.
2. **One-Way Storage**: Raw token values are **never stored** in the database. The database only retains:
   - `token_hash`: SHA-256 cryptographic digest of the raw token.
   - `token_prefix`: First 8 characters (e.g. `lpt_9a7d...`) for identification.
3. **One-Time Reveal**: When a token is created or rotated, the raw token is returned exactly once in the response. After the modal dialog is closed, it cannot be retrieved.
4. **Constant-Time Verification**: Verification uses `hmac.compare_digest()` to eliminate timing-attack vulnerabilities:
   ```python
   def verify_token(raw_token: str, stored_hash: str) -> bool:
       candidate_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
       return hmac.compare_digest(candidate_hash, stored_hash)
   ```
5. **Zero-Downtime Rotation**: Sources allow rotating tokens with optional overlapping grace periods to facilitate smooth credential rollout across fleets.
6. **Instant Revocation**: Compromised or decommissioned tokens can be revoked immediately, terminating their ability to submit data.

---

## 2. Ingestion Kill Switch

Each log source features an independent `ingestion_enabled` toggle:
- When toggled to `False`, all subsequent ingestion attempts from that source are immediately rejected with `403 Forbidden` (`Source ingestion is currently disabled`).
- The check occurs in-memory at the API router layer before jobs reach the queue.

---

## 3. Sensitive Data Redaction

All log records undergo automatic PII and secret redaction before being written to SQLite and before being dispatched over WebSockets:
- **Authorization Headers**: `Bearer <token>`, `Basic <creds>`.
- **JWTs**: RFC 7519 3-part Base64 tokens.
- **API Keys**: Stripe, AWS, Slack, Google Cloud keys.
- **Database Connection Strings**: `postgres://user:pass@host/db`.
- **Private Keys**: RSA/EC/OPENSSH headers and blocks.
- **Passwords**: `password=...`, `passwd: ...`, `"secret": "..."`.

Redacted values are masked with `[REDACTED_SECRET]` or `[REDACTED_BEARER_TOKEN]`, preserving the surrounding structural diagnostic context.

---

## 4. Rate Limiting & Queue Protection

- **Sliding-Window Limiter**: Requests per minute and records per minute are enforced per source token.
- **Bounded Ingestion Queue**: Queue size is capped at 5,000 items. Excess traffic receives `429 Too Many Requests` or `503 Service Unavailable` with `Retry-After: 5`.
- **WebSocket Client Queues**: Per-client WebSocket queues are capped at 500 pending messages. Sluggish or unresponsive clients have older events dropped to protect server heap.
