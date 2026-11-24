import axios from "axios";
import { API_BASE_URL } from "../config/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const streamingService = {
  /**
   * GET /api/v1/stream/status
   */
  async getStreamStatus(signal) {
    const resp = await apiClient.get("/stream/status", { signal });
    return resp.data;
  },

  /**
   * GET /api/v1/stream/metrics
   */
  async getStreamMetrics(signal) {
    const resp = await apiClient.get("/stream/metrics", { signal });
    return resp.data;
  },

  /**
   * GET /api/v1/stream/events (cursor replay)
   */
  async replayEvents({ afterSequence, limit = 100, sourceId, severity, service, signal }) {
    const params = new URLSearchParams();
    if (afterSequence !== undefined && afterSequence !== null) {
      params.append("after_sequence", afterSequence);
    }
    if (limit) params.append("limit", limit);
    if (sourceId) params.append("source_id", sourceId);
    if (severity) params.append("severity", severity);
    if (service) params.append("service", service);

    const resp = await apiClient.get(`/stream/events?${params.toString()}`, { signal });
    return resp.data;
  },
};
