# Advanced Log Explorer, FTS5 Search & Distributed Trace Investigation

LogPilot AI features a high-performance log exploration engine combining SQLite FTS5 full-text indexing, safe boolean query tokenization, distributed trace waterfalls, and CSV formula injection defense.

---

## 1. Full-Text Search (FTS5) Engine

The full-text search capability indexes log records using SQLite's native FTS5 extension:

```sql
CREATE VIRTUAL TABLE log_entries_fts USING fts5(
    id UNINDEXED,
    message,
    service_name,
    severity,
    trace_id,
    span_id,
    template_id,
    metadata_text,
    content='log_entries',
    content_rowid='rowid'
);
```

### Real-Time Synchronization Triggers:
- `trg_log_entries_ai`: Automatically indexes newly inserted log records into `log_entries_fts`.
- `trg_log_entries_ad`: Automatically removes deleted records from the FTS index.
- `trg_log_entries_au`: Updates search index records when log metadata or fields are modified.

### Highlighting & Snippets:
Matching query terms are highlighted using FTS5 `snippet(log_entries_fts, 1, '<b>', '</b>', '...', 16)` returning contextual text windows around matched terms.

---

## 2. Safe Query Language Syntax & AST Compiler

The query parser (`app/services/query_parser.py`) tokenizes search expressions into an Abstract Syntax Tree (AST) and generates strictly parameterized SQLAlchemy clauses. **No untrusted text is ever concatenated into SQL.**

### Supported Query Syntax:
| Pattern | Meaning | Example |
|---|---|---|
| `service:<name>` | Filter by microservice | `service:auth-service` |
| `severity:<level>` | Filter by severity | `severity:ERROR` or `severity:ERROR,CRITICAL` |
| `trace_id:<id>` | Filter by trace ID | `trace_id:trace-0af765` |
| `span_id:<id>` | Filter by span ID | `span_id:span-b7ad` |
| `status:<code>` | HTTP status code in metadata | `status:500` or `status:>400` |
| `duration_ms:<num>` | Latency duration in metadata | `duration_ms:>1000` |
| `environment:<env>` | Deployment tier | `environment:production` |
| `template_id:<id>` | Drain3 template ID | `template_id:tmpl-42` |
| `"quoted phrase"` | Exact phrase matching | `"database connection timeout"` |
| `AND`, `OR`, `NOT` | Boolean logic | `service:payment AND NOT severity:INFO` |

---

## 3. Distributed Trace Investigation

Traces group log records sharing a common `trace_id` into distributed transactions:

1. **Trace Summaries (`GET /api/v1/traces`)**:
   - Aggregates duration, event counts, error counts, and participating microservices.
   - Identifies the root service (service of the earliest event).
2. **Trace Waterfall (`GET /api/v1/traces/{trace_id}`)**:
   - Calculates relative start offset (`+X ms`) from the earliest transaction event.
   - Renders visual latency bars indicating span duration.
   - Color-codes microservice hops and highlights error events in red.

---

## 4. Export Service & Formula Injection Defense (CWE-1236)

LogPilot AI supports exporting search results to CSV and JSON up to 10,000 records.

### Security Defense:
If an exported field begins with any spreadsheet formula indicator (`=`, `+`, `-`, `@`, `\t`, `\r`), `ExportService.generate_csv()` automatically prepends a single quote (`'`):
```python
def sanitize_csv_cell(val: Any) -> Any:
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s
```
This neutralizes Remote Code Execution or command execution via Dynamic Data Exchange (DDE) in Microsoft Excel, LibreOffice Calc, or Google Sheets.

---

## 5. Saved Searches & Query History

- **Saved Searches (`/api/v1/search/saved`)**: Enables engineers to persist named monitoring queries with descriptions and custom filter presets.
- **Search History (`/api/v1/search/history`)**: Automatically tracks the last 25 executed queries with result counts and execution latencies in milliseconds.
