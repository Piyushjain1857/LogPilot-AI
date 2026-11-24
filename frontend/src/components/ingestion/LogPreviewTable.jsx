import React from "react";
import SeverityBadge from "../common/SeverityBadge";

// Helper to highlight redaction tokens like [REDACTED_API_KEY]
function formatMessageWithRedactions(msg) {
  if (!msg) return "";
  const parts = msg.split(/(\[REDACTED_[A-Z0-9_]+\])/g);
  return parts.map((part, index) => {
    if (part.startsWith("[REDACTED_") && part.endsWith("]")) {
      return (
        <span key={index} className="redacted-badge" title="Sensitive secret masked by LogPilot AI before persistence">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function LogPreviewTable({
  records = [],
}) {
  if (!records || records.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-caption)" }}>
        No preview records available.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-caption)", textAlign: "left" }}>
        <thead>
          <tr style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "50px" }}>#</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "160px" }}>Timestamp</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "90px" }}>Severity</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "140px" }}>Service</th>
            <th style={{ padding: "var(--space-2) var(--space-3)" }}>Log Message</th>
            <th style={{ padding: "var(--space-2) var(--space-3)", width: "110px" }}>Trace ID</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec, idx) => (
            <tr
              key={idx}
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.01)",
              }}
            >
              <td style={{ padding: "var(--space-2) var(--space-3)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                {rec.line_number || idx + 1}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {rec.timestamp ? new Date(rec.timestamp).toLocaleString() : "—"}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                <SeverityBadge severity={rec.severity || "UNKNOWN"} />
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontWeight: 500, color: "var(--accent-primary)" }}>
                {rec.service_name || "—"}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontFamily: "var(--font-mono)", fontSize: "11.5px", wordBreak: "break-word" }}>
                {formatMessageWithRedactions(rec.message)}
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
                {rec.trace_id || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
