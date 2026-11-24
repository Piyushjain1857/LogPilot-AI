import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  Server,
  AlertCircle,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Cpu,
  Plus,
  UploadCloud,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import PageHeader from "../components/common/PageHeader";
import MetricCard from "../components/dashboard/MetricCard";
import CapabilitiesGrid from "../components/dashboard/CapabilitiesGrid";
import ChartCard from "../components/common/ChartCard";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ErrorMessage from "../components/common/ErrorMessage";
import DateRangeSelector from "../components/common/DateRangeSelector";
import { useWorkspace } from "../context/WorkspaceContext";
import { useStreaming } from "../context/StreamingContext";
import {
  getSystemStatus,
  getSystemCapabilities,
  getOverviewSummary,
  getLogActivity,
  getSeverityDistribution,
  getRecentIncidents,
  getSourceHealth,
} from "../services/api";

const SEVERITY_BAR_COLORS = {
  CRITICAL: "#A855F7",
  ERROR: "#EF4444",
  WARNING: "#F59E0B",
  INFO: "#3B82F6",
  DEBUG: "#8492A6",
};

export default function OverviewPage() {
  const { autoRefreshEnabled, autoRefreshInterval } = useWorkspace();

  let streamingState = {
    connectionStatus: "DISCONNECTED",
    streamMetrics: { logsPerSecond: 0, errorsPerMinute: 0, queueDepth: 0, activeSources: 0 },
    totalSessionEvents: 0,
  };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    streamingState = useStreaming();
  } catch (_) {
    // Graceful fallback when rendered outside StreamingProvider in isolated component tests
  }

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [timeRange, setTimeRange] = useState("24h");
  const [systemStatus, setSystemStatus] = useState(null);
  const [capabilities, setCapabilities] = useState({});
  const [summary, setSummary] = useState({
    total_logs: 0,
    error_logs: 0,
    warning_logs: 0,
    critical_logs: 0,
    active_incidents: 0,
    configured_sources: 0,
  });
  const [activity, setActivity] = useState({ points: [] });
  const [severityDist, setSeverityDist] = useState({ total: 0, distribution: [] });
  const [recentIncidents, setRecentIncidents] = useState({ incidents: [] });
  const [sourceHealth, setSourceHealth] = useState({ sources: [] });

  const abortRef = useRef(null);

  const fetchData = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      setError(null);

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      try {
        const [
          statusRes,
          capRes,
          summaryRes,
          activityRes,
          distRes,
          incidentsRes,
          sourcesRes,
        ] = await Promise.all([
          getSystemStatus(signal),
          getSystemCapabilities(signal),
          getOverviewSummary(signal),
          getLogActivity(timeRange, signal),
          getSeverityDistribution(signal),
          getRecentIncidents(5, signal),
          getSourceHealth(signal),
        ]);

        setSystemStatus(statusRes);
        setCapabilities(capRes || {});
        setSummary(summaryRes || { total_logs: 0, error_logs: 0, warning_logs: 0, critical_logs: 0, active_incidents: 0, configured_sources: 0 });
        setActivity(activityRes || { points: [] });
        setSeverityDist(distRes || { total: 0, distribution: [] });
        setRecentIncidents(incidentsRes || { incidents: [] });
        setSourceHealth(sourcesRes || { sources: [] });
        setLastRefreshed(new Date().toLocaleTimeString());
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeRange]
  );

  useEffect(() => {
    fetchData();

    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, autoRefreshInterval * 1000);

    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData, autoRefreshEnabled, autoRefreshInterval]);

  const getGeminiBadge = (status) => {
    switch (status) {
      case "verified":
        return <Badge variant="success">Verified & Active</Badge>;
      case "configured_unverified":
        return <Badge variant="warning">Configured (Unverified)</Badge>;
      case "not_configured":
      default:
        return <Badge variant="default">Not Configured</Badge>;
    }
  };

  return (
    <div>
      <PageHeader
        title="System Overview"
        description="Enterprise AIOps Observability — Live database metrics and telemetry streams."
        badge={
          systemStatus ? (
            <StatusBadge
              status={systemStatus.backend_status === "online" ? "healthy" : "unhealthy"}
              label={systemStatus.backend_status.toUpperCase()}
            />
          ) : null
        }
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {lastRefreshed && (
              <span className="tabular-nums" style={{ fontSize: "var(--text-micro)", color: "var(--text-muted)" }}>
                Updated {lastRefreshed}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchData(true)}
              loading={refreshing}
              icon={RefreshCw}
            >
              Refresh
            </Button>
            <Link to="/app/log-sources">
              <Button variant="secondary" size="sm" icon={Plus}>
                Add Source
              </Button>
            </Link>
            <Link to="/app/log-sources">
              <Button variant="primary" size="sm" icon={UploadCloud}>
                Upload Logs
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <ErrorMessage
          title="Backend Disconnection Notice"
          message={error.message || "Failed to communicate with the FastAPI backend service."}
          onRetry={() => fetchData(true)}
          requestId={error.requestId}
        />
      )}

      {/* Real-Time Ingestion & Streaming Section (Phase 5) */}
      <div
        className="card"
        style={{
          padding: "var(--space-3) var(--space-4)",
          backgroundColor: "var(--bg-card)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          borderLeft: `4px solid ${
            streamingState.connectionStatus === "CONNECTED"
              ? "var(--status-success)"
              : "var(--border-subtle)"
          }`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className={
                streamingState.connectionStatus === "CONNECTED" ? "pulse-dot" : ""
              }
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor:
                  streamingState.connectionStatus === "CONNECTED"
                    ? "var(--status-success)"
                    : "var(--text-muted)",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
              {streamingState.connectionStatus === "CONNECTED" ? "LIVE STREAM ACTIVE" : "STREAMING OFFLINE"}
            </span>
          </div>

          <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "var(--space-4)" }}>
            <span>
              Throughput:{" "}
              <strong style={{ color: "var(--accent-primary)" }}>
                {(streamingState.streamMetrics?.logsPerSecond || 0).toFixed(1)} logs/s
              </strong>
            </span>
            <span>
              Queue Depth:{" "}
              <strong style={{ color: "var(--status-warning)" }}>
                {streamingState.streamMetrics?.queueDepth || 0} / 5,000
              </strong>
            </span>
            <span>
              Active Sources:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {streamingState.streamMetrics?.activeSources || 0}
              </strong>
            </span>
          </div>
        </div>

        <Link to="/app/live-logs">
          <Button variant="secondary" size="xs" icon={ArrowRight}>
            Open Live Console
          </Button>
        </Link>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Ingested Logs"
          value={summary.total_logs.toLocaleString()}
          icon={FileText}
          footerText="Live SQLite count"
          color="var(--text-primary)"
          loading={loading}
        />
        <MetricCard
          title="Error Logs"
          value={summary.error_logs.toLocaleString()}
          icon={AlertCircle}
          footerText="Severity = ERROR"
          color="var(--severity-error)"
          loading={loading}
        />
        <MetricCard
          title="Warning Logs"
          value={summary.warning_logs.toLocaleString()}
          icon={AlertTriangle}
          footerText="Severity = WARNING"
          color="var(--severity-warning)"
          loading={loading}
        />
        <MetricCard
          title="Critical Events"
          value={summary.critical_logs.toLocaleString()}
          icon={ShieldAlert}
          footerText="Severity = CRITICAL"
          color="var(--severity-critical)"
          loading={loading}
        />
        <MetricCard
          title="Active Incidents"
          value={summary.active_incidents.toLocaleString()}
          icon={Cpu}
          footerText="Status = active / investigating"
          color={summary.active_incidents > 0 ? "var(--status-error)" : "var(--status-success)"}
          loading={loading}
        />
        <MetricCard
          title="Configured Sources"
          value={summary.configured_sources.toLocaleString()}
          icon={Server}
          footerText="Active telemetry sources"
          color="var(--accent-primary)"
          loading={loading}
        />
      </div>

      {/* Zero State Guidance if No Logs Ingested */}
      {summary.total_logs === 0 && !loading && !error && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <EmptyState
            title="No Ingested Logs"
            description="Your observability database contains 0 log events. Connect a log source or upload log files to begin telemetry analysis."
            icon={FileText}
            action={
              <Link to="/app/log-sources">
                <Button variant="primary" size="sm" icon={Plus}>
                  Configure First Log Source
                </Button>
              </Link>
            }
          />
        </div>
      )}

      {/* Charts Section: Activity Time Series & Severity Distribution */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "var(--card-gap)",
          marginBottom: "var(--space-6)",
        }}
      >
        {/* Log Activity Area Chart */}
        <ChartCard
          title="Log Ingestion Activity"
          subtitle="Frequency over selected time window"
          loading={loading}
          empty={!activity?.points || activity.points.length === 0}
          emptyMessage="No log activity recorded. Add a log source or ingest logs to visualize volume."
          actions={
            <DateRangeSelector
              selected={timeRange}
              onChange={(newRange) => setTimeRange(newRange)}
            />
          }
        >
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity?.points || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="logVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--status-error)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--status-error)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickFormatter={(val) => {
                    try {
                      return new Date(val).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    } catch {
                      return val;
                    }
                  }}
                  stroke="var(--border-subtle)"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  stroke="var(--border-subtle)"
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Total Logs"
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#logVolumeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="error_count"
                  name="Errors"
                  stroke="var(--status-error)"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#errorGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Severity Breakdown Bar Chart */}
        <ChartCard
          title="Severity Distribution"
          subtitle="Volume breakdown by severity level"
          loading={loading}
          empty={!severityDist?.distribution || severityDist.distribution.length === 0}
          emptyMessage="No severity metrics available. Ingest logs to calculate distribution."
        >
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={severityDist?.distribution || []}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  stroke="var(--border-subtle)"
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="severity"
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  stroke="var(--border-subtle)"
                  width={70}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                  formatter={(val, _name, item) => [`${val} (${item.payload.percentage}%)`, "Count"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {(severityDist?.distribution || []).map((entry) => (
                    <Cell
                      key={entry.severity}
                      fill={SEVERITY_BAR_COLORS[entry.severity] || "var(--accent-primary)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Middle Row: Recent Incidents & Configured Source Health */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "var(--card-gap)",
          marginBottom: "var(--space-6)",
        }}
      >
        {/* Recent Incidents Card */}
        <Card
          title="Recent Incidents"
          headerAction={
            <Link to="/app/incidents" style={{ fontSize: "var(--text-caption)", fontWeight: 500 }}>
              View All
            </Link>
          }
        >
          {!recentIncidents?.incidents || recentIncidents.incidents.length === 0 ? (
            <EmptyState
              title="No Active Incidents"
              description="No correlated service outages or high-severity incidents recorded in the database."
              icon={Cpu}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(recentIncidents?.incidents || []).map((inc) => (
                <div
                  key={inc.id}
                  style={{
                    padding: "var(--space-3)",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: "var(--text-body-sm)", color: "var(--text-primary)" }}>
                      {inc.title}
                    </span>
                    <Badge variant={inc.severity === "CRITICAL" ? "critical" : "error"}>
                      {inc.severity}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "var(--text-micro)", color: "var(--text-muted)" }}>
                    <StatusBadge status={inc.status} />
                    <span>•</span>
                    <span>{inc.affected_services.join(", ") || "General"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Source Health Card */}
        <Card
          title="Telemetry Source Health"
          headerAction={
            <Link to="/app/log-sources" style={{ fontSize: "var(--text-caption)", fontWeight: 500 }}>
              Configure
            </Link>
          }
        >
          {!sourceHealth?.sources || sourceHealth.sources.length === 0 ? (
            <EmptyState
              title="No Log Sources Configured"
              description="Connect an application, server, or file source to start gathering telemetry."
              icon={Server}
              action={
                <Link to="/app/log-sources">
                  <Button variant="primary" size="sm" icon={Plus}>
                    Add Source
                  </Button>
                </Link>
              }
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(sourceHealth?.sources || []).map((src) => (
                <div
                  key={src.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3)",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-body-sm)" }}>{src.name}</div>
                    <div className="code-font" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {src.service_name} • {src.source_type}
                    </div>
                  </div>
                  <StatusBadge status={src.health} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Diagnostic & Capability Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--card-gap)",
          marginBottom: "var(--space-6)",
        }}
      >
        <Card title="System Diagnostics">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)" }}>Backend Availability</span>
              <StatusBadge status={systemStatus?.backend_status === "online" ? "healthy" : "unhealthy"} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)" }}>Database Connectivity</span>
              <Badge variant={systemStatus?.database_connected ? "success" : "error"}>
                {systemStatus?.database_connected ? "SQLite Connected" : "Disconnected"}
              </Badge>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)" }}>AI Engine (Gemini)</span>
              {getGeminiBadge(systemStatus?.gemini_status)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)" }}>Uptime</span>
              <span className="code-font" style={{ fontSize: 12 }}>
                {systemStatus ? `${systemStatus.uptime_seconds}s` : "..."}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)" }}>Auto-Refresh</span>
              <span className="tabular-nums" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {autoRefreshEnabled ? `Active (${autoRefreshInterval}s)` : "Disabled"}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Platform Capabilities Matrix">
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-caption)", marginBottom: "var(--space-3)" }}>
            Truthful reflection of current Phase 3 platform readiness vs planned future stages.
          </p>
          <CapabilitiesGrid capabilities={capabilities} loading={loading} />
        </Card>
      </div>
    </div>
  );
}
