import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import ClusterMetricCards from "../../components/clusters/ClusterMetricCards";
import ClusterFrequencyChart from "../../components/clusters/ClusterFrequencyChart";
import ClusterTable from "../../components/clusters/ClusterTable";
import ClusterDetailDrawer from "../../components/clusters/ClusterDetailDrawer";
import { clusterService } from "../../services/clusterService";
import { logSourceService } from "../../services/logSourceService";
import {
  RefreshCw,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function ClusterExplorerPage() {
  // Query & Filter states
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [sortBy, setSortBy] = useState("occurrence_count");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Data states
  const [clusters, setClusters] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMining, setIsMining] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Drawer
  const [selectedClusterDetail, setSelectedClusterDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load available services
  useEffect(() => {
    logSourceService
      .listSources()
      .then((sources) => {
        const unique = Array.from(new Set((sources || []).map((s) => s.service_name).filter(Boolean)));
        setServices(unique);
      })
      .catch((_) => {});
  }, []);

  // Fetch Statistics
  const fetchStats = useCallback(async () => {
    try {
      const data = await clusterService.getStatistics();
      setStats(data);
    } catch (_) {
      /* ignore */
    }
  }, []);

  // Fetch Clusters
  const fetchClusters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedService) params.service = selectedService;
      if (selectedSeverity !== "ALL") params.severity = selectedSeverity;
      if (selectedStatus !== "ALL") params.status = selectedStatus;

      const data = await clusterService.listClusters(params);
      setClusters(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to load cluster patterns.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, selectedService, selectedSeverity, selectedStatus, sortBy]);

  useEffect(() => {
    fetchStats();
    fetchClusters();
  }, [fetchStats, fetchClusters]);

  // Execute Drain3 Mining
  const handleRunMining = async () => {
    setIsMining(true);
    setError(null);
    try {
      const res = await clusterService.mineClusters({ hours: 24, limit: 3000 });
      setNotification(`Drain3 mining completed: processed ${res.logs_processed} logs, created ${res.clusters_created} new templates, updated ${res.clusters_updated} patterns.`);
      fetchClusters();
      fetchStats();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to execute template mining.");
    } finally {
      setIsMining(false);
    }
  };

  // Select Cluster
  const handleSelectCluster = async (id) => {
    try {
      const detail = await clusterService.getClusterDetail(id);
      setSelectedClusterDetail(detail);
      setIsDetailOpen(true);
    } catch (err) {
      setError("Failed to load cluster diagnostic details.");
    }
  };

  // Update Status
  const handleUpdateStatus = async (id, status) => {
    try {
      await clusterService.updateClusterStatus(id, status);
      setNotification(`Cluster marked as ${status}.`);
      fetchClusters();
      fetchStats();
      if (selectedClusterDetail && selectedClusterDetail.cluster.id === id) {
        const updated = await clusterService.getClusterDetail(id);
        setSelectedClusterDetail(updated);
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setError("Failed to update cluster status.");
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Log Clusters & Pattern Mining"
        description="Drain3 template mining, TF-IDF semantic clustering, variable token extraction, and frequency tracking."
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                fetchClusters();
                fetchStats();
              }}
              style={{ gap: "6px" }}
            >
              <RefreshCw size={14} className={isLoading ? "spinning" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleRunMining}
              disabled={isMining}
              style={{ gap: "6px" }}
            >
              <Layers size={14} className={isMining ? "spinning" : ""} />
              {isMining ? "Mining Templates..." : "Mine Templates"}
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

      {/* KPI Cards */}
      <ClusterMetricCards stats={stats} loading={isLoading} />

      {/* Frequency Distribution Chart */}
      <ClusterFrequencyChart topClusters={stats?.top_clusters || []} loading={isLoading} />

      {/* Filter Row */}
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
          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search template patterns..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "6px 10px 6px 30px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                width: "220px",
              }}
            />
          </div>

          {/* Service Selector */}
          <select
            value={selectedService}
            onChange={(e) => {
              setSelectedService(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "6px 10px",
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

          {/* Status Buttons */}
          <div style={{ display: "inline-flex", gap: "4px" }}>
            {["ACTIVE", "MUTED", "RESOLVED", "ALL"].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn ${selectedStatus === st ? "btn-primary" : "btn-secondary"} btn-xs`}
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => {
                  setSelectedStatus(st);
                  setPage(1);
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity Buttons */}
          <div style={{ display: "inline-flex", gap: "4px" }}>
            {["ALL", "CRITICAL", "ERROR", "WARNING", "INFO"].map((sev) => (
              <button
                key={sev}
                type="button"
                className={`btn ${selectedSeverity === sev ? "btn-primary" : "btn-secondary"} btn-xs`}
                style={{ fontSize: "11px", padding: "3px 8px" }}
                onClick={() => {
                  setSelectedSeverity(sev);
                  setPage(1);
                }}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
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
            <option value="occurrence_count">Total Occurrences</option>
            <option value="error_count">Error Frequency</option>
            <option value="last_seen_at">Last Observed</option>
          </select>
        </div>
      </div>

      {/* Clusters Table */}
      <ClusterTable
        clusters={clusters}
        loading={isLoading}
        onSelectCluster={handleSelectCluster}
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
            Showing page {page} of {totalPages} ({total} total clusters)
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

      {/* Cluster Detail Drawer */}
      <ClusterDetailDrawer
        clusterDetail={selectedClusterDetail}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
