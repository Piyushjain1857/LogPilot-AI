import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { websocketService } from "../services/websocketService";
import { streamingService } from "../services/streamingService";

const MAX_BUFFER = 2000;
const FLUSH_INTERVAL_MS = 150;

const StreamingContext = createContext(null);

export function StreamingProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState("DISCONNECTED");
  const [liveLogs, setLiveLogs] = useState([]);
  const [pendingLogs, setPendingLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lastReceivedAt, setLastReceivedAt] = useState(null);
  const [totalSessionEvents, setTotalSessionEvents] = useState(0);

  // Operational metrics
  const [streamMetrics, setStreamMetrics] = useState({
    logsPerSecond: 0,
    errorsPerMinute: 0,
    activeSources: 0,
    queueDepth: 0,
  });

  // Filters state
  const [filters, setFiltersState] = useState({
    severities: [],
    service: "",
    sourceId: "",
    search: "",
  });

  // Transient buffer for 150ms batching
  const batchBufferRef = useRef([]);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // 1. Connect to WebSocket on mount
  useEffect(() => {
    const unsubStatus = websocketService.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    websocketService.connect();

    // Listen for incoming committed logs
    const unsubLog = websocketService.on("log.created", (event) => {
      const data = event.data;
      if (!data) return;

      const receivedTime = new Date().toISOString();
      setLastReceivedAt(receivedTime);
      setTotalSessionEvents((prev) => prev + 1);

      if (isPausedRef.current) {
        setPendingLogs((prev) => [data, ...prev].slice(0, MAX_BUFFER));
      } else {
        batchBufferRef.current.push(data);
      }
    });

    return () => {
      unsubStatus();
      unsubLog();
      websocketService.disconnect();
    };
  }, []);

  // 2. Batch flushing interval (every 150ms) to avoid React re-render thrashing
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPausedRef.current && batchBufferRef.current.length > 0) {
        const toFlush = [...batchBufferRef.current];
        batchBufferRef.current = [];

        setLiveLogs((prev) => {
          // Prepend latest logs, keeping array bounded to MAX_BUFFER
          const combined = [...toFlush.reverse(), ...prev];
          return combined.slice(0, MAX_BUFFER);
        });
      }
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // 3. Periodic metrics reconciliation from backend
  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const data = await streamingService.getStreamMetrics();
        if (isMounted && data) {
          setStreamMetrics({
            logsPerSecond: data.logs_per_second || 0,
            errorsPerMinute: (data.severity_distribution?.ERROR || 0) + (data.severity_distribution?.CRITICAL || 0),
            activeSources: Object.keys(data.source_activity || {}).length,
            queueDepth: data.queue_depth || 0,
          });
        }
      } catch (_) {
        /* ignore polling errors */
      }
    };

    fetchMetrics();
    const metricsInterval = setInterval(fetchMetrics, 3000);
    return () => {
      isMounted = false;
      clearInterval(metricsInterval);
    };
  }, []);

  // Pause / Resume handlers
  const pauseStream = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeStream = useCallback(() => {
    setIsPaused(false);
    if (pendingLogs.length > 0) {
      setLiveLogs((prev) => {
        const merged = [...pendingLogs, ...prev];
        return merged.slice(0, MAX_BUFFER);
      });
      setPendingLogs([]);
    }
  }, [pendingLogs]);

  const clearLogs = useCallback(() => {
    setLiveLogs([]);
    setPendingLogs([]);
    batchBufferRef.current = [];
  }, []);

  const setFilters = useCallback((newFilters) => {
    setFiltersState((prev) => {
      const merged = { ...prev, ...newFilters };
      // Sync with WebSocket subscription
      websocketService.subscribe({
        severities: merged.severities || [],
        services: merged.service ? [merged.service] : [],
        source_ids: merged.sourceId ? [merged.sourceId] : [],
      });
      return merged;
    });
  }, []);

  const reconnect = useCallback(() => {
    websocketService.reconnect();
  }, []);

  const replayMissedEvents = useCallback(async (afterSequence) => {
    try {
      const data = await streamingService.replayEvents({ afterSequence, limit: 100 });
      if (data && data.events && data.events.length > 0) {
        const replayedLogs = data.events.map((e) => e.data).filter(Boolean);
        setLiveLogs((prev) => {
          const merged = [...replayedLogs.reverse(), ...prev];
          return merged.slice(0, MAX_BUFFER);
        });
      }
    } catch (err) {
      console.warn("Event replay notice:", err);
    }
  }, []);

  return (
    <StreamingContext.Provider
      value={{
        connectionStatus,
        liveLogs,
        pendingLogs,
        isPaused,
        pauseStream,
        resumeStream,
        clearLogs,
        lastReceivedAt,
        totalSessionEvents,
        streamMetrics,
        filters,
        setFilters,
        reconnect,
        replayMissedEvents,
      }}
    >
      {children}
    </StreamingContext.Provider>
  );
}

const DEFAULT_STREAMING_CONTEXT = {
  connectionStatus: "DISCONNECTED",
  liveLogs: [],
  pendingLogs: [],
  isPaused: false,
  pauseStream: () => {},
  resumeStream: () => {},
  clearLogs: () => {},
  lastReceivedAt: null,
  totalSessionEvents: 0,
  streamMetrics: {
    logsPerSecond: 0,
    errorsPerMinute: 0,
    activeSources: 0,
    queueDepth: 0,
  },
  filters: {},
  setFilters: () => {},
  reconnect: () => {},
  replayMissedEvents: async () => {},
};

export function useStreaming() {
  const ctx = useContext(StreamingContext);
  return ctx || DEFAULT_STREAMING_CONTEXT;
}
