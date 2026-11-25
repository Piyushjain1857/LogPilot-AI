import axios from "axios";
import { API_BASE_URL } from "../config/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("logpilot_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

export const aiService = {
  /**
   * Retrieves server-side AI configuration, model tier, and actual token telemetry.
   */
  async getAIConfig() {
    const resp = await apiClient.get("/ai/config");
    return resp.data;
  },

  /**
   * Updates administrator AI settings (model, key, auto-analysis, threshold).
   */
  async updateAIConfig(payload) {
    const resp = await apiClient.put("/ai/config", payload);
    return resp.data;
  },

  /**
   * Tests live connectivity to the Google Gemini API.
   */
  async testConnection() {
    const resp = await apiClient.post("/ai/test-connection");
    return resp.data;
  },

  /**
   * Executes multi-stage AI root cause analysis on an incident or website failure.
   */
  async analyzeIncident(payload) {
    const resp = await apiClient.post("/ai/analyze-incident", payload);
    return resp.data;
  },

  /**
   * Conversational troubleshooting copilot query with verified evidence citations.
   */
  async chatCopilot(payload) {
    const resp = await apiClient.post("/ai/chat", payload);
    return resp.data;
  },

  /**
   * Fetches historical AI analyses.
   */
  async getHistory() {
    const resp = await apiClient.get("/ai/history");
    return resp.data;
  },
};
