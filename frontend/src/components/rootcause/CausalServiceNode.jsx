import React from "react";
import { Handle, Position } from "reactflow";
import { AlertCircle, AlertTriangle, CheckCircle, Flame } from "lucide-react";

export default function CausalServiceNode({ data }) {
  const { label, status, error_count, anomaly_score } = data;

  const getStatusConfig = (st) => {
    switch (st) {
      case "ROOT_CAUSE":
        return {
          border: "2px solid var(--severity-error)",
          bg: "color-mix(in srgb, var(--severity-error) 12%, var(--bg-card))",
          glow: "0 0 16px rgba(239, 68, 68, 0.4)",
          badgeBg: "rgba(239, 68, 68, 0.2)",
          badgeColor: "var(--severity-error)",
          icon: Flame,
          text: "ROOT CAUSE",
        };
      case "PROPAGATING":
        return {
          border: "2px solid var(--severity-warning)",
          bg: "color-mix(in srgb, var(--severity-warning) 12%, var(--bg-card))",
          glow: "0 0 12px rgba(245, 158, 11, 0.3)",
          badgeBg: "rgba(245, 158, 11, 0.2)",
          badgeColor: "var(--severity-warning)",
          icon: AlertTriangle,
          text: "PROPAGATING",
        };
      case "SYMPTOM":
        return {
          border: "1px solid var(--border-subtle)",
          bg: "var(--bg-secondary)",
          glow: "none",
          badgeBg: "rgba(100, 116, 139, 0.2)",
          badgeColor: "var(--text-secondary)",
          icon: AlertCircle,
          text: "SYMPTOM",
        };
      default:
        return {
          border: "1px solid var(--border-subtle)",
          bg: "var(--bg-card)",
          glow: "none",
          badgeBg: "rgba(16, 185, 129, 0.15)",
          badgeColor: "var(--severity-success)",
          icon: CheckCircle,
          text: "HEALTHY",
        };
    }
  };

  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "var(--radius-md)",
        backgroundColor: config.bg,
        border: config.border,
        boxShadow: config.glow,
        minWidth: "180px",
        fontFamily: "var(--font-sans)",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "var(--border-subtle)",
          width: "8px",
          height: "8px",
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: config.badgeBg,
            color: config.badgeColor,
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: "4px",
          }}
        >
          <StatusIcon size={11} />
          <span>{config.text}</span>
        </div>

        {error_count > 0 && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--severity-error)",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              padding: "1px 6px",
              borderRadius: "10px",
            }}
          >
            {error_count} err
          </span>
        )}
      </div>

      <div
        className="code-font"
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>

      {anomaly_score > 0 && (
        <div style={{ marginTop: "6px", fontSize: "10px", color: "var(--text-muted)" }}>
          Anomaly Score:{" "}
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {(anomaly_score * 100).toFixed(0)}%
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "var(--border-subtle)",
          width: "8px",
          height: "8px",
        }}
      />
    </div>
  );
}
