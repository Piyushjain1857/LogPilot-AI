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

export const searchService = {
  /**
   * Search logs using GET /api/v1/logs/search
   */
  async searchLogs(params = {}) {
    const resp = await apiClient.get("/logs/search", { params });
    return resp.data;
  },

  /**
   * Advanced search using POST /api/v1/logs/advanced-search
   */
  async advancedSearch(payload) {
    const resp = await apiClient.post("/logs/advanced-search", payload);
    return resp.data;
  },

  /**
   * Fetch query syntax & value suggestions
   */
  async getSuggestions(prefix = "") {
    const resp = await apiClient.get("/logs/search/suggestions", {
      params: { prefix },
    });
    return resp.data;
  },

  /**
   * Saved Searches
   */
  async listSavedSearches() {
    const resp = await apiClient.get("/search/saved");
    return resp.data;
  },

  async createSavedSearch(payload) {
    const resp = await apiClient.post("/search/saved", payload);
    return resp.data;
  },

  async updateSavedSearch(id, payload) {
    const resp = await apiClient.patch(`/search/saved/${id}`, payload);
    return resp.data;
  },

  async deleteSavedSearch(id) {
    const resp = await apiClient.delete(`/search/saved/${id}`);
    return resp.data;
  },

  /**
   * Search History
   */
  async getSearchHistory(limit = 25) {
    const resp = await apiClient.get("/search/history", { params: { limit } });
    return resp.data;
  },

  /**
   * Export search results to CSV or JSON
   */
  async exportLogs(payload) {
    const resp = await apiClient.post("/logs/export", payload, {
      responseType: "blob",
    });
    return resp.data;
  },
};
