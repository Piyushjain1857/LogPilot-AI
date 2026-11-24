import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LogTable from "../../components/logs/LogTable";
import UploadWizard from "../../components/ingestion/UploadWizard";
import { logService } from "../../services/logService";
import { logSourceService } from "../../services/logSourceService";
import { Search, RefreshCw, UploadCloud, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function LogExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter state
  const batchIdParam = searchParams.get("batch_id") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [uploadBatchId, setUploadBatchId] = useState(batchIdParam);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Data state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Fetch sources for dropdown
  useEffect(() => {
    logSourceService
      .listSources()
      .then((data) => setSources(data || []))
      .catch((err) => console.error("Failed to load sources:", err));
  }, []);

  // Sync batch_id param changes
  useEffect(() => {
    if (batchIdParam) {
      setUploadBatchId(batchIdParam);
    }
  }, [batchIdParam]);

  // Fetch logs with server-side pagination & filtering
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (severity && severity !== "ALL") params.severity = severity;
      if (selectedSourceId) params.source_id = selectedSourceId;
      if (serviceName.trim()) params.service_name = serviceName.trim();
      if (uploadBatchId) params.upload_batch_id = uploadBatchId;

      const data = await logService.listLogs(params);
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.details || err.message || "Failed to query logs from backend.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, severity, selectedSourceId, serviceName, uploadBatchId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSeverity("ALL");
    setSelectedSourceId("");
    setServiceName("");
    setUploadBatchId("");
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    searchQuery || (severity && severity !== "ALL") || selectedSourceId || serviceName || uploadBatchId
  );

  return (
    <div className="page-container" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Page Header */}
      <PageHeader
        title="Logs Explorer"
        subtitle="Search, filter, inspect, and analyze ingested logs across all registered sources and services."
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchLogs} title="Refresh Logs">
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsWizardOpen(true)}
            >
              <UploadCloud size={14} /> Upload Logs
            </button>
          </div>
        }
      />

      {/* Active Batch Filter Banner */}
      {uploadBatchId && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) var(--space-4)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--accent-primary)", borderRadius: "var(--radius-md)", fontSize: "var(--text-caption)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Filter size={14} color="var(--accent-primary)" />
            <span>Filtering records by Upload Batch ID: <strong className="code-font">{uploadBatchId}</strong></span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              setUploadBatchId("");
              setSearchParams({});
            }}
          >
            <X size={13} /> Clear Batch Filter
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ flex: "1 1 240px", minWidth: "220px", position: "relative" }}>
            <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search messages, trace IDs, service names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", height: "36px", paddingLeft: "34px", paddingRight: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "var(--text-caption)" }}
            />
          </div>

          {/* Severity Filter */}
          <div style={{ width: "130px" }}>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%", height: "36px", padding: "0 var(--space-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "var(--text-caption)" }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ERROR">ERROR</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>

          {/* Source Filter */}
          <div style={{ width: "180px" }}>
            <select
              value={selectedSourceId}
              onChange={(e) => {
                setSelectedSourceId(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%", height: "36px", padding: "0 var(--space-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "var(--text-caption)" }}
            >
              <option value="">All Log Sources</option>
              {sources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Filter */}
          <div style={{ width: "150px" }}>
            <input
              type="text"
              placeholder="Filter service..."
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              style={{ width: "100%", height: "36px", padding: "0 var(--space-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "var(--text-caption)", fontFamily: "var(--font-mono)" }}
            />
          </div>

          {/* Submit Search Button */}
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: "36px" }}>
            <Search size={14} /> Search
          </button>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClearFilters}
              style={{ height: "36px" }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </form>
      </div>

      {error && (
        <div style={{ padding: "var(--space-3)", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-md)", color: "var(--status-error)", fontSize: "var(--text-caption)" }}>
          {error}
        </div>
      )}

      {/* Main Logs Table */}
      <div className="card">
        <LogTable
          logs={logs}
          loading={isLoading}
          emptyTitle="No log entries found"
          emptyDescription={
            hasActiveFilters
              ? "No records matched your search query or filter criteria. Try broadening your filters."
              : "No logs have been ingested yet. Click 'Upload Logs' to import a log file."
          }
        />

        {/* Pagination Footer */}
        {total > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--border-subtle)", fontSize: "var(--text-caption)" }}>
            <div style={{ color: "var(--text-secondary)" }}>
              Showing <span className="tabular-nums" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{Math.min((page - 1) * pageSize + 1, total)}</span> to{" "}
              <span className="tabular-nums" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{Math.min(page * pageSize, total)}</span> of{" "}
              <span className="tabular-nums" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{total.toLocaleString()}</span> logs
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ color: "var(--text-muted)" }}>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{ height: "28px", padding: "0 var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: "var(--text-caption)" }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Wizard Modal */}
      <UploadWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          fetchLogs();
        }}
        onIngestionComplete={() => {
          fetchLogs();
        }}
        onExploreLogs={(batch) => {
          setIsWizardOpen(false);
          setUploadBatchId(batch.id);
          setPage(1);
        }}
      />
    </div>
  );
}
