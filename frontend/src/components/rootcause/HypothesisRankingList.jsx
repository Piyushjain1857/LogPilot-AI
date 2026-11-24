import React from "react";
import { FileText, Wrench } from "lucide-react";

export default function HypothesisRankingList({
  hypotheses,
  selectedService,
  onSelectHypothesis,
  onViewEvidence,
}) {
  if (!hypotheses || hypotheses.length === 0) {
    return (
      <div className="card" style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
        No causal hypotheses ranked yet. Trigger an analysis to identify root causes.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {hypotheses.map((h) => {
        const isTop = h.rank === 1;
        const isSelected = selectedService === h.service_name;
        const confidencePct = Math.round(h.confidence_score * 100);

        return (
          <div
            key={h.rank}
            className="card"
            onClick={() => onSelectHypothesis && onSelectHypothesis(h)}
            style={{
              padding: "16px",
              border: isTop
                ? "2px solid rgba(239, 68, 68, 0.4)"
                : isSelected
                ? "2px solid var(--accent-primary)"
                : "1px solid var(--border-subtle)",
              backgroundColor: isTop
                ? "color-mix(in srgb, var(--severity-error) 4%, var(--bg-card))"
                : "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              transition: "all 0.2s ease",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: isTop ? "var(--severity-error)" : "var(--bg-secondary)",
                    color: isTop ? "#ffffff" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  #{h.rank}
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      className="code-font"
                      style={{
                        fontWeight: 700,
                        fontSize: "13px",
                        color: isTop ? "var(--severity-error)" : "var(--text-primary)",
                      }}
                    >
                      {h.service_name}
                    </span>
                    {isTop && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          backgroundColor: "rgba(239, 68, 68, 0.15)",
                          color: "var(--severity-error)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        PRIMARY ROOT CAUSE
                      </span>
                    )}
                  </div>
                  <h4 style={{ margin: "2px 0 0 0", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {h.title}
                  </h4>
                </div>
              </div>

              {/* Confidence badge */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: isTop ? "var(--severity-error)" : "var(--accent-primary)" }}>
                  {confidencePct}%
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  Confidence
                </div>
              </div>
            </div>

            {/* Explanation */}
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "8px 0" }}>
              {h.explanation}
            </p>

            {/* Multi-factor Score Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "8px",
                padding: "10px",
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                margin: "10px 0",
                fontSize: "11px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Time Precedence: </span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {Math.round(h.temporal_precedence_score * 100)}%
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Topology Depth: </span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {Math.round(h.topological_depth_score * 100)}%
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Error Severity: </span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {Math.round(h.error_severity_score * 100)}%
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Trace Correlation: </span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  {Math.round(h.cross_trace_score * 100)}%
                </span>
              </div>
            </div>

            {/* Recommended Action */}
            {h.recommended_action && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "8px 10px",
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  marginBottom: "10px",
                }}
              >
                <Wrench size={14} color="var(--severity-success)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  <strong style={{ color: "var(--severity-success)" }}>Remediation: </strong>
                  {h.recommended_action}
                </span>
              </div>
            )}

            {/* Footer with Evidence Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {(h.evidence_citations || []).length} verified evidence citations
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onViewEvidence(h)}
                style={{ padding: "4px 10px", fontSize: "11px", gap: "5px" }}
              >
                <FileText size={12} />
                View Evidence ({h.evidence_citations?.length || 0})
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
