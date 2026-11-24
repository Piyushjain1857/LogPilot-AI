import axios from "axios";
import { API_BASE_URL } from "../config/constants";

// Centralized Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Response interceptor for consistent error normalization
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let normalizedError = {
      message: "An unexpected error occurred.",
      status: error.response?.status || 0,
      requestId: error.response?.headers?.["x-request-id"] || null,
      details: error.response?.data?.detail || error.message,
    };

    if (error.code === "ECONNABORTED") {
      normalizedError.message = "Request timed out. Please check backend connection.";
    } else if (!error.response) {
      normalizedError.message = "Backend is currently unreachable (Connection Refused).";
    }

    return Promise.reject(normalizedError);
  }
);

/**
 * Fetch root application metadata (GET /)
 */
export const getRootMetadata = async (signal) => {
  // Root metadata is served at / rather than /api/v1
  const rootBase = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  const response = await axios.get(`${rootBase}/`, { signal, timeout: 5000 });
  return response.data;
};

/**
 * Fetch backend health status (GET /api/v1/health)
 */
export const getHealthStatus = async (signal) => {
  const response = await apiClient.get("/health", { signal });
  return response.data;
};

/**
 * Fetch deep system telemetry and DB status (GET /api/v1/system/status)
 */
export const getSystemStatus = async (signal) => {
  const response = await apiClient.get("/system/status", { signal });
  return response.data;
};

/**
 * Fetch truthful capability flags (GET /api/v1/system/capabilities)
 */
export const getSystemCapabilities = async (signal) => {
  const response = await apiClient.get("/system/capabilities", { signal });
  return response.data;
};

/**
 * Fetch actual database summary metrics (GET /api/v1/overview/summary)
 */
export const getOverviewSummary = async (signal) => {
  const response = await apiClient.get("/overview/summary", { signal });
  return response.data;
};

export default apiClient;
