import React, { useState } from "react";
import { Wrench, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";

export default function InvestigationStream({ thoughtSteps }) {
  const [expandedSteps, setExpandedSteps] = useState({ 1: true, 2: true });

  if (!thoughtSteps || thoughtSteps.length === 0) {
    return null;
  }

  const toggleStep = (stepNum) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum],
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {thoughtSteps.map((step) => {
        const isExpanded = !!expandedSteps[step.step];

        return (
          <div
            key={step.step}
            style={{
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              overflow: "hidden",
            }}
          >
            {/* Step Header */}
            <div
              onClick={() => toggleStep(step.step)}
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {step.step}
                </span>

                <span
                  className="code-font"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--accent-primary)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Wrench size={10} />
                  {step.tool}
                </span>

                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    maxWidth: "520px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.thought}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={14} color="var(--severity-success)" />
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </div>

            {/* Step Body (Expanded) */}
            {isExpanded && (
              <div
                style={{
                  padding: "12px 14px",
                  borderTop: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-card)",
                  fontSize: "12px",
                }}
              >
                <div style={{ marginBottom: "8px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--text-primary)" }}>Agent Thought: </strong>
                  {step.thought}
                </div>

                {/* Observation Preview */}
                {step.observation && (
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Tool Observation Output:
                    </div>
                    <pre
                      className="code-font"
                      style={{
                        margin: 0,
                        padding: "8px 10px",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "4px",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "11px",
                        color: "var(--text-primary)",
                        maxHeight: "140px",
                        overflowY: "auto",
                      }}
                    >
                      {typeof step.observation === "string"
                        ? step.observation
                        : JSON.stringify(step.observation, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
