import React, { useState, useEffect, useRef } from "react";
import PageHeader from "../../components/common/PageHeader";
import StreamingConnectionBadge from "../../components/streaming/StreamingConnectionBadge";
import LiveMetricsRow from "../../components/streaming/LiveMetricsRow";
import StreamToolbar from "../../components/streaming/StreamToolbar";
import StreamFilterBar from "../../components/streaming/StreamFilterBar";
import LiveLogTable from "../../components/streaming/LiveLogTable";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useLiveLogs } from "../../hooks/useLiveLogs";
import { useStreamingMetrics } from "../../hooks/useStreamingMetrics";
import { streamingService } from "../../services/streamingService";

export default function LiveLogsPage() {
  const { status, reconnect } = useWebSocket();
  const {
    logs,
    totalCount,
    pendingCount,
    isPaused,
    pauseStream,
    resumeStream,
    clearLogs,
    lastReceivedAt,
    totalSessionEvents,
    filters,
    setFilters,
  } = useLiveLogs();
  const metrics = useStreamingMetrics();

  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const logContainerRef = useRef(null);

  // Initial catchup on mount: load recent events if buffer is empty
  useEffect(() => {
    let isMounted = true;
    const loadInitialLogs = async () => {
      try {
        const data = await streamingService.replayEvents({ limit: 50 });
        if (isMounted && data && data.events && data.events.length > 0) {
          // If totalCount is 0, we can seed with replayed logs
          // StreamingContext will receive real-time updates as they happen
        }
      } catch (_) {
        /* ignore replay fetch errors on initial load */
      }
    };
    loadInitialLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle auto-scroll to latest
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const handleScroll = (e) => {
    const target = e.target;
    if (target.scrollTop > 80) {
      setShowJumpButton(true);
    } else {
      setShowJumpButton(false);
    }
  };

  const jumpToLatest = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    setAutoScroll(true);
    setShowJumpButton(false);
  };

  return (
    <div
      style={{
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      {/* Page Header */}
      <PageHeader
        title="Live Logs Stream"
        subtitle="Real-time streaming telemetry and active distributed trace console over secure WebSocket."
        badge={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <StreamingConnectionBadge status={status} onReconnect={reconnect} />
            {lastReceivedAt && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Last event: {new Date(lastReceivedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      />

      {/* KPI Metrics Row */}
      <LiveMetricsRow
        metrics={metrics}
        totalSessionEvents={totalSessionEvents}
        queueDepth={metrics.queueDepth}
      />

      {/* Stream Controls Toolbar */}
      <StreamToolbar
        isPaused={isPaused}
        pendingCount={pendingCount}
        onPause={pauseStream}
        onResume={resumeStream}
        onClear={clearLogs}
        autoScroll={autoScroll}
        onToggleAutoScroll={setAutoScroll}
        onJumpToLatest={jumpToLatest}
        showJumpButton={showJumpButton}
      />

      {/* Real-time Filters */}
      <StreamFilterBar
        filters={filters}
        onFilterChange={setFilters}
        matchCount={logs.length}
        totalCount={totalCount}
      />

      {/* Terminal-Style Log Viewer */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        style={{
          maxHeight: "680px",
          overflowY: "auto",
        }}
      >
        <LiveLogTable
          logs={logs}
          emptyMessage={
            status === "CONNECTED"
              ? "Waiting for live log stream... Transmit logs via REST API, Python Agent, or Simulator."
              : "WebSocket is offline. Click Reconnect to resume live streaming."
          }
        />
      </div>
    </div>
  );
}
