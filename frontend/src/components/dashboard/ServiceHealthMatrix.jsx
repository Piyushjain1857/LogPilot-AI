import React from "react";
import { Link } from "react-router-dom";
import {
  Server,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export default function ServiceHealthMatrix({
  services = [],
  selectedService = "all",
  onSelectService,
  loading = false,
}) {
  const getHealthBadge = (health) => {
    switch (health) {
      case "HEALTHY":
        return (
          <span className="badge badge-success" style={{ gap: 4, fontSize: "11px" }}>
            <CheckCircle2 size={11} /> Healthy
          </span>
        );
      case "DEGRADED":
        return (
          <span className="badge badge-warning" style={{ gap: 4, fontSize: "11px" }}>
            <AlertTriangle size={11} /> Degraded
          </span>
        );
      case "CRITICAL":
        return (
          <span className="badge badge-critical" style={{ gap: 4, fontSize: "11px" }}>
            <AlertCircle size={11} /> Critical
          </span>
        );
      default:
        return <span className="badge badge-neutral">{health}</span>;
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-2)",
        }}
      >
        <div>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            Microservice Health & Telemetry Matrix
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Cross-service error saturation, request latency, and incident blast radius across monitored services.
          </p>
        </div>

        {selectedService !== "all" && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onSelectService && onSelectService("all")}
            style={{ fontSize: "12px", color: "var(--accent-primary)" }}
          >
            Clear Filter (Show All)
          </button>
        )}
      </div>

      {loading && services.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)" }}>
          Loading service matrix...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {services.map((svc) => {
            const isSelected = selectedService === svc.service_name;
            return (
              <div
                key={svc.service_name}
                onClick={() => onSelectService && onSelectService(isSelected ? "all" : svc.service_name)}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  backgroundColor: isSelected ? "rgba(56, 189, 248, 0.08)" : "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: isSelected ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Server size={14} color="var(--accent-primary)" />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {svc.service_name}
                    </span>
                  </div>
                  {getHealthBadge(svc.health)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
                  <span>{svc.tier}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={11} /> {svc.avg_latency_ms}ms avg
                  </span>
                </div>

                {/* Metrics Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "var(--space-2)",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Logs: </span>
                    <strong style={{ color: "var(--text-primary)" }}>{svc.log_count}</strong>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Error Rate: </span>
                    <strong style={{ color: svc.error_rate > 5 ? "var(--status-critical)" : "var(--text-primary)" }}>
                      {svc.error_rate}%
                    </strong>
                  </div>

                  <Link
                    to={`/app/log-explorer?service=${encodeURIComponent(svc.service_name)}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: "var(--accent-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      fontSize: "11px",
                      textDecoration: "none",
                    }}
                  >
                    Logs <ArrowUpRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
