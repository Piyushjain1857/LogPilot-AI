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

export const clusterService = {
  /**
   * List clusters with pagination and filters
   */
  async listClusters(params = {}) {
    const res = await apiClient.get("/clusters", { params });
    return res.data;
  },

  /**
   * Get cluster diagnostics, timeline, and member logs
   */
  async getClusterDetail(clusterId) {
    const res = await apiClient.get(`/clusters/${clusterId}`);
    return res.data;
  },

  /**
   * Update cluster status (ACTIVE, MUTED, RESOLVED)
   */
  async updateClusterStatus(clusterId, status) {
    const res = await apiClient.patch(`/clusters/${clusterId}/status`, { status });
    return res.data;
  },

  /**
   * Trigger Drain3 batch template mining
   */
  async mineClusters(payload = {}) {
    const res = await apiClient.post("/clusters/mine", payload);
    return res.data;
  },

  /**
   * Get cluster statistics
   */
  async getStatistics() {
    const res = await apiClient.get("/clusters/statistics");
    return res.data;
  },
};
