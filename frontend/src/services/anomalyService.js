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

export const anomalyService = {
  /**
   * List anomalies with multi-factor filtering and pagination
   */
  async listAnomalies(params = {}) {
    const res = await apiClient.get("/anomalies", { params });
    return res.data;
  },

  /**
   * Get anomaly diagnostics, surrounding logs, and baseline
   */
  async getAnomalyDetail(anomalyId) {
    const res = await apiClient.get(`/anomalies/${anomalyId}`);
    return res.data;
  },

  /**
   * Transition anomaly status (ACTIVE, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE)
   */
  async updateAnomalyStatus(anomalyId, status) {
    const res = await apiClient.patch(`/anomalies/${anomalyId}/status`, { status });
    return res.data;
  },

  /**
   * Get aggregate metrics and 24h hourly trends
   */
  async getStatistics() {
    const res = await apiClient.get("/anomalies/statistics");
    return res.data;
  },

  /**
   * Get computed service baselines
   */
  async getBaselines(params = {}) {
    const res = await apiClient.get("/anomalies/baselines", { params });
    return res.data;
  },

  /**
   * Rebuild service statistical envelopes
   */
  async rebuildBaselines(window = "5m", historyDays = 7) {
    const res = await apiClient.post("/anomalies/baselines/rebuild", null, {
      params: { window, history_days: historyDays },
    });
    return res.data;
  },

  /**
   * Trigger detection run
   */
  async triggerDetection(payload = {}) {
    const res = await apiClient.post("/anomalies/detect", payload);
    return res.data;
  },

  /**
   * Get algorithm sensitivity configuration
   */
  async getConfiguration() {
    const res = await apiClient.get("/anomalies/configuration");
    return res.data;
  },

  /**
   * Update algorithm sensitivity thresholds
   */
  async updateConfiguration(updates) {
    const res = await apiClient.patch("/anomalies/configuration", updates);
    return res.data;
  },
};
