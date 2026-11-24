import React from "react";
import { AlertTriangle, ShieldAlert, Activity, Cpu } from "lucide-react";
import MetricCard from "../dashboard/MetricCard";

export default function AnomalyMetricCards({ stats, loading = false }) {
  const totalActive = stats?.total_active ?? 0;
  const criticalCount = stats?.critical_count ?? 0;
  const highCount = stats?.high_count ?? 0;
  const avgScore = stats?.avg_anomaly_score ? (stats.avg_anomaly_score * 100).toFixed(1) + "%" : "0.0%";
  const mostAnomalous = stats?.most_anomalous_service || "None";

  return (
    <div className="metrics-grid">
      <MetricCard
        title="Active Anomalies"
        value={loading ? "..." : totalActive.toLocaleString()}
        icon={AlertTriangle}
        footerText={`${highCount} high severity alerts pending`}
      />
      <MetricCard
        title="Critical Anomalies"
        value={loading ? "..." : criticalCount.toLocaleString()}
        icon={ShieldAlert}
        variant={criticalCount > 0 ? "error" : "default"}
        footerText="Requires immediate triage"
      />
      <MetricCard
        title="Avg Anomaly Score"
        value={loading ? "..." : avgScore}
        icon={Activity}
        footerText="Statistical deviation magnitude"
      />
      <MetricCard
        title="Top Outlier Service"
        value={loading ? "..." : mostAnomalous}
        icon={Cpu}
        footerText="Highest frequency of anomalies"
      />
    </div>
  );
}
