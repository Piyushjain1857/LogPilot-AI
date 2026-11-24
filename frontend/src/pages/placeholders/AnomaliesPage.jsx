import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import AnomalyMetricCards from "../../components/anomalies/AnomalyMetricCards";
import AnomalyChart from "../../components/anomalies/AnomalyChart";
import AnomalyTable from "../../components/anomalies/AnomalyTable";
import AnomalyDetailDrawer from "../../components/anomalies/AnomalyDetailDrawer";
import DetectionRunModal from "../../components/anomalies/DetectionRunModal";
import { anomalyService } from "../../services/anomalyService";
import { logSourceService } from "../../services/logSourceService";
import {
  RefreshCw,
  Play,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function AnomaliesPage() {
  // Query & Filter states
  const [selectedService, setSelectedService] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Data states
  const [anomalies, setAnomalies] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modals & Drawers
  const [selectedAnomalyDetail, setSelectedAnomalyDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Load available services for filter dropdown
  useEffect(() => {
    logSourceService
      .listSources()
      .then((sources) => {
        const unique = Array.from(new Set((sources || []).map((s) => s.service_name).filter(Boolean)));
        setServices(unique);
      })
      .catch((_) => {});
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await anomalyService.getStatistics();
      setStats(data);
    } catch (_) {
      /* ignore */
    }
  }, []);

  // Fetch Anomalies
  const fetchAnomalies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (selectedService) params.service = selectedService;
      if (selectedSeverity !== "ALL") params.severity = selectedSeverity;
      if (selectedStatus !== "ALL") params.status = selectedStatus;
      if (selectedAlgorithm !== "ALL") params.algorithm = selectedAlgorithm;

      const data = await anomalyService.listAnomalies(params);
      setAnomalies(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to load anomalies.");
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedService, selectedSeverity, selectedStatus, selectedAlgorithm]);

  useEffect(() => {
    fetchStats();
    fetchAnomalies();
  }, [fetchStats, fetchAnomalies]);

  // Open detail drawer
  const handleSelectAnomaly = async (id) => {
    try {
      const detail = await anomalyService.getAnomalyDetail(id);
      setSelectedAnomalyDetail(detail);
      setIsDetailOpen(true);
    } catch (err) {
      setError("Failed to fetch anomaly diagnostic details.");
    }
  };

  // Status update
  const handleUpdateStatus = async (id, status) => {
    try {
      await anomalyService.updateAnomalyStatus(id, status);
      setNotification(`Anomaly status updated to ${status}.`);
      fetchAnomalies();
      fetchStats();
      if (selectedAnomalyDetail && selectedAnomalyDetail.id === id) {
        const updated = await anomalyService.getAnomalyDetail(id);
        setSelectedAnomalyDetail(updated);
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setError("Failed to update anomaly status.");
    }
  };

  // Rebuild baselines
  const handleRebuildBaselines = async () => {
    setIsRebuilding(true);
    try {
      await anomalyService.rebuildBaselines("5m", 7);
      setNotification("Service statistical baselines successfully rebuilt across 7-day log history.");
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setError("Failed to rebuild service baselines.");
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <div
      className="page-container"
      style={{
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <PageHeader
        title="Anomaly Detection Engine"
        description="Multi-method statistical and machine learning anomaly detection (Z-Score, MAD, EWMA, Isolation Forest)."
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRebuildBaselines}
              disabled={isRebuilding}
              style={{ gap: "6px" }}
            >
              <RotateCcw size={14} className={isRebuilding ? "spinning" : ""} />
              {isRebuilding ? "Rebuilding..." : "Rebuild Baselines"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsRunModalOpen(true)}
              style={{ gap: "6px" }}
            >
              <Play size={14} /> Run Detection
            </button>
          </div>
        }
      />

      {notification && (
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid var(--status-success)",
            color: "var(--status-success)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid var(--severity-error)",
            color: "var(--severity-error)",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <AnomalyMetricCards stats={stats} loading={isLoading} />

      {/* 24-Hour Trend Chart */}
      <AnomalyChart trendData={stats?.recent_trend || []} loading={isLoading} />

      {/* Structured Filter Row */}
      <div
        className="card"
        style={{
          padding: "var(--space-3) var(--space-4)",
          backgroundColor: "var(--bg-card)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
            <Filter size={14} />
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Filters:</span>
          </div>

          {/* Service Selector */}
          <select
            value={selectedService}
            onChange={(e) => {
              setSelectedService(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Services</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div style={{ display: "inline-flex", gap: "4px" }}>
            {["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "ALL"].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn ${selectedStatus === st ? "btn-primary" : "btn-secondary"} btn-xs`}
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={() => {
                  setSelectedStatus(st);
                  setPage(1);
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <div style={{ display: "inline-flex", gap: "4px" }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
              <button
                key={sev}
                type="button"
                className={`btn ${selectedSeverity === sev ? "btn-primary" : "btn-secondary"} btn-xs`}
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={() => {
                  setSelectedSeverity(sev);
                  setPage(1);
                }}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Algorithm Filter */}
          <select
            value={selectedAlgorithm}
            onChange={(e) => {
              setSelectedAlgorithm(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          >
            <option value="ALL">All Algorithms</option>
            <option value="Z_SCORE">Z-Score</option>
            <option value="MAD">MAD</option>
            <option value="EWMA">EWMA</option>
            <option value="ISOLATION_FOREST">Isolation Forest</option>
          </select>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={() => {
            fetchAnomalies();
            fetchStats();
          }}
          title="Refresh"
        >
          <RefreshCw size={12} className={isLoading ? "spinning" : ""} /> Refresh
        </button>
      </div>

      {/* Anomalies Table */}
      <AnomalyTable
        anomalies={anomalies}
        loading={isLoading}
        onSelectAnomaly={handleSelectAnomaly}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) 0",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Showing page {page} of {totalPages} ({total} total anomalies)
          </span>

          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ gap: "4px" }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ gap: "4px" }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Diagnostic Detail Drawer */}
      <AnomalyDetailDrawer
        anomalyDetail={selectedAnomalyDetail}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Run Detection Modal */}
      <DetectionRunModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        services={services}
        onRunDetection={async (payload) => {
          const res = await anomalyService.triggerDetection(payload);
          fetchAnomalies();
          fetchStats();
          return res;
        }}
      />
    </div>
  );
}
