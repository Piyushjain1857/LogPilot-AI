# LogPilot AI — Log Ingestion Pipeline

## Overview

The Log Ingestion System in LogPilot AI provides a high-throughput, secure, multi-format telemetry ingestion engine capable of processing unstructured plain text logs, structured CSV files, JSON payloads, and JSON Lines streams.

```
┌──────────────────┐
│  Client Upload   │ (Multipart File Stream)
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────┐
│      Pre-Ingestion Validation          │
│ - Sanitization (Path Traversal Guard)  │
│ - Extension check (.log, .csv, etc.)   │
│ - Max File Size (25 MB limit)          │
│ - Binary & Executable Detection        │
│ - Encoding Detection (UTF-8 / BOM)     │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│      Deduplication & Fingerprint       │
│ - SHA-256 Digest Calculation           │
│ - Duplicate File Rejection (unless     │
│   confirm_duplicate is set)            │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│     Asynchronous Background Pool       │
│ - Bounded ThreadPoolExecutor (Workers) │
│ - Batch Record Ingestion (Chunks: 500) │
│ - SQLite WAL Mode Concurrency          │
│ - Cooperative Job Cancellation         │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│       Parsing & Secret Redaction       │
│ - Format-specific Parser Extraction    │
│ - Multiline Stack Trace Stitching      │
│ - Regex Secret Redaction Pipeline      │
│   (Bearer, JWT, API Keys, Passwords)   │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│      Persistence & Telemetry DB        │
│ - LogEntry Records                     │
│ - UploadBatch Audit Records            │
│ - Error Summary & Granular Diagnostics │
└────────────────────────────────────────┘
```

---

## Technical Specifications

| Parameter | Default Value | Environment Variable | Purpose |
|:---|:---|:---|:---|
| **Max File Size** | 25 MB | `MAX_UPLOAD_SIZE_MB=25` | Maximum permissible size per file |
| **Max Records Per Batch** | 100,000 | `MAX_UPLOAD_RECORDS=100000` | High-water mark to prevent OOM |
| **Batch DB Chunk Size** | 500 | `INGESTION_BATCH_SIZE=500` | Bulk insert transaction slice |
| **Max Concurrent Jobs** | 2 | `MAX_CONCURRENT_INGESTION_JOBS=2` | Bounded thread pool concurrency |
| **Max Message Size** | 32,768 Bytes | `MAX_LOG_MESSAGE_BYTES=32768` | Long-line truncation threshold |
| **Secret Redaction** | `true` | `ENABLE_SECRET_REDACTION=true` | Mask sensitive secrets before storage |
| **Duplicate Enforcement** | Enabled | SHA-256 Hash Index | Prevents accidental duplicate logs |
| **Remediation Execution** | `false` | `ENABLE_REMEDIATION_EXECUTION=false`| Strict read-only safety policy |

---

## Endpoints

1. `POST /api/v1/uploads/preview`
   - Generates a lightweight preview of the first 50 records without writing to the database.
   - Detects columns, infers mappings, and applies redaction to sample lines.
2. `POST /api/v1/uploads`
   - Accepts multipart file upload, validates metadata and binary safety, returns HTTP 202 Accepted with `UploadBatchResponse`.
   - Starts ingestion in the background `ThreadPoolExecutor`.
3. `GET /api/v1/uploads`
   - Lists recent upload batches with processing progress, statuses, record counts, and errors.
4. `GET /api/v1/uploads/{batch_id}`
   - Returns live status of an ingestion batch (`PENDING`, `PROCESSING`, `COMPLETED`, `PARTIAL_SUCCESS`, `FAILED`, `CANCELLED`).
5. `GET /api/v1/uploads/{batch_id}/logs`
   - Queries parsed logs ingested by this specific batch with pagination and filtering.
6. `GET /api/v1/uploads/{batch_id}/errors`
   - Returns granular parsing diagnostics, line numbers, error types, and excerpt lines.
7. `POST /api/v1/uploads/{batch_id}/cancel`
   - Requests cooperative cancellation of an active batch.
