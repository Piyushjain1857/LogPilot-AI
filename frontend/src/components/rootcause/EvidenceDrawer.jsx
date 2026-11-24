import React from "react";
import SeverityBadge from "../common/SeverityBadge";
import { X } from "lucide-react";

export default function EvidenceDrawer({
  hypothesis,
  onClose,
}) {
  if (!hypothesis) return null;

  const citations = hypothesis.evidence_citations || [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(600px, 92vw)",
        backgroundColor: "var(--bg-card)",
        borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.25)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "var(--accent-primary)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              RANK #{hypothesis.rank}
            </span>
            <span className="code-font" style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
              {hypothesis.service_name}
            </span>
          </div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Verified Evidence Citations ({citations.length})
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onClose}
          style={{ padding: "6px" }}
          aria-label="Close Evidence Drawer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Citations List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
          The following immutable log entries and distributed trace signals ground the causal determination for{" "}
          <strong>{hypothesis.service_name}</strong> with zero hallucination.
        </p>

        {citations.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No specific log citations recorded for this hypothesis.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {citations.map((c, idx) => {
              const formattedTime = new Date(c.timestamp).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={c.log_id || idx}
                  style={{
                    padding: "12px",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <SeverityBadge severity={c.severity} />
                      <span className="code-font" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {c.service_name}
                      </span>
                      {c.trace_id && (
                        <span
                          className="code-font"
                          style={{
                            fontSize: "10px",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            color: "var(--accent-primary)",
                            padding: "1px 5px",
                            borderRadius: "3px",
                          }}
                        >
                          {c.trace_id}
                        </span>
                      )}
                    </div>
                    <span className="code-font" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {formattedTime}
                    </span>
                  </div>

                  {/* Log message */}
                  <div
                    className="code-font"
                    style={{
                      fontSize: "11px",
                      color: "var(--text-primary)",
                      backgroundColor: "var(--bg-card)",
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {c.message}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "var(--text-muted)" }}>
                    <span>Log ID: {c.log_id}</span>
                    <span>Relevance: {(c.relevance_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
