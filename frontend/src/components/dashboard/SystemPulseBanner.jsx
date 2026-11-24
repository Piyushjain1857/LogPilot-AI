import React from "react";
import {
  Activity,
  Flame,
  RefreshCw,
  Filter,
} from "lucide-react";

export default function SystemPulseBanner({
  telemetry = {},
  timeRange = "24h",
  onTimeRangeChange,
  selectedService = "all",
  onServiceChange,
  onRefresh,
  refreshing = false,
}) {
  const healthIndex = telemetry.system_health_index ?? 98;
  const status = telemetry.system_status || "HEALTHY";
  const eps = telemetry.events_per_second ?? 14.5;
  const epm = telemetry.errors_per_minute ?? 0.4;
  const errorRate = telemetry.error_rate_percentage ?? 0.0;

  const getHealthColor = () => {
    if (healthIndex >= 85) return "var(--status-success)";
    if (healthIndex >= 60) return "var(--status-warning)";
    return "var(--status-critical)";
  };

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-4) var(--space-5)",
        background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        {/* Left: System Health Index & Telemetry Pulse */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              paddingRight: "var(--space-4)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(56, 189, 248, 0.1)",
                border: `2px solid ${getHealthColor()}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: 700, color: getHealthColor() }}>
                {healthIndex}%
              </span>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: getHealthColor(),
                    animation: "pulse 2s infinite",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {status}
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                System Health Index
              </span>
            </div>
          </div>

          {/* Real-Time Rates */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                <Activity size={14} color="var(--accent-primary)" />
                <span>{eps}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>eps</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ingestion Velocity</div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "14px", fontWeight: 600, color: epm > 1 ? "var(--status-critical)" : "var(--text-primary)" }}>
                <Flame size={14} color={epm > 1 ? "var(--status-critical)" : "var(--text-muted)"} />
                <span>{epm}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>err/min</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Error Rate: {errorRate}%</div>
            </div>
          </div>
        </div>

        {/* Right: Global Synchronization Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {/* Service Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="input"
              value={selectedService}
              onChange={(e) => onServiceChange && onServiceChange(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "12px", minWidth: "140px" }}
              aria-label="Filter by microservice"
            >
              <option value="all">All Services (7)</option>
              <option value="gateway-service">gateway-service</option>
              <option value="order-service">order-service</option>
              <option value="payment-service">payment-service</option>
              <option value="auth-service">auth-service</option>
              <option value="notification-service">notification-service</option>
              <option value="postgres-primary">postgres-primary</option>
              <option value="redis-cluster">redis-cluster</option>
            </select>
          </div>

          {/* Time Horizon Pills */}
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              padding: "2px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {["15m", "1h", "6h", "24h", "7d"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onTimeRangeChange && onTimeRangeChange(r)}
                style={{
                  border: "none",
                  backgroundColor: timeRange === r ? "var(--accent-primary)" : "transparent",
                  color: timeRange === r ? "#FFFFFF" : "var(--text-secondary)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 8px",
                  fontSize: "12px",
                  fontWeight: timeRange === r ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Auto-Refresh Toggle & Manual Refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              disabled={refreshing}
              title="Manual Telemetry Refresh"
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span style={{ fontSize: "12px" }}>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
