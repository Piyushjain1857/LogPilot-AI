import React from "react";
import { AlertOctagon, Flame, ShieldAlert, Clock } from "lucide-react";

export default function IncidentMetricCards({ statistics, loading }) {
  if (loading && !statistics) {
    return (
      <div className="metrics-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="metric-card skeleton-card" style={{ height: "105px" }} />
        ))}
      </div>
    );
  }

  const stats = statistics || {
    total_incidents: 0,
    active_incidents: 0,
    critical_incidents: 0,
    mitigated_incidents: 0,
    resolved_incidents: 0,
    mttr_seconds: 0,
  };

  const formatMTTR = (seconds) => {
    if (!seconds || seconds <= 0) return "N/A";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = (seconds / 3600).toFixed(1);
    return `${hrs}h`;
  };

  const cards = [
    {
      title: "Total Incidents",
      value: stats.total_incidents.toLocaleString(),
      subtext: `${stats.resolved_incidents} resolved lifecycle`,
      icon: AlertOctagon,
      color: "var(--text-primary)",
      badgeVariant: "default",
    },
    {
      title: "Active Incidents",
      value: stats.active_incidents.toLocaleString(),
      subtext: `${stats.critical_incidents} critical requiring attention`,
      icon: Flame,
      color: stats.active_incidents > 0 ? "var(--severity-error)" : "var(--severity-info)",
      badgeVariant: stats.active_incidents > 0 ? "error" : "success",
    },
    {
      title: "Mitigated / In Progress",
      value: stats.mitigated_incidents.toLocaleString(),
      subtext: "Workaround or fix applied",
      icon: ShieldAlert,
      color: "var(--severity-warning)",
      badgeVariant: "warning",
    },
    {
      title: "Mean Time to Resolution (MTTR)",
      value: formatMTTR(stats.mttr_seconds),
      subtext: "Average end-to-end resolution duration",
      icon: Clock,
      color: "var(--accent-primary)",
      badgeVariant: "info",
    },
  ];

  return (
    <div className="metrics-grid">
      {cards.map((c, idx) => {
        const IconComponent = c.icon;
        return (
          <div key={idx} className="metric-card">
            <div className="metric-header">
              <span>{c.title}</span>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: `color-mix(in srgb, ${c.color} 15%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: c.color,
                }}
              >
                <IconComponent size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: c.color }}>
              {c.value}
            </div>
            <div className="metric-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{c.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
