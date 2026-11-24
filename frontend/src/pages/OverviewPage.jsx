import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Server,
  AlertCircle,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Database,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import MetricCard from "../components/dashboard/MetricCard";
import CapabilitiesGrid from "../components/dashboard/CapabilitiesGrid";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import ErrorMessage from "../components/common/ErrorMessage";
import {
  getSystemStatus,
  getSystemCapabilities,
  getOverviewSummary,
} from "../services/api";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const controller = new AbortController();

    try {
      const [statusRes, capRes, summaryRes] = await Promise.all([
        getSystemStatus(controller.signal),
        getSystemCapabilities(controller.signal),
        getOverviewSummary(controller.signal),
      ]);

      setSystemStatus(statusRes);
      setCapabilities(capRes);
      setSummary(summaryRes);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGeminiBadge = (status) => {
    switch (status) {
      case "verified":
        return <Badge variant="success">Gemini Verified</Badge>;
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
        description="Live operational telemetry, subsystem capability matrix, and database metrics."
        badge={
          systemStatus ? (
            <Badge
              variant={systemStatus.backend_status === "online" ? "success" : "error"}
              icon={systemStatus.backend_status === "online" ? CheckCircle2 : AlertCircle}
            >
              {systemStatus.backend_status.toUpperCase()}
            </Badge>
          ) : null
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            loading={refreshing}
            icon={RefreshCw}
          >
            Refresh Data
          </Button>
        }
      />

      {error && (
        <ErrorMessage
          title="Backend Connection Notice"
          message={error.message || "Failed to communicate with the FastAPI backend service."}
          onRetry={() => fetchData(true)}
          requestId={error.requestId}
        />
      )}

      {/* Metrics Row */}
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
          title="Log Sources"
          value={summary.configured_sources.toLocaleString()}
          icon={Server}
          footerText="Active telemetry sources"
          color="var(--accent-primary)"
          loading={loading}
        />
      </div>

      {/* Middle Row: System Status & Diagnostic Telemetry */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <Card title="System Telemetry & Health">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Backend Availability</span>
              <span style={{ fontWeight: 600 }}>
                {systemStatus ? systemStatus.backend_status.toUpperCase() : "Connecting..."}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Database Connectivity</span>
              <Badge variant={systemStatus?.database_connected ? "success" : "error"}>
                {systemStatus?.database_connected ? "SQLite Connected" : "Disconnected"}
              </Badge>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>AI Engine (Gemini)</span>
              {getGeminiBadge(systemStatus?.gemini_status)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Server Uptime</span>
              <span className="code-font" style={{ fontSize: 13 }}>
                {systemStatus ? `${systemStatus.uptime_seconds}s` : "..."}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Environment</span>
              <span className="code-font" style={{ fontSize: 13 }}>
                {systemStatus?.environment || "development"}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Telemetry State">
          {summary.total_logs === 0 ? (
            <EmptyState
              title="No Ingested Logs"
              description="The SQLite database contains zero log records. Phase 2 log ingestion parsers will populate real-time telemetry here."
              icon={Database}
            />
          ) : (
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Telemetry data is active with {summary.total_logs} records stored.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Subsystem Capabilities Matrix */}
      <Card title="Subsystem Implementation Capabilities">
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: "var(--space-4)" }}>
          Truthful readiness flags as defined by the Phase 1 backend architecture contract.
        </p>
        <CapabilitiesGrid capabilities={capabilities} loading={loading} />
      </Card>
    </div>
  );
}
