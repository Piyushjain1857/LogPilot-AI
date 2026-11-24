import React, { useState, memo } from "react";
import { ChevronRight, ChevronDown, Copy, Check, Terminal } from "lucide-react";

function formatTimestamp(ts) {
  if (!ts) return "--:--:--.---";
  try {
    const d = new Date(ts);
    return d.toTimeString().split(" ")[0] + "." + String(d.getMilliseconds()).padStart(3, "0");
  } catch (_) {
    return ts;
  }
}

const LiveLogRow = memo(function LiveLogRow({ log, isExpanded, onToggleExpand }) {
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <>
      <tr
        onClick={onToggleExpand}
        style={{
          cursor: "pointer",
          backgroundColor: isExpanded ? "var(--bg-elevated)" : "transparent",
          transition: "background-color var(--transition-fast)",
          borderBottom: "1px solid var(--border-subtle)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
        }}
        className="live-log-row"
      >
        {/* Expand caret */}
        <td style={{ width: "32px", padding: "8px 4px 8px 12px", color: "var(--text-muted)" }}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>

        {/* Timestamp */}
        <td style={{ width: "110px", whiteSpace: "nowrap", color: "var(--text-secondary)", padding: "8px 12px" }}>
          {formatTimestamp(log.timestamp)}
        </td>

        {/* Severity */}
        <td style={{ width: "90px", padding: "8px 12px" }}>
          <span
            className={`badge badge-${log.severity.toLowerCase()}`}
            style={{
              padding: "2px 8px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {log.severity}
          </span>
        </td>

        {/* Service */}
        <td style={{ width: "140px", padding: "8px 12px", whiteSpace: "nowrap" }}>
          <span
            className="format-pill"
            style={{ color: "var(--accent-primary)", fontSize: "11px", fontWeight: 600 }}
          >
            {log.service_name || "unknown"}
          </span>
        </td>

        {/* Message */}
        <td
          style={{
            padding: "8px 12px",
            color: log.severity === "ERROR" || log.severity === "CRITICAL" ? "var(--text-primary)" : "var(--text-secondary)",
            wordBreak: "break-all",
          }}
        >
          {log.message}
        </td>

        {/* Trace ID */}
        <td style={{ width: "130px", padding: "8px 12px", whiteSpace: "nowrap" }}>
          {log.trace_id ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(log.trace_id, "trace");
              }}
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--accent-secondary)",
                padding: "2px 6px",
                gap: "4px",
              }}
            >
              {copiedField === "trace" ? <Check size={11} color="var(--status-success)" /> : <Copy size={11} />}
              {log.trace_id.slice(0, 10)}...
            </button>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>--</span>
          )}
        </td>
      </tr>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <tr>
          <td colSpan={6} style={{ backgroundColor: "var(--bg-card)", padding: "var(--space-4) var(--space-6)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Record Detail & Contextual Metadata
                </span>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => copyToClipboard(log.message, "msg")}
                    style={{ gap: "4px" }}
                  >
                    {copiedField === "msg" ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                    {copiedField === "msg" ? "Copied" : "Copy Message"}
                  </button>
                  {log.trace_id && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => copyToClipboard(log.trace_id, "trace_full")}
                      style={{ gap: "4px" }}
                    >
                      {copiedField === "trace_full" ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
                      Copy Trace ID
                    </button>
                  )}
                </div>
              </div>

              {/* Attributes Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "var(--space-3)",
                  fontSize: "12px",
                  padding: "var(--space-3)",
                  backgroundColor: "var(--bg-primary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Record ID: </span>
                  <span className="code-font" style={{ color: "var(--text-primary)" }}>{log.id || "live-event"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>External Event ID: </span>
                  <span className="code-font" style={{ color: "var(--text-primary)" }}>{log.event_id || "--"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Template ID: </span>
                  <span className="code-font" style={{ color: "var(--text-primary)" }}>{log.template_id || "default"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Ingestion Method: </span>
                  <span className="code-font" style={{ color: "var(--accent-primary)" }}>{log.ingestion_method || "REST_API"}</span>
                </div>
              </div>

              {/* Raw Message Box */}
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Sanitized Log Payload:
                </div>
                <pre
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                  }}
                >
                  {log.message}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

export default function LiveLogTable({ logs, emptyMessage }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleRow = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (!logs || logs.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: "var(--space-12)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <Terminal size={36} color="var(--text-muted)" />
        <h4 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
          {emptyMessage || "No live log records in current view"}
        </h4>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "440px" }}>
          Logs will appear automatically in real-time as your applications, Python collection agents, or synthetic simulators transmit records.
        </p>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        overflowX: "auto",
        padding: 0,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-subtle)",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <th style={{ width: "32px", padding: "10px 4px 10px 12px" }}></th>
            <th style={{ width: "110px", padding: "10px 12px" }}>Timestamp</th>
            <th style={{ width: "90px", padding: "10px 12px" }}>Severity</th>
            <th style={{ width: "140px", padding: "10px 12px" }}>Service</th>
            <th style={{ padding: "10px 12px" }}>Message</th>
            <th style={{ width: "130px", padding: "10px 12px" }}>Trace ID</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => {
            const rowKey = log.id || log.event_id || `log-${idx}-${log.timestamp}`;
            return (
              <LiveLogRow
                key={rowKey}
                log={log}
                isExpanded={expandedId === rowKey}
                onToggleExpand={() => toggleRow(rowKey)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
