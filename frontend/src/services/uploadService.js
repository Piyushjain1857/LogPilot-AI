import axios from "axios";
import { API_BASE_URL } from "../config/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

export const uploadService = {
  /**
   * Preview a log file prior to full ingestion
   * @param {File} file
   * @param {Object} options - { field_mappings, encoding }
   * @param {AbortSignal} signal
   */
  async previewFile(file, options = {}, signal) {
    const formData = new FormData();
    formData.append("file", file);
    if (options.encoding) {
      formData.append("encoding", options.encoding);
    }
    if (options.field_mappings) {
      formData.append("field_mappings", JSON.stringify(options.field_mappings));
    }

    const response = await apiClient.post("/uploads/preview", formData, {
      signal,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Start an asynchronous log file upload and ingestion job
   * @param {FormData} formData
   * @param {Function} onProgress
   * @param {AbortSignal} signal
   */
  async createUploadBatch(formData, onProgress, signal) {
    const response = await apiClient.post("/uploads", formData, {
      signal,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted, progressEvent.loaded, progressEvent.total);
        }
      },
    });
    return response.data;
  },

  /**
   * List recent upload batches
   * @param {Object} params - { limit, offset, status, source_id }
   * @param {AbortSignal} signal
   */
  async listBatches(params = {}, signal) {
    const response = await apiClient.get("/uploads", {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get batch status and progress metrics
   * @param {string} batchId
   * @param {AbortSignal} signal
   */
  async getBatch(batchId, signal) {
    const response = await apiClient.get(`/uploads/${batchId}`, { signal });
    return response.data;
  },

  /**
   * List logs associated with an upload batch
   * @param {string} batchId
   * @param {Object} params - { page, page_size, severity, search }
   * @param {AbortSignal} signal
   */
  async getBatchLogs(batchId, params = {}, signal) {
    const response = await apiClient.get(`/uploads/${batchId}/logs`, {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * Get errors encountered during batch ingestion
   * @param {string} batchId
   * @param {AbortSignal} signal
   */
  async getBatchErrors(batchId, signal) {
    const response = await apiClient.get(`/uploads/${batchId}/errors`, { signal });
    return response.data;
  },

  /**
   * Request cancellation of an active upload batch
   * @param {string} batchId
   * @param {AbortSignal} signal
   */
  async cancelBatch(batchId, signal) {
    const response = await apiClient.post(`/uploads/${batchId}/cancel`, {}, { signal });
    return response.data;
  },
};

export default uploadService;
