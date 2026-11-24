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

export const logService = {
  /**
   * Query logs with server-side pagination, search and filtering
   * @param {Object} params - { source_id, upload_batch_id, severity, service_name, search, page, page_size }
   * @param {AbortSignal} signal
   */
  async listLogs(params = {}, signal) {
    const response = await apiClient.get("/logs", {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get full details for an individual log record
   * @param {string} logId
   * @param {AbortSignal} signal
   */
  async getLog(logId, signal) {
    const response = await apiClient.get(`/logs/${logId}`, { signal });
    return response.data;
  },
};

export default logService;
