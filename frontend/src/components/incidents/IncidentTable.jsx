import React from "react";
import SeverityBadge from "../common/SeverityBadge";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import { AlertOctagon, ArrowUpRight, CheckCircle2, ShieldAlert } from "lucide-react";

export default function IncidentTable({
  incidents,
  loading,
  onSelectIncident,
  onUpdateStatus,
}) {
  if (loading && (!incidents || incidents.length === 0)) {
    return (
      <div className="card" style={{ padding: "32px", textAlign: "center" }}>
        <div className="skeleton-line" style={{ width: "60%", height: "24px", margin: "0 auto 16px" }} />
        <div className="skeleton-line" style={{ width: "80%", height: "16px", margin: "0 auto" }} />
      </div>
    );
  }

  if (!incidents || incidents.length === 0) {
    return (
      <div className="card" style={{ padding: "0" }}>
        <EmptyState
          icon={AlertOctagon}
          title="No Operational Incidents Found"
          description="Trigger multi-signal correlation or adjust filters to review aggregated service failures."
        />
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "active":
        return <Badge variant="error">ACTIVE</Badge>;
      case "investigating":
        return <Badge variant="warning">INVESTIGATING</Badge>;
      case "mitigated":
        return <Badge variant="primary">MITIGATED</Badge>;
      case "resolved":
        return <Badge variant="success">RESOLVED</Badge>;
      case "closed":
        return <Badge variant="default">CLOSED</Badge>;
      default:
        return <Badge variant="default">{status?.toUpperCase()}</Badge>;
    }
  };

  const calculateDuration = (start, end) => {
    if (!start) return "N/A";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffSec = Math.max(0, Math.floor((endDate - startDate) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = (diffSec / 3600).toFixed(1);
    return `${hours}h`;
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="table-responsive">
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Incident</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Severity</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Impacted Services</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>Signals</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Detected</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Duration</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => {
              const detectedFormatted = new Date(inc.first_detected_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const duration = calculateDuration(inc.first_detected_at, inc.resolved_at);

              return (
                <tr
                  key={inc.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background-color 0.15s ease",
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "12px 14px", maxWidth: "340px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                      <span
                        className="code-font"
                        style={{
                          fontWeight: 700,
                          fontSize: "11px",
                          color: "var(--accent-primary)",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {inc.incident_number || inc.id.substring(0, 8)}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inc.title}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inc.description}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {(inc.affected_services || [inc.primary_service || "system"]).map((svc, i) => (
                        <span
                          key={i}
                          className="code-font"
                          style={{
                            fontSize: "10px",
                            backgroundColor: svc === inc.primary_service ? "rgba(239, 68, 68, 0.12)" : "var(--bg-card)",
                            color: svc === inc.primary_service ? "var(--severity-error)" : "var(--text-secondary)",
                            border: "1px solid var(--border-subtle)",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            fontWeight: svc === inc.primary_service ? 700 : 500,
                          }}
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        backgroundColor: "var(--bg-secondary)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      {(inc.anomaly_count || 0) + (inc.cluster_count || 0)} signals
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "11px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {detectedFormatted}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {duration}
                  </td>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    {getStatusBadge(inc.status)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 8px", fontSize: "11px", gap: "4px" }}
                        onClick={() => onSelectIncident(inc.id)}
                      >
                        Inspect
                        <ArrowUpRight size={12} />
                      </button>
                      {inc.status === "active" && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 6px" }}
                          title="Acknowledge & Investigate"
                          onClick={() => onUpdateStatus(inc.id, "investigating")}
                        >
                          <ShieldAlert size={12} />
                        </button>
                      )}
                      {(inc.status === "active" || inc.status === "investigating") && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 6px" }}
                          title="Resolve Incident"
                          onClick={() => onUpdateStatus(inc.id, "resolved")}
                        >
                          <CheckCircle2 size={12} />
                        </button>
                      )}
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
