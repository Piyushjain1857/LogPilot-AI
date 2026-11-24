import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import ChartCard from "../common/ChartCard";

export default function AnomalyChart({ trendData = [], loading = false }) {
  const formattedData = (trendData || []).map((pt) => {
    let label = pt.timestamp;
    try {
      const d = new Date(pt.timestamp);
      label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      /* ignore */
    }
    return {
      time: label,
      anomalies: pt.count,
    };
  });

  return (
    <ChartCard
      title="24-Hour Anomaly Distribution Trend"
      subtitle="Hourly frequency of statistical and machine learning anomalies"
    >
      <div style={{ width: "100%", height: 200 }}>
        {loading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "12px",
            }}
          >
            Loading telemetry trend...
          </div>
        ) : formattedData.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "12px",
            }}
          >
            No anomaly trend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--severity-error)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--severity-error)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="anomalies"
                stroke="var(--severity-error)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#anomalyGradient)"
                name="Anomalies"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
