import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import AdvancedSearchBar from "../../components/search/AdvancedSearchBar";
import SavedSearchesModal from "../../components/search/SavedSearchesModal";
import ExportDialog from "../../components/search/ExportDialog";
import LogDetailDrawer from "../../components/search/LogDetailDrawer";
import LogTable from "../../components/logs/LogTable";
import UploadWizard from "../../components/ingestion/UploadWizard";
import { searchService } from "../../services/searchService";
import { logSourceService } from "../../services/logSourceService";
import { logService } from "../../services/logService";
import {
  RefreshCw,
  UploadCloud,
  Download,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Zap,
  Filter,
  X,
} from "lucide-react";

export default function LogExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Query & Filter state
  const initialQuery = searchParams.get("q") || "";
  const initialSeverity = searchParams.get("severity") || "ALL";
  const initialService = searchParams.get("service") || "";
  const initialSourceId = searchParams.get("source_id") || "";

  const [query, setQuery] = useState(initialQuery);
  const [severity, setSeverity] = useState(initialSeverity);
  const [serviceName, setServiceName] = useState(initialService);
  const [selectedSourceId, setSelectedSourceId] = useState(initialSourceId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Data state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Modals & Drawers state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Load sources for dropdown
  useEffect(() => {
    logSourceService
      .listSources()
      .then((data) => setSources(data || []))
      .catch((err) => console.error("Failed to load sources:", err));
  }, []);

  // Fetch search suggestions on query input
  useEffect(() => {
    if (query.trim().length > 1) {
      searchService
        .getSuggestions(query.trim())
        .then((data) => setSuggestions(data || []))
        .catch(() => {});
    } else {
      searchService
        .getSuggestions("")
        .then((data) => setSuggestions(data || []))
        .catch(() => {});
    }
  }, [query]);

  // Load saved searches
  const loadSavedSearches = useCallback(async () => {
    try {
      const data = await searchService.listSavedSearches();
      setSavedSearches(data || []);
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  // Execute Search
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {};
      if (severity && severity !== "ALL") filters.severity = severity;
      if (serviceName.trim()) filters.service_name = serviceName.trim();
      if (selectedSourceId) filters.source_id = selectedSourceId;

      const payload = {
        query: query.trim() || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        page,
        page_size: pageSize,
        sort_by: "timestamp",
        sort_order: "desc",
      };

      let res;
      try {
        res = await searchService.advancedSearch(payload);
      } catch (searchErr) {
        if (logService && typeof logService.listLogs === "function") {
          try {
            res = await logService.listLogs({
              page,
              page_size: pageSize,
              severity: severity !== "ALL" ? severity : undefined,
              service_name: serviceName.trim() || undefined,
            });
          } catch (_) {
            throw searchErr;
          }
        } else {
          throw searchErr;
        }
      }
      setLogs(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
      setStats(res.stats || null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Search query failed.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, query, severity, serviceName, selectedSourceId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = () => {
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setQuery("");
    setSeverity("ALL");
    setServiceName("");
    setSelectedSourceId("");
    setPage(1);
    setSearchParams({});
  };

  const handleSaveSearch = async (saveData) => {
    try {
      await searchService.createSavedSearch(saveData);
      loadSavedSearches();
    } catch (err) {
      console.error("Failed to save search:", err);
    }
  };

  const handleDeleteSavedSearch = async (id) => {
    try {
      await searchService.deleteSavedSearch(id);
      loadSavedSearches();
    } catch (err) {
      console.error("Failed to delete saved search:", err);
    }
  };

  const handleExport = async ({ format, limit }) => {
    const filters = {};
    if (severity && severity !== "ALL") filters.severity = severity;
    if (serviceName.trim()) filters.service_name = serviceName.trim();
    if (selectedSourceId) filters.source_id = selectedSourceId;

    const blob = await searchService.exportLogs({
      query: query.trim() || undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      format,
      limit,
    });

    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `logpilot_export_${Date.now()}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const hasActiveFilters = Boolean(
    query || (severity && severity !== "ALL") || serviceName || selectedSourceId
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Logs Explorer"
        description="FTS5 Full-Text Search, safe query language filters, distributed trace grouping, and exports."
        actions={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsSavedModalOpen(true)}
              style={{ gap: "6px" }}
            >
              <Bookmark size={14} /> Saved Searches ({savedSearches.length})
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsExportOpen(true)}
              disabled={total === 0}
              style={{ gap: "6px" }}
            >
              <Download size={14} /> Export
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsWizardOpen(true)}
              style={{ gap: "6px" }}
            >
              <UploadCloud size={14} /> Import File
            </button>
          </div>
        }
      />

      {/* Advanced Search Bar Component */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <AdvancedSearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearchSubmit}
          suggestions={suggestions}
          onOpenSaved={() => setIsSavedModalOpen(true)}
        />

        {/* Structured Filter Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            backgroundColor: "var(--bg-card)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Filter size={14} color="var(--text-muted)" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Filters:
              </span>
            </div>

            {/* Severity Pill Selector */}
            <div style={{ display: "flex", gap: "4px" }}>
              {["ALL", "CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => {
                    setSeverity(sev);
                    setPage(1);
                  }}
                  className={`btn ${severity === sev ? "btn-primary" : "btn-secondary"} btn-xs`}
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Service Filter */}
            <input
              type="text"
              placeholder="Filter by service..."
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                width: "160px",
              }}
            />

            {/* Source Filter */}
            {sources.length > 0 && (
              <select
                value={selectedSourceId}
                onChange={(e) => {
                  setSelectedSourceId(e.target.value);
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
                <option value="">All Sources</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.service_name})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={handleClearFilters}
                style={{ gap: "4px" }}
              >
                <X size={12} /> Clear Filters
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={fetchLogs}
              title="Refresh search"
            >
              <RefreshCw size={12} className={isLoading ? "spinning" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Query Stats & FTS5 Status Strip */}
      {stats && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--text-secondary)",
            padding: "0 var(--space-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span>
              Found <strong style={{ color: "var(--text-primary)" }}>{total.toLocaleString()}</strong> records
              in <strong style={{ color: "var(--accent-primary)" }}>{stats.query_duration_ms}ms</strong>
            </span>
            {stats.fts_enabled && (
              <span className="badge badge-success" style={{ fontSize: "10px", gap: "4px", padding: "1px 6px" }}>
                <Zap size={10} /> FTS5 Active
              </span>
            )}
          </div>

          {stats.matched_services && stats.matched_services.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "var(--text-muted)" }}>Services:</span>
              {stats.matched_services.slice(0, 4).map((s) => (
                <span key={s} className="format-pill" style={{ fontSize: "10px" }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card" style={{ padding: "var(--space-4)", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--status-error)" }}>
          <span style={{ color: "var(--status-error)", fontSize: "13px" }}>{error}</span>
        </div>
      )}

      {/* Log Results Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <LogTable
          logs={logs}
          isLoading={isLoading}
          onRowClick={(log) => setSelectedLog(log)}
        />

        {/* Pagination Bar */}
        {total > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-elevated)",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "12px",
            }}
          >
            <div style={{ color: "var(--text-muted)" }}>
              Showing {((page - 1) * pageSize + 1).toLocaleString()} to{" "}
              {Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()} records
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                <span>Page size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: "2px 6px",
                    fontSize: "11px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span style={{ padding: "4px 8px", color: "var(--text-primary)", fontWeight: 600 }}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Slide-over Drawer */}
      <LogDetailDrawer
        log={selectedLog}
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
      />

      {/* Saved Searches Modal */}
      <SavedSearchesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedSearches={savedSearches}
        onSelectSearch={(savedQuery) => {
          setQuery(savedQuery);
          setPage(1);
        }}
        onSaveCurrentQuery={handleSaveSearch}
        onDeleteSearch={handleDeleteSavedSearch}
        currentQuery={query}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
        totalRecords={total}
      />

      {/* File Upload Wizard */}
      <UploadWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onUploadComplete={() => {
          setIsWizardOpen(false);
          fetchLogs();
        }}
      />
    </div>
  );
}
