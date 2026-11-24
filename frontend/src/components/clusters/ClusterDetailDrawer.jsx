import React from "react";
import SeverityBadge from "../common/SeverityBadge";
import Badge from "../common/Badge";
import { X, VolumeX, Volume2, CheckCircle2 } from "lucide-react";

export default function ClusterDetailDrawer({
  clusterDetail,
  isOpen,
  onClose,
  onUpdateStatus,
}) {
  if (!isOpen || !clusterDetail) return null;

  const c = clusterDetail;
  const memberLogs = c.member_logs || [];
  const variables = c.variable_parameters || {};

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          height: "100%",
          backgroundColor: "var(--bg-card)",
          borderLeft: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
              <SeverityBadge severity={c.severity} />
              <Badge variant="default">{c.service_name}</Badge>
              <Badge variant={c.status === "ACTIVE" ? "primary" : c.status === "RESOLVED" ? "success" : "warning"}>
                {c.status}
              </Badge>
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              {c.name || "Mined Log Pattern"}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }} className="code-font">
              Hash: {c.signature_hash ? c.signature_hash.slice(0, 16) : c.id}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={onClose}
            style={{ borderRadius: "50%", width: 28, height: 28, padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Occurrence KPI Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "var(--space-3)",
              backgroundColor: "var(--bg-elevated)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total Count</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                {c.occurrence_count?.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Error Events</div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: c.error_count > 0 ? "var(--severity-error)" : "var(--text-muted)",
                }}
              >
                {c.error_count?.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>First Observed</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginTop: "4px" }}>
                {new Date(c.first_seen_at).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Last Observed</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginTop: "4px" }}>
                {new Date(c.last_seen_at).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Extracted Template Block */}
          <div>
            <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
              Drain3 Normalized Template
            </h4>
            <div
              className="code-font"
              style={{
                backgroundColor: "var(--bg-elevated)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--accent-primary)",
                wordBreak: "break-all",
              }}
            >
              {c.template}
            </div>
          </div>

          {/* Extracted Variable Parameters */}
          {Object.keys(variables).length > 0 && (
            <div>
              <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
                Observed Variable Parameter Values
              </h4>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  backgroundColor: "var(--bg-elevated)",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {Object.entries(variables).map(([key, vals]) => (
                  <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-secondary)", minWidth: "60px" }}>
                      &lt;{key.toUpperCase()}&gt;:
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {vals.map((v, i) => (
                        <span
                          key={i}
                          className="code-font"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            fontSize: "11px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member Log Events */}
          <div>
            <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
              Recent Member Log Records ({memberLogs.length})
            </h4>
            {memberLogs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No member logs stored in cache.</p>
            ) : (
              <div
                style={{
                  maxHeight: "260px",
                  overflowY: "auto",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Timestamp</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Severity</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Message</th>
                      <th style={{ padding: "6px 10px", textAlign: "right" }}>Trace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}
                        </td>
                        <td style={{ padding: "6px 10px" }}>
                          <SeverityBadge severity={log.severity} />
                        </td>
                        <td style={{ padding: "6px 10px", color: "var(--text-primary)" }}>
                          {log.message}
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }} className="code-font">
                          {log.trace_id ? log.trace_id.slice(0, 8) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            marginTop: "auto",
            padding: "var(--space-4) var(--space-6)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {c.status === "ACTIVE" ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onUpdateStatus(c.id, "MUTED")}
                style={{ gap: "6px" }}
              >
                <VolumeX size={14} /> Mute Cluster
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onUpdateStatus(c.id, "ACTIVE")}
                style={{ gap: "6px" }}
              >
                <Volume2 size={14} /> Unmute Cluster
              </button>
            )}

            {c.status !== "RESOLVED" && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onUpdateStatus(c.id, "RESOLVED")}
                style={{ gap: "6px" }}
              >
                <CheckCircle2 size={14} /> Mark Resolved
              </button>
            )}
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
