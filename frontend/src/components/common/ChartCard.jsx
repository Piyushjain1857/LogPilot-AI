import React from "react";
import SkeletonLoader from "./SkeletonLoader";
import EmptyState from "./EmptyState";

export default function ChartCard({
  title,
  subtitle = null,
  actions = null,
  children,
  loading = false,
  empty = false,
  emptyMessage = "No telemetry recorded in this time range",
  height = 260,
  className = "",
}) {
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="chart-body" style={{ minHeight: height }}>
        {loading ? (
          <div style={{ padding: "var(--space-6)" }}>
            <SkeletonLoader height={`${height - 48}px`} />
          </div>
        ) : empty ? (
          <EmptyState
            title="No Data Available"
            description={emptyMessage}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
