import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import TraceTimeline from "../../components/traces/TraceTimeline";
import { traceService } from "../../services/traceService";
import {
  GitBranch,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

export default function TraceExplorerPage() {
  const { traceId: routeTraceId } = useParams();
  const navigate = useNavigate();

  // Trace list state
  const [traces, setTraces] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [search, setSearch] = useState("");
  const [hasErrorsOnly, setHasErrorsOnly] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Trace detail state
  const [selectedTraceId, setSelectedTraceId] = useState(routeTraceId || null);
  const [traceDetail, setTraceDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Sync route param
  useEffect(() => {
    if (routeTraceId) {
      setSelectedTraceId(routeTraceId);
    }
  }, [routeTraceId]);

  // Fetch trace list
  const fetchTraces = useCallback(async () => {
    setIsLoadingList(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (hasErrorsOnly) params.has_errors = true;

      const data = await traceService.listTraces(params);
      setTraces(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load trace list");
    } finally {
      setIsLoadingList(false);
    }
  }, [page, pageSize, search, hasErrorsOnly]);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  // Fetch trace detail when selected
  useEffect(() => {
    if (!selectedTraceId) {
      setTraceDetail(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetail(true);
    setError(null);

    traceService
      .getTraceDetail(selectedTraceId)
      .then((data) => {
        if (isMounted) setTraceDetail(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.response?.data?.detail || err.message || "Failed to load trace detail");
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTraceId]);

  const handleSelectTrace = (tId) => {
    setSelectedTraceId(tId);
    navigate(`/app/traces/${tId}`);
  };

  const handleBackToList = () => {
    setSelectedTraceId(null);
    setTraceDetail(null);
    navigate("/app/traces");
  };

  const handleCopyTraceId = (tId) => {
    navigator.clipboard.writeText(tId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- DETAIL VIEW ---
  if (selectedTraceId) {
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
          title="Trace Investigation Waterfall"
          description={`Distributed transaction timeline for trace ${selectedTraceId}`}
          actions={
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleBackToList}
                style={{ gap: "6px" }}
              >
                <ArrowLeft size={14} /> Back to Traces
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopyTraceId(selectedTraceId)}
                style={{ gap: "6px" }}
              >
                {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Trace ID"}
              </button>
            </div>
          }
        />

        {error && (
          <div className="card" style={{ padding: "var(--space-4)", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--status-error)" }}>
            <span style={{ color: "var(--status-error)", fontSize: "13px" }}>{error}</span>
          </div>
        )}

        {isLoadingDetail ? (
          <div className="card" style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--text-muted)" }}>
            <RefreshCw size={24} className="spinning" style={{ margin: "0 auto var(--space-2)" }} />
            <div>Loading distributed trace waterfall...</div>
          </div>
        ) : traceDetail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* Trace KPI Summary Card */}
            <div
              className="card"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "var(--space-4)",
                padding: "var(--space-4)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Duration</span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-primary)", marginTop: "2px" }}>
                  {traceDetail.duration_ms} ms
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Events</span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                  {traceDetail.total_events}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Error Events</span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: traceDetail.error_count > 0 ? "var(--status-error)" : "var(--status-success)", marginTop: "2px" }}>
                  {traceDetail.error_count}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Services Involved</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                  {traceDetail.services.map((s) => (
                    <span key={s} className="format-pill" style={{ fontSize: "11px", fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Waterfall Timeline */}
            <div className="card" style={{ padding: "var(--space-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Chronological Span Timeline</h4>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Click row to view event payload & context
                </span>
              </div>
              <TraceTimeline events={traceDetail.events} durationMs={traceDetail.duration_ms} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // --- LIST VIEW ---
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
        title="Trace Explorer"
        description="Investigate correlated distributed transactions across microservices, observe latencies, and pinpoint error cascades."
        badge={
          <span className="badge badge-info" style={{ gap: "4px" }}>
            <GitBranch size={12} /> {total.toLocaleString()} Traces
          </span>
        }
      />

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          backgroundColor: "var(--bg-card)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1 }}>
          <div style={{ position: "relative", minWidth: "280px" }}>
            <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "10px" }} />
            <input
              type="text"
              placeholder="Search by Trace ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "6px 12px 6px 32px",
                fontSize: "12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={hasErrorsOnly}
              onChange={(e) => {
                setHasErrorsOnly(e.target.checked);
                setPage(1);
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>Traces with Errors Only</span>
          </label>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={fetchTraces}
          title="Refresh traces"
        >
          <RefreshCw size={12} className={isLoadingList ? "spinning" : ""} />
        </button>
      </div>

      {/* Traces Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>
              <th style={{ padding: "10px 14px" }}>Trace ID</th>
              <th style={{ padding: "10px 14px" }}>Root Service</th>
              <th style={{ padding: "10px 14px" }}>Services Involved</th>
              <th style={{ padding: "10px 14px" }}>Events</th>
              <th style={{ padding: "10px 14px" }}>Duration</th>
              <th style={{ padding: "10px 14px" }}>Errors</th>
              <th style={{ padding: "10px 14px" }}>Timestamp</th>
              <th style={{ padding: "10px 14px" }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoadingList ? (
              <tr>
                <td colSpan={8} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>
                  <RefreshCw size={16} className="spinning" style={{ margin: "0 auto var(--space-2)" }} />
                  Loading distributed traces...
                </td>
              </tr>
            ) : traces.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>
                  No distributed traces found. Logs with <code className="format-pill">trace_id</code> will appear here automatically.
                </td>
              </tr>
            ) : (
              traces.map((t) => (
                <tr
                  key={t.trace_id}
                  onClick={() => handleSelectTrace(t.trace_id)}
                  style={{
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background-color var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--accent-primary)", fontWeight: 600 }}>
                    {t.trace_id}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {t.root_service}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {t.services.slice(0, 3).map((s) => (
                        <span key={s} className="format-pill" style={{ fontSize: "10px" }}>
                          {s}
                        </span>
                      ))}
                      {t.services.length > 3 && (
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          +{t.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>
                    {t.event_count}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    {t.duration_ms} ms
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {t.error_count > 0 ? (
                      <span className="badge badge-error" style={{ fontSize: "10px", gap: "2px" }}>
                        <AlertTriangle size={10} /> {t.error_count}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {t.start_time ? new Date(t.start_time).toLocaleTimeString() : "--"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
              Page {page} of {totalPages} ({total} traces)
            </div>
            <div style={{ display: "flex", gap: "var(--space-1)" }}>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
