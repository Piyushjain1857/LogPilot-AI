import { useState, useEffect, useCallback, useRef } from "react";
import { getHealthStatus } from "../services/api";

/**
 * Custom hook managing backend connection lifecycle:
 * - Periodic health check with backoff on failure
 * - Visibility listener to pause/resume polling
 * - State management: connecting, connected, disconnected, reconnecting, degraded
 */
export function useBackendConnection(pollIntervalMs = 15000) {
  const [status, setStatus] = useState("connecting");
  const [latencyMs, setLatencyMs] = useState(null);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const abortControllerRef = useRef(null);
  const timeoutIdRef = useRef(null);

  const checkConnection = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const startTime = performance.now();
    try {
      const res = await getHealthStatus(abortControllerRef.current.signal);
      const elapsed = Math.round(performance.now() - startTime);

      if (res && res.status === "healthy") {
        setStatus("connected");
        setLatencyMs(elapsed);
        setLastConnectedAt(new Date().toISOString());
        setConsecutiveFailures(0);
      } else {
        setStatus("degraded");
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        return;
      }
      setConsecutiveFailures((prev) => {
        const next = prev + 1;
        setStatus(next > 1 ? "reconnecting" : "disconnected");
        return next;
      });
      setLatencyMs(null);
    }
  }, []);

  // Poll timer with exponential backoff on errors
  useEffect(() => {
    let isMounted = true;

    const scheduleNext = () => {
      // If disconnected/reconnecting, back off: min(15000 * 1.5^failures, 60000)
      const backoffMultiplier = Math.min(Math.pow(1.5, consecutiveFailures), 4);
      const delay = Math.round(pollIntervalMs * (consecutiveFailures > 0 ? backoffMultiplier : 1));

      timeoutIdRef.current = setTimeout(async () => {
        if (!isMounted) return;
        // Check document visibility
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          scheduleNext();
          return;
        }
        await checkConnection();
        if (isMounted) scheduleNext();
      }, delay);
    };

    // Initial check
    checkConnection().then(() => {
      if (isMounted) scheduleNext();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkConnection();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [checkConnection, pollIntervalMs, consecutiveFailures]);

  return {
    status,
    latencyMs,
    lastConnectedAt,
    consecutiveFailures,
    checkNow: checkConnection,
  };
}
