import React from "react";
import SeverityBadge from "../common/SeverityBadge";
import Badge from "../common/Badge";
import { X, CheckCircle, ShieldAlert, AlertOctagon } from "lucide-react";

export default function AnomalyDetailDrawer({
  anomalyDetail,
  isOpen,
  onClose,
  onUpdateStatus,
}) {
  if (!isOpen || !anomalyDetail) return null;

  const anom = anomalyDetail;
  const baseline = anom.baseline;
  const surroundingLogs = anom.surrounding_logs || [];

  const scorePct = Math.round((anom.anomaly_score || 0) * 100);

  const getAlgorithmExplanation = (algo, metric, observed, expected, thresh) => {
    switch (algo) {
      case "Z_SCORE":
        return `Z-Score flagged this window because the observed ${metric} (${observed}) deviated significantly from the rolling historical mean (${expected}), exceeding the dynamic standard deviation threshold (${thresh}).`;
      case "MAD":
        return `Median Absolute Deviation (MAD) flagged an outlier. The observed ${metric} (${observed}) exceeded the modified Z-score threshold relative to the service's median baseline (${expected}), resisting skew from previous burst spikes.`;
      case "EWMA":
        return `Exponentially Weighted Moving Average (EWMA) detected an abrupt drift or surge. The current metric value (${observed}) diverged from the exponential moving baseline (${expected}) by more than the allowed confidence bounds.`;
      case "ISOLATION_FOREST":
        return `Multivariate Isolation Forest identified this time window as an isolation outlier across joint features (log volume, error rate, 5xx rate, and P95 latency).`;
      default:
        return `Flagged by ${algo} algorithm as exceeding dynamic baseline threshold.`;
    }
  };

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
        {/* Drawer Header */}
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
              <SeverityBadge severity={anom.severity} />
              <Badge variant="default">{anom.algorithm}</Badge>
              <Badge variant={anom.status === "ACTIVE" ? "error" : "success"}>{anom.status}</Badge>
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
              {anom.service_name} — {anom.anomaly_type.replace(/_/g, " ")}
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Detected at {new Date(anom.detected_at).toLocaleString()}
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

        {/* Drawer Body */}
        <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Key Metrics Divergence Card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "var(--space-4)",
              backgroundColor: "var(--bg-elevated)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Anomaly Score</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--severity-error)" }}>
                {scorePct}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Observed Value</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                {anom.observed_value}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Expected Baseline</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-secondary)" }}>
                {anom.expected_value}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Threshold</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--severity-warning)" }}>
                {anom.threshold}
              </div>
            </div>
          </div>

          {/* Algorithm Explanation */}
          <div>
            <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
              Algorithm Diagnostic Assessment
            </h4>
            <div
              style={{
                backgroundColor: "var(--bg-elevated)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                borderLeft: "3px solid var(--accent-primary)",
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-primary)",
              }}
            >
              {getAlgorithmExplanation(anom.algorithm, anom.metric_name, anom.observed_value, anom.expected_value, anom.threshold)}
            </div>
          </div>

          {/* Baseline Reference Profile */}
          {baseline && (
            <div>
              <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
                Historical Statistical Baseline Profile
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: "var(--space-3)",
                  backgroundColor: "var(--bg-elevated)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Mean:</span>{" "}
                  <strong>{baseline.mean?.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Std Dev:</span>{" "}
                  <strong>{baseline.std_dev?.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Median:</span>{" "}
                  <strong>{baseline.median?.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>MAD:</span>{" "}
                  <strong>{baseline.mad?.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>EWMA:</span>{" "}
                  <strong>{baseline.ewma_mean?.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>P95:</span>{" "}
                  <strong>{baseline.p95?.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Surrounding Log Records */}
          <div>
            <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
              Surrounding Window Logs ({surroundingLogs.length})
            </h4>
            {surroundingLogs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>No logs recorded in this exact window.</p>
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
                    {surroundingLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
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

        {/* Drawer Footer Actions */}
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
            {anom.status === "ACTIVE" && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onUpdateStatus(anom.id, "ACKNOWLEDGED")}
                style={{ gap: "6px" }}
              >
                <ShieldAlert size={14} /> Acknowledge
              </button>
            )}
            {anom.status !== "RESOLVED" && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onUpdateStatus(anom.id, "RESOLVED")}
                style={{ gap: "6px" }}
              >
                <CheckCircle size={14} /> Mark Resolved
              </button>
            )}
            {anom.status !== "FALSE_POSITIVE" && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onUpdateStatus(anom.id, "FALSE_POSITIVE")}
                style={{ gap: "6px" }}
              >
                <AlertOctagon size={14} /> False Positive
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
