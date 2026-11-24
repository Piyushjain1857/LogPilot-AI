import React from "react";
import SkeletonLoader from "../common/SkeletonLoader";

export default function MetricCard({
  title,
  value,
  footerText = null,
  icon: Icon = null,
  color = "var(--text-primary)",
  loading = false,
  trend = null,
}) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span>{title}</span>
        {Icon && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-md)",
              backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: color,
            }}
          >
            <Icon size={15} />
          </div>
        )}
      </div>
      <div className="metric-value" style={{ color }}>
        {loading ? <SkeletonLoader height="36px" width="80px" /> : value}
      </div>
      {(footerText || trend) && (
        <div className="metric-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{footerText}</span>
          {trend && (
            <span style={{ fontSize: "11px", fontWeight: 600, color: trend.startsWith("+") ? "var(--status-success)" : "var(--status-neutral)" }}>
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
