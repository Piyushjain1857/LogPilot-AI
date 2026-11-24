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

export const logSourceService = {
  /**
   * List all configured log sources
   * @param {AbortSignal} signal
   */
  async listSources(signal) {
    const response = await apiClient.get("/log-sources", { signal });
    const data = response.data;
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    return Array.isArray(data) ? data : [];
  },

  /**
   * Alias for listSources
   * @param {AbortSignal} signal
   */
  async getSources(signal) {
    return this.listSources(signal);
  },

  /**
   * Get details for a specific log source
   * @param {string} sourceId
   * @param {AbortSignal} signal
   */
  async getSource(sourceId, signal) {
    const response = await apiClient.get(`/log-sources/${sourceId}`, { signal });
    return response.data;
  },

  /**
   * Create a new log source
   * @param {Object} sourceData - { name, source_type, service_name, description, is_active }
   * @param {AbortSignal} signal
   */
  async createSource(sourceData, signal) {
    const response = await apiClient.post("/log-sources", sourceData, { signal });
    return response.data;
  },

  /**
   * Update an existing log source
   * @param {string} sourceId
   * @param {Object} sourceData
   * @param {AbortSignal} signal
   */
  async updateSource(sourceId, sourceData, signal) {
    const response = await apiClient.patch(`/log-sources/${sourceId}`, sourceData, { signal });
    return response.data;
  },
};

export default logSourceService;
