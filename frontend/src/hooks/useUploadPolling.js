import { useState, useEffect, useRef, useCallback } from "react";
import { uploadService } from "../services/uploadService";

export function useUploadPolling(batchId, intervalMs = 1500) {
  const [batchData, setBatchData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const timerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!batchId) return;
    try {
      const data = await uploadService.getBatch(batchId);
      setBatchData(data);
      setError(null);

      // Terminal states where polling should stop
      const isTerminal = ["COMPLETED", "FAILED", "CANCELLED", "PARTIAL_SUCCESS"].includes(
        data.status
      );

      if (isTerminal) {
        setIsPolling(false);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        timerRef.current = setTimeout(fetchStatus, intervalMs);
      }
    } catch (err) {
      setError(err.message || "Failed to poll upload status.");
      setIsPolling(false);
    }
  }, [batchId, intervalMs]);

  useEffect(() => {
    if (!batchId) {
      setBatchData(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    fetchStatus();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [batchId, fetchStatus]);

  const cancelBatch = useCallback(async () => {
    if (!batchId) return;
    setIsCancelling(true);
    try {
      await uploadService.cancelBatch(batchId);
      await fetchStatus();
    } catch (err) {
      setError(err.message || "Failed to cancel ingestion.");
    } finally {
      setIsCancelling(false);
    }
  }, [batchId, fetchStatus]);

  return {
    batchData,
    isPolling,
    error,
    isCancelling,
    cancelBatch,
    refetch: fetchStatus,
  };
}

export default useUploadPolling;
