import React, { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";

export default function TraceTimeline({ events = [], durationMs = 0 }) {
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)", fontSize: "13px" }}>
        No events associated with this trace.
      </div>
    );
  }

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {events.map((evt, idx) => {
        const isExpanded = expandedId === evt.id;
        const relativePct = durationMs > 0 ? Math.min(95, (evt.relative_start_ms / durationMs) * 100) : 0;
        const durationBarWidth = evt.duration_ms && durationMs > 0
          ? Math.max(2, Math.min(100 - relativePct, (evt.duration_ms / durationMs) * 100))
          : 4;

        return (
          <div
            key={evt.id || idx}
            style={{
              backgroundColor: isExpanded ? "var(--bg-elevated)" : "var(--bg-card)",
              border: `1px solid ${evt.is_error ? "var(--status-error)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              transition: "background-color var(--transition-fast)",
            }}
          >
            {/* Span Row */}
            <div
              onClick={() => toggleExpand(evt.id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                cursor: "pointer",
                gap: "var(--space-3)",
                fontSize: "12px",
              }}
            >
              <div style={{ color: "var(--text-muted)" }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>

              {/* Relative Offset */}
              <div style={{ width: "75px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "11px" }}>
                +{evt.relative_start_ms}ms
              </div>

              {/* Service Badge */}
              <div style={{ width: "130px", whiteSpace: "nowrap" }}>
                <span className="format-pill" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                  {evt.service_name}
                </span>
              </div>

              {/* Severity */}
              <div style={{ width: "75px" }}>
                <span className={`badge badge-${evt.severity?.toLowerCase()}`}>
                  {evt.severity}
                </span>
              </div>

              {/* Message Summary */}
              <div style={{ flex: 1, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {evt.message}
              </div>

              {/* Waterfall latency bar visual */}
              <div style={{ width: "140px", display: "flex", alignItems: "center" }}>
                <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-elevated)", borderRadius: "4px", position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: `${relativePct}%`,
                      width: `${durationBarWidth}%`,
                      height: "100%",
                      borderRadius: "4px",
                      backgroundColor: evt.is_error ? "var(--status-error)" : "var(--accent-primary)",
                    }}
                  />
                </div>
              </div>

              {/* Span Duration Label */}
              <div style={{ width: "65px", textAlign: "right", color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                {evt.duration_ms ? `${evt.duration_ms}ms` : "--"}
              </div>
            </div>

            {/* Expandable Detail Panel */}
            {isExpanded && (
              <div
                style={{
                  padding: "var(--space-3) var(--space-4) var(--space-4)",
                  borderTop: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-primary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Span Event Payload & Context
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(evt.message, evt.id);
                    }}
                    style={{ gap: "4px" }}
                  >
                    {copiedId === evt.id ? <Check size={11} color="var(--status-success)" /> : <Copy size={11} />}
                    {copiedId === evt.id ? "Copied" : "Copy Payload"}
                  </button>
                </div>
                <pre
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {evt.message}
                </pre>
                {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                  <pre
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-sm)",
                      margin: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--accent-secondary)",
                    }}
                  >
                    {JSON.stringify(evt.metadata, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
