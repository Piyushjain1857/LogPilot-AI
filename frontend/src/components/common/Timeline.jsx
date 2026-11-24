import React from "react";

export default function Timeline({ events = [], className = "" }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-caption)" }}>
        No timeline events recorded.
      </div>
    );
  }

  return (
    <div className={`timeline-container ${className}`}>
      {events.map((evt, idx) => (
        <div key={evt.id || idx} className="timeline-item">
          <div
            className="timeline-dot"
            style={{ backgroundColor: evt.color || "var(--accent-primary)" }}
          />
          <div className="timeline-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: "var(--text-body-sm)" }}>{evt.title}</span>
              <span className="code-font" style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)" }}>
                {evt.timestamp}
              </span>
            </div>
            {evt.description && (
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-secondary)", margin: 0 }}>
                {evt.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
