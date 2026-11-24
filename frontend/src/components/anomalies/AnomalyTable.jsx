import React from "react";
import SeverityBadge from "../common/SeverityBadge";
import Badge from "../common/Badge";
import EmptyState from "../common/EmptyState";
import { AlertTriangle, CheckCircle, Eye, ShieldAlert } from "lucide-react";

export default function AnomalyTable({
  anomalies = [],
  loading = false,
  onSelectAnomaly,
  onUpdateStatus,
}) {
  if (loading) {
    return (
      <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading anomaly records...</p>
      </div>
    );
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="card" style={{ padding: "0" }}>
        <EmptyState
          icon={AlertTriangle}
          title="No Anomalies Detected"
          description="System behavior is operating within established statistical confidence bands."
        />
      </div>
    );
  }

  const getAlgorithmBadge = (algo) => {
    switch (algo) {
      case "Z_SCORE":
        return <Badge variant="info">Z-Score</Badge>;
      case "MAD":
        return <Badge variant="default">MAD</Badge>;
      case "EWMA":
        return <Badge variant="warning">EWMA</Badge>;
      case "ISOLATION_FOREST":
        return <Badge variant="primary">Isolation Forest</Badge>;
      default:
        return <Badge variant="default">{algo}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="error">ACTIVE</Badge>;
      case "ACKNOWLEDGED":
        return <Badge variant="warning">ACKNOWLEDGED</Badge>;
      case "RESOLVED":
        return <Badge variant="success">RESOLVED</Badge>;
      case "FALSE_POSITIVE":
        return <Badge variant="default">FALSE POSITIVE</Badge>;
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
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Detected</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Service</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Anomaly Type</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Severity</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Score</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Observed vs Expected</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Algorithm</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>Status</th>
              <th style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((anom) => {
              const scorePct = Math.round((anom.anomaly_score || 0) * 100);
              let scoreColor = "var(--severity-info)";
              if (scorePct >= 80) scoreColor = "var(--severity-critical)";
              else if (scorePct >= 65) scoreColor = "var(--severity-error)";
              else if (scorePct >= 45) scoreColor = "var(--severity-warning)";

              const formattedTime = new Date(anom.detected_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <tr
                  key={anom.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background-color 0.15s ease",
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "12px 14px", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {formattedTime}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                    <span className="code-font" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {anom.service_name}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {anom.anomaly_type.replace(/_/g, " ")}
                    </span>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Metric: {anom.metric_name}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <SeverityBadge severity={anom.severity} />
                  </td>
                  <td style={{ padding: "12px 14px", minWidth: "120px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          flex: 1,
                          height: "6px",
                          backgroundColor: "var(--bg-elevated)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${scorePct}%`,
                            height: "100%",
                            backgroundColor: scoreColor,
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                      <span className="tabular-nums" style={{ fontSize: "11px", fontWeight: 700, color: scoreColor }}>
                        {scorePct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                    <div>
                      <strong style={{ color: scoreColor }}>{anom.observed_value}</strong>{" "}
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                        (exp: {anom.expected_value})
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {getAlgorithmBadge(anom.algorithm)}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {getStatusBadge(anom.status)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      {anom.status === "ACTIVE" && onUpdateStatus && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => onUpdateStatus(anom.id, "ACKNOWLEDGED")}
                          title="Acknowledge Anomaly"
                        >
                          <ShieldAlert size={12} /> Ack
                        </button>
                      )}
                      {anom.status !== "RESOLVED" && onUpdateStatus && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => onUpdateStatus(anom.id, "RESOLVED")}
                          title="Mark as Resolved"
                        >
                          <CheckCircle size={12} /> Resolve
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => onSelectAnomaly(anom.id)}
                        title="View Anomaly Diagnostics"
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
