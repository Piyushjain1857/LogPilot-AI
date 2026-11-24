# LogPilot AI — Supported Log File Formats

LogPilot AI natively supports 5 standard observability and application logging formats.

---

## 1. Plain Text Logs (`.log`, `.txt`)

### Characteristics
- Single-line or multiline log streams.
- Autodetects ISO-8601 timestamps, bracketed timestamps, severity levels, bracketed service names, and distributed trace identifiers (`trace_id`, `span_id`).
- Handles complex multiline stack traces (Java, Python, Node.js) by automatically aggregating trace frames into the root parent log entry.

### Example
```text
2026-11-24T10:00:00Z [INFO] [api-gateway] Request received trace_id=tr-01 span_id=sp-01
2026-11-24T10:00:01Z [ERROR] [payment-service] Database connection timeout trace_id=tr-01 span_id=sp-02
Traceback (most recent call last):
  File "payment.py", line 42, in process_transaction
    db.connect()
ConnectionError: connection pool exhausted
```

---

## 2. Comma-Separated Values (`.csv`)

### Characteristics
- Standard RFC 4180 CSV files with header row.
- **Auto-Mapping**: Intelligently identifies headers matching `timestamp`, `datetime`, `level`, `severity`, `service`, `app`, `message`, `error`, `trace_id`, `span_id`.
- **Manual Mapping**: Supports user-defined column overrides via the Upload Wizard.

### Example
```csv
timestamp,severity,service,message,trace_id
2026-11-24T10:30:15Z,INFO,api-gateway,Request received,tr-001
2026-11-24T10:30:16Z,ERROR,payment-service,Database timeout,tr-001
```

---

## 3. Structured JSON (`.json`)

### Characteristics
- Single JSON log object: `{"timestamp": "...", "severity": "ERROR", "message": "..."}`
- Top-level JSON array: `[{"message": "log 1"}, {"message": "log 2"}]`
- Wrapped JSON dictionary with common list keys: `{"logs": [...]}`, `{"items": [...]}`

### Example
```json
{
  "events": [
    {
      "timestamp": "2026-11-24T10:00:00Z",
      "severity": "INFO",
      "service": "order-service",
      "message": "Order #4812 created",
      "trace_id": "tr-4812"
    }
  ]
}
```

---

## 4. JSON Lines (`.jsonl`, `.ndjson`)

### Characteristics
- Newline-delimited JSON stream where each line contains an independent valid JSON object.
- Fault-tolerant parsing: malformed JSON on one line is logged as an error without stopping the ingestion of subsequent valid lines.

### Example
```jsonl
{"timestamp":"2026-11-24T10:00:00Z","severity":"INFO","service":"auth","message":"User login"}
{"timestamp":"2026-11-24T10:00:01Z","severity":"WARN","service":"auth","message":"High latency"}
```
