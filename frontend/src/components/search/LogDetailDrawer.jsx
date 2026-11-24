import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X, Copy, Check, GitBranch } from "lucide-react";

export default function LogDetailDrawer({
  log,
  isOpen,
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 1050,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          height: "100%",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          padding: "var(--space-6)",
          gap: "var(--space-4)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span className={`badge badge-${log.severity?.toLowerCase()}`}>
              {log.severity}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-primary)" }}>
              {log.service_name}
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-xs" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Distributed Trace Callout CTA */}
        {log.trace_id && (
          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              border: "1px solid var(--accent-primary)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-primary)", textTransform: "uppercase" }}>
                Distributed Trace Detected
              </div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-primary)", marginTop: "2px" }}>
                {log.trace_id}
              </div>
            </div>
            <Link to={`/app/traces/${log.trace_id}`}>
              <button type="button" className="btn btn-primary btn-xs" style={{ gap: "4px" }}>
                <GitBranch size={12} /> View Trace Waterfall
              </button>
            </Link>
          </div>
        )}

        {/* Primary Metadata Attributes Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-3)",
            fontSize: "12px",
            backgroundColor: "var(--bg-elevated)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Timestamp</span>
            <span className="code-font" style={{ color: "var(--text-primary)" }}>
              {log.timestamp ? new Date(log.timestamp).toISOString() : "--"}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Span ID</span>
            <span className="code-font" style={{ color: "var(--text-primary)" }}>
              {log.span_id || "--"}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Template ID</span>
            <span className="code-font" style={{ color: "var(--accent-secondary)" }}>
              {log.template_id || "Unclustered"}
            </span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Ingestion Method</span>
            <span className="code-font" style={{ color: "var(--text-primary)" }}>
              {log.ingestion_method || "FILE_UPLOAD"}
            </span>
          </div>
        </div>

        {/* Message Content */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
              Sanitized Log Message
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => handleCopy(log.message)}
              style={{ gap: "4px" }}
            >
              {copied ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              fontFamily: "var(--font-mono)",
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

        {/* Structured Context Metadata */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
              Context Metadata (JSON)
            </span>
            <pre
              style={{
                padding: "var(--space-3)",
                backgroundColor: "var(--bg-elevated)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--accent-secondary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                margin: 0,
              }}
            >
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
