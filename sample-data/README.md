# LogPilot AI — Synthetic Sample Datasets

This directory contains verified, synthetic log datasets designed for testing Phase 3 log ingestion, parsing, duplicate detection, and sensitive data redaction.

> [!IMPORTANT]
> None of these files contain real credentials, proprietary logs, or personal identifiable information (PII). All tokens, passwords, IPs, and trace IDs are strictly synthetic.

---

## Catalog of Sample Files

| Filename | Format | Description / Testing Purpose |
|---|---|---|
| **`application.log`** | Plain Text `.log` | Realistic standard microservices log with timestamps, severity levels, service tags, and shared trace IDs. |
| **`server-errors.txt`** | Text `.txt` | Mixed unstructured error lines, missing timestamps, kernel OOM notices, and recovery events. |
| **`microservices.csv`** | CSV `.csv` | Tabular logs with header columns (`timestamp`, `severity`, `service`, `message`, `trace_id`, `span_id`). |
| **`system-events.json`** | JSON Array `.json` | Array of structured log objects with nested metadata properties. |
| **`distributed-traces.jsonl`** | JSON Lines `.jsonl` | Line-delimited JSON events with common `trace_id` for cross-service correlation. |
| **`multiline-stacktrace.log`** | Plain Text `.log` | Realistic Python multi-line traceback verifying that stack trace continuations are not treated as separate log records. |
| **`mixed-valid-invalid.jsonl`** | JSON Lines `.jsonl` | Verifies graceful error recovery: valid lines are ingested while malformed lines yield `PARTIALLY_COMPLETED` status. |
| **`redaction-test.log`** | Plain Text `.log` | Contains synthetic JWT tokens, Bearer headers, database passwords, and API keys to verify automated redaction. |
| **`malformed.json`** | Corrupted JSON | Verifies that unparseable or truncated JSON documents are safely rejected with `FAILED` validation status. |
| **`empty.log`** | Empty File (0 bytes) | Verifies rejection of 0-byte uploads. |

---

## Ingestion Instructions

1. Open the LogPilot AI web console at `http://localhost:5173/app/log-sources`.
2. Click **Upload Logs** or navigate to an existing log source.
3. Drag and drop any of the above files or click **Browse Files**.
4. Review the extracted structure in the **Preview & Mapping** step.
5. Confirm import and watch real-time file upload and backend progress.
