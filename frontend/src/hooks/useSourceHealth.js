import { useState, useEffect, useCallback } from "react";
import { ingestionTokenService } from "../services/ingestionTokenService";

export function useSourceHealth(sourceId) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    if (!sourceId) return;
    setLoading(true);
    try {
      const data = await ingestionTokenService.getSourceHealth(sourceId);
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch source health.");
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, loading, error, refresh: fetchHealth };
}
