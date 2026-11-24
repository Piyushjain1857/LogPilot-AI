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

export const ingestionTokenService = {
  /**
   * POST /api/v1/log-sources/{sourceId}/tokens
   */
  async createToken(sourceId, { name, expiresInDays }) {
    const resp = await apiClient.post(`/log-sources/${sourceId}/tokens`, {
      name,
      expires_in_days: expiresInDays || null,
    });
    return resp.data;
  },

  /**
   * GET /api/v1/log-sources/{sourceId}/tokens
   */
  async listTokens(sourceId) {
    const resp = await apiClient.get(`/log-sources/${sourceId}/tokens`);
    return resp.data;
  },

  /**
   * POST /api/v1/log-sources/{sourceId}/tokens/{tokenId}/revoke
   */
  async revokeToken(sourceId, tokenId) {
    const resp = await apiClient.post(`/log-sources/${sourceId}/tokens/${tokenId}/revoke`);
    return resp.data;
  },

  /**
   * POST /api/v1/log-sources/{sourceId}/tokens/{tokenId}/rotate
   */
  async rotateToken(sourceId, tokenId) {
    const resp = await apiClient.post(`/log-sources/${sourceId}/tokens/${tokenId}/rotate`);
    return resp.data;
  },

  /**
   * PATCH /api/v1/log-sources/{sourceId}/ingestion-status
   */
  async updateIngestionStatus(sourceId, enabled) {
    const resp = await apiClient.patch(`/log-sources/${sourceId}/ingestion-status?enabled=${enabled}`);
    return resp.data;
  },

  /**
   * GET /api/v1/log-sources/{sourceId}/health
   */
  async getSourceHealth(sourceId) {
    const resp = await apiClient.get(`/log-sources/${sourceId}/health`);
    return resp.data;
  },
};
