import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import IncidentMetricCards from "../../components/incidents/IncidentMetricCards";
import IncidentTable from "../../components/incidents/IncidentTable";
import IncidentDetailDrawer from "../../components/incidents/IncidentDetailDrawer";
import { incidentService } from "../../services/incidentService";
import { logSourceService } from "../../services/logSourceService";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  CheckCircle2,
} from "lucide-react";

export default function IncidentsPage() {
  // Query & Filter states
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Data states
  const [incidents, setIncidents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [availableServices, setAvailableServices] = useState([]);

  // Active drawer selection
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState(null);

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [correlating, setCorrelating] = useState(false);
  const [correlationFeedback, setCorrelationFeedback] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available services
  useEffect(() => {
    let mounted = true;
    const fetchServices = async () => {
      try {
        const sources = await logSourceService.getSources();
        if (mounted && Array.isArray(sources)) {
          const svcs = [...new Set(sources.map((s) => s.service_name).filter(Boolean))];
          setAvailableServices(svcs);
        }
      } catch (err) {
        console.error("Failed to fetch services for incident filtering:", err);
      }
    };
    fetchServices();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const stats = await incidentService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error("Failed to fetch incident statistics:", err);
    }
  }, []);

  // Fetch incidents list
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await incidentService.listIncidents({
        status: selectedStatus,
        severity: selectedSeverity,
        service: selectedService,
        search,
        page,
        pageSize,
      });
      setIncidents(data.incidents || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
      setError("Failed to load incidents. Please verify backend service availability.");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedSeverity, selectedService, search, page]);

  useEffect(() => {
    fetchStatistics();
    fetchIncidents();
  }, [fetchStatistics, fetchIncidents]);

  // Fetch incident detail when drawer selected
  const handleSelectIncident = async (id) => {
    setSelectedIncidentId(id);
    setDetailLoading(true);
    try {
      const detail = await incidentService.getIncidentDetail(id);
      setSelectedIncidentDetail(detail);
    } catch (err) {
      console.error("Failed to load incident detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedIncidentId(null);
    setSelectedIncidentDetail(null);
  };

  // Trigger automated correlation
  const handleTriggerCorrelation = async () => {
    setCorrelating(true);
    setCorrelationFeedback(null);
    try {
      const res = await incidentService.correlateIncidents({ lookbackMinutes: 60 });
      setCorrelationFeedback(
        `Correlation completed: ${res.incidents_created} incidents created, ${res.incidents_updated} updated from ${res.anomalies_correlated} anomalies & ${res.clusters_correlated} error clusters.`
      );
      await fetchStatistics();
      await fetchIncidents();
      setTimeout(() => setCorrelationFeedback(null), 6000);
    } catch (err) {
      console.error("Incident correlation failed:", err);
      setCorrelationFeedback("Correlation failed. Ensure anomaly detection runs exist.");
      setTimeout(() => setCorrelationFeedback(null), 5000);
    } finally {
      setCorrelating(false);
    }
  };

  // Status update handler
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const updated = await incidentService.updateStatus(id, { status: newStatus });
      if (selectedIncidentDetail && selectedIncidentDetail.id === id) {
        setSelectedIncidentDetail(updated);
      }
      await fetchStatistics();
      await fetchIncidents();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Note handler
  const handleAddNote = async (id, noteText) => {
    try {
      const updated = await incidentService.addNote(id, { note: noteText, author: "SRE Operator" });
      if (selectedIncidentDetail && selectedIncidentDetail.id === id) {
        setSelectedIncidentDetail(updated);
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Incident Management Command Center"
        description="Automated cross-service incident correlation, timeline reconstruction, and lifecycle tracking"
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                fetchStatistics();
                fetchIncidents();
              }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleTriggerCorrelation}
              disabled={correlating}
              style={{ gap: "6px" }}
            >
              <GitMerge size={14} className={correlating ? "animate-spin" : ""} />
              {correlating ? "Correlating Signals..." : "Correlate Incidents"}
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <IncidentMetricCards statistics={statistics} loading={loading} />

      {/* Feedback Alert */}
      {correlationFeedback && (
        <div
          style={{
            margin: "16px 0",
            padding: "10px 14px",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--severity-success)",
            fontSize: "13px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{correlationFeedback}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="filter-toolbar">
        {/* Left: Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px", maxWidth: "380px" }}>
          <div style={{ position: "relative", width: "100%" }}>
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
              className="form-control"
              placeholder="Search incidents (e.g. INC-1001, Postgres, timeout)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: "32px", fontSize: "12px", height: "36px" }}
            />
          </div>
        </div>

        {/* Right: Filter dropdowns */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Service filter */}
          <select
            className="form-control"
            value={selectedService}
            onChange={(e) => {
              setSelectedService(e.target.value);
              setPage(1);
            }}
            style={{ fontSize: "12px", width: "auto", minWidth: "140px", height: "36px" }}
          >
            <option value="">All Services</option>
            {availableServices.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>

          {/* Severity filter */}
          <select
            className="form-control"
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            style={{ fontSize: "12px", width: "auto", minWidth: "130px", height: "36px" }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Status filter */}
          <select
            className="form-control"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            style={{ fontSize: "12px", width: "auto", minWidth: "130px", height: "36px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="investigating">Investigating</option>
            <option value="mitigated">Mitigated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "var(--severity-error)",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Incidents Table */}
      <IncidentTable
        incidents={incidents}
        loading={loading}
        onSelectIncident={handleSelectIncident}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
        >
          <span>
            Showing page {page} of {totalPages} ({total} total incidents)
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: "4px 8px" }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: "4px 8px" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedIncidentId && (
        <IncidentDetailDrawer
          incident={selectedIncidentDetail}
          loading={detailLoading}
          onClose={handleCloseDrawer}
          onUpdateStatus={handleUpdateStatus}
          onAddNote={handleAddNote}
        />
      )}
    </div>
  );
}
