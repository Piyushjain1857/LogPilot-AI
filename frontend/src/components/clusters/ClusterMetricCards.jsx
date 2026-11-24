import React from "react";
import { Layers, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import MetricCard from "../dashboard/MetricCard";

export default function ClusterMetricCards({ stats, loading = false }) {
  const total = stats?.total_clusters ?? 0;
  const active = stats?.active_clusters ?? 0;
  const groupedErrors = stats?.total_grouped_errors ?? 0;
  const new24h = stats?.new_last_24h ?? 0;

  return (
    <div className="metrics-grid">
      <MetricCard
        title="Total Patterns Mined"
        value={loading ? "..." : total.toLocaleString()}
        icon={Layers}
        footerText={`${active} currently active clusters`}
      />
      <MetricCard
        title="Grouped Error Events"
        value={loading ? "..." : groupedErrors.toLocaleString()}
        icon={ShieldAlert}
        variant={groupedErrors > 0 ? "error" : "default"}
        footerText="Aggregated from raw failure logs"
      />
      <MetricCard
        title="New Clusters (24h)"
        value={loading ? "..." : new24h.toLocaleString()}
        icon={Clock}
        footerText="Novel error templates discovered"
      />
      <MetricCard
        title="Resolved Clusters"
        value={loading ? "..." : (stats?.resolved_clusters ?? 0).toLocaleString()}
        icon={CheckCircle}
        footerText="Treated and remediated patterns"
      />
    </div>
  );
}
