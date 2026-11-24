import axios from "axios";
import { API_BASE_URL } from "../config/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const traceService = {
  /**
   * List distributed traces with aggregation metrics
   */
  async listTraces(params = {}) {
    const resp = await apiClient.get("/traces", { params });
    return resp.data;
  },

  /**
   * Get detailed timeline and span waterfall for a trace
   */
  async getTraceDetail(traceId) {
    const resp = await apiClient.get(`/traces/${encodeURIComponent(traceId)}`);
    return resp.data;
  },
};
