import { useMemo } from "react";
import { useStreaming } from "../context/StreamingContext";

export function useLiveLogs() {
  const {
    liveLogs,
    pendingLogs,
    isPaused,
    pauseStream,
    resumeStream,
    clearLogs,
    lastReceivedAt,
    totalSessionEvents,
    filters,
    setFilters,
  } = useStreaming();

  // Client-side filtering on the active ring buffer
  const filteredLogs = useMemo(() => {
    return liveLogs.filter((log) => {
      // Severity filter
      if (filters.severities && filters.severities.length > 0) {
        if (!filters.severities.includes(log.severity)) {
          return false;
        }
      }

      // Service filter
      if (filters.service && filters.service.trim()) {
        if (log.service_name !== filters.service.trim()) {
          return false;
        }
      }

      // Source ID filter
      if (filters.sourceId && filters.sourceId.trim()) {
        if (log.source_id !== filters.sourceId.trim()) {
          return false;
        }
      }

      // Search keyword substring filter
      if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const msg = (log.message || "").toLowerCase();
        const trace = (log.trace_id || "").toLowerCase();
        const srv = (log.service_name || "").toLowerCase();
        if (!msg.includes(query) && !trace.includes(query) && !srv.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [liveLogs, filters]);

  return {
    logs: filteredLogs,
    totalCount: liveLogs.length,
    pendingCount: pendingLogs.length,
    isPaused,
    pauseStream,
    resumeStream,
    clearLogs,
    lastReceivedAt,
    totalSessionEvents,
    filters,
    setFilters,
  };
}
