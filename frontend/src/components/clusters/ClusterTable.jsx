import React from "react";
import SeverityBadge from "../common/SeverityBadge";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import { Layers, Eye, VolumeX, Volume2, CheckCircle2 } from "lucide-react";

export default function ClusterTable({
  clusters = [],
  loading = false,
  onSelectCluster,
  onUpdateStatus,
}) {
  if (loading) {
    return (
      <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Mining and loading cluster groups...</p>
      </div>
    );
  }

  if (!clusters || clusters.length === 0) {
    return (
      <div className="card" style={{ padding: "0" }}>
        <EmptyState
          icon={Layers}
          title="No Pattern Clusters Found"
          description="Execute template mining to extract reusable patterns and group recurring log events."
        />
      </div>
    );
  }

  const renderTemplateWithBadges = (template) => {
    const parts = template.split(/(<[^>]+>)/g);
    return (
      <span className="code-font" style={{ fontSize: "12px", lineHeight: 1.5 }}>
        {parts.map((part, idx) => {
          if (part.startsWith("<") && part.endsWith(">")) {
            return (
              <span
                key={idx}
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "var(--accent-primary)",
                  padding: "1px 4px",
                  borderRadius: "3px",
                  fontWeight: 600,
                  fontSize: "11px",
                  margin: "0 2px",
                }}
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="primary">ACTIVE</Badge>;
      case "MUTED":
        return <Badge variant="warning">MUTED</Badge>;
      case "RESOLVED":
        return <Badge variant="success">RESOLVED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="table-responsive">
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Service</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Extracted Template Pattern</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Severity</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>Occurrences</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>Errors</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Last Seen</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((c) => {
              const lastSeenFormatted = new Date(c.last_seen_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background-color 0.15s ease",
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "12px 14px", fontSize: "12px", whiteSpace: "nowrap" }}>
                    <span className="code-font" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {c.service_name}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", maxWidth: "420px" }}>
                    <div>
                      {c.name && (
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "2px" }}>
                          {c.name}
                        </div>
                      )}
                      {renderTemplateWithBadges(c.template)}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <SeverityBadge severity={c.severity} />
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span className="tabular-nums" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {c.occurrence_count.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: 700,
                        color: c.error_count > 0 ? "var(--severity-error)" : "var(--text-muted)",
                      }}
                    >
                      {c.error_count.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {lastSeenFormatted}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {getStatusBadge(c.status)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      {c.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => onUpdateStatus(c.id, "MUTED")}
                          title="Mute Cluster"
                        >
                          <VolumeX size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => onUpdateStatus(c.id, "ACTIVE")}
                          title="Unmute Cluster"
                        >
                          <Volume2 size={12} />
                        </button>
                      )}
                      {c.status !== "RESOLVED" && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => onUpdateStatus(c.id, "RESOLVED")}
                          title="Mark Resolved"
                        >
                          <CheckCircle2 size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => onSelectCluster(c.id)}
                        title="View Pattern Details & Members"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
