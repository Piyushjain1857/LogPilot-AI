import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import ChartCard from "../common/ChartCard";

const BAR_COLORS = [
  "var(--accent-primary)",
  "var(--severity-error)",
  "var(--severity-warning)",
  "var(--status-info)",
  "var(--status-success)",
];

export default function ClusterFrequencyChart({ topClusters = [], loading = false }) {
  const data = (topClusters || []).map((c, idx) => ({
    name: c.name ? (c.name.length > 25 ? c.name.slice(0, 25) + "..." : c.name) : `Pattern ${idx + 1}`,
    count: c.occurrence_count,
    errors: c.error_count,
    service: c.service_name,
  }));

  return (
    <ChartCard
      title="Top Frequent Pattern Clusters"
      subtitle="Highest volume log patterns grouped across microservices"
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
            Loading cluster frequencies...
          </div>
        ) : data.length === 0 ? (
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
            No clusters available to chart
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" name="Occurrences" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}
