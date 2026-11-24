import React from "react";
import SkeletonLoader from "../common/SkeletonLoader";

export default function MetricCard({
  title,
  value,
  footerText = null,
  icon: Icon = null,
  color = "var(--text-primary)",
  loading = false,
}) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span>{title}</span>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <div className="metric-value" style={{ color }}>
        {loading ? <SkeletonLoader height="36px" width="80px" /> : value}
      </div>
      {footerText && <div className="metric-footer">{footerText}</div>}
    </div>
  );
}
