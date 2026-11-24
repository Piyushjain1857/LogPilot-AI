import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import SeverityBadge from "../common/SeverityBadge";
import CopyButton from "../common/CopyButton";
import CodeBlock from "../common/CodeBlock";

export default function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);

  // Safely extract metadata object
  let parsedMetadata = null;
  if (log.metadata_json) {
    try {
      parsedMetadata = typeof log.metadata_json === "string" ? JSON.parse(log.metadata_json) : log.metadata_json;
    } catch {
      parsedMetadata = log.metadata_json;
    }
  }

  // Format timestamp safely
  const formattedTime = log.timestamp
    ? new Date(log.timestamp).toISOString().replace("T", " ").replace("Z", "")
    : "--:--:--";

  return (
    <>
      <tr
        className={`log-row ${expanded ? "expanded" : ""}`}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* Expand toggle icon */}
        <td className="log-cell" style={{ width: 32, textAlign: "center" }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            aria-label={expanded ? "Collapse log details" : "Expand log details"}
            style={{ padding: 0 }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>

        {/* Timestamp */}
        <td className="log-cell log-time" style={{ width: 180, color: "var(--text-muted)" }}>
          {formattedTime}
        </td>

        {/* Severity */}
        <td className="log-cell" style={{ width: 90 }}>
          <SeverityBadge severity={log.severity} />
        </td>

        {/* Service */}
        <td className="log-cell" style={{ width: 140 }}>
          <span
            className="code-font"
            style={{
              backgroundColor: "var(--bg-elevated)",
              padding: "2px 6px",
              borderRadius: "var(--radius-xs)",
              color: "var(--accent-secondary)",
            }}
          >
            {log.service_name || log.service || "unknown-svc"}
          </span>
        </td>

        {/* Message (plain text, never dangerouslySetInnerHTML) */}
        <td className="log-cell log-cell-message">
          <span>{log.message}</span>
        </td>

        {/* Trace ID */}
        <td className="log-cell log-cell-trace" style={{ width: 130 }}>
          {log.trace_id ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span className="code-font" style={{ fontSize: 11 }}>
                {log.trace_id.slice(0, 10)}...
              </span>
              <CopyButton text={log.trace_id} label="Copy Trace ID" />
            </div>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>-</span>
          )}
        </td>

        {/* Action Copy */}
        <td className="log-cell" style={{ width: 44, textAlign: "right" }}>
          <CopyButton text={log.raw_message || log.message} label="Copy Log Line" />
        </td>
      </tr>

      {/* Expanded detail accordion */}
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <div className="log-detail-panel">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Source ID: </span>
                  <span className="code-font">{log.source_id || "N/A"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Span ID: </span>
                  <span className="code-font">{log.span_id || "N/A"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Template ID: </span>
                  <span className="code-font">{log.template_id || "N/A"}</span>
                </div>
              </div>

              {/* Raw Message */}
              <div style={{ marginBottom: "var(--space-3)" }}>
                <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Raw Message:</div>
                <div
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    wordBreak: "break-all",
                  }}
                >
                  {log.raw_message || log.message}
                </div>
              </div>

              {/* Metadata JSON block if available */}
              {parsedMetadata && (
                <div>
                  <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Parsed Metadata:</div>
                  <CodeBlock code={parsedMetadata} language="json" />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
