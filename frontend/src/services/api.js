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

/**
 * Fetch log activity time series (GET /api/v1/overview/activity?range=...)
 */
export const getLogActivity = async (range = "24h", signal) => {
  const response = await apiClient.get(`/overview/activity?range=${range}`, { signal });
  return response.data;
};

/**
 * Fetch log severity breakdown (GET /api/v1/overview/severity-distribution)
 */
export const getSeverityDistribution = async (signal) => {
  const response = await apiClient.get("/overview/severity-distribution", { signal });
  return response.data;
};

/**
 * Fetch recent incidents list (GET /api/v1/overview/recent-incidents?limit=...)
 */
export const getRecentIncidents = async (limit = 5, signal) => {
  const response = await apiClient.get(`/overview/recent-incidents?limit=${limit}`, { signal });
  return response.data;
};

/**
 * Fetch source health statuses (GET /api/v1/overview/source-health)
 */
export const getSourceHealth = async (signal) => {
  const response = await apiClient.get("/overview/source-health", { signal });
  return response.data;
};

/**
 * Fetch microservice health matrix (GET /api/v1/overview/service-matrix)
 */
export const getServiceMatrix = async (signal) => {
  const response = await apiClient.get("/overview/service-matrix", { signal });
  return response.data;
};

/**
 * Fetch high-level command center telemetry (GET /api/v1/overview/command-center)
 */
export const getCommandCenterTelemetry = async (signal) => {
  const response = await apiClient.get("/overview/command-center", { signal });
  return response.data;
};

/**
 * Fetch real-time system notifications (GET /api/v1/notifications)
 */
export const getNotifications = async (unreadOnly = false, signal) => {
  const response = await apiClient.get(`/notifications?unread_only=${unreadOnly}`, { signal });
  return response.data;
};

/**
 * Mark notification as read (POST /api/v1/notifications/:id/read)
 */
export const markNotificationRead = async (notificationId, signal) => {
  const response = await apiClient.post(`/notifications/${notificationId}/read`, {}, { signal });
  return response.data;
};

/**
 * Mark all notifications as read (POST /api/v1/notifications/clear)
 */
export const clearAllNotifications = async (signal) => {
  const response = await apiClient.post("/notifications/clear", {}, { signal });
  return response.data;
};

/**
 * Fetch workspace preferences (GET /api/v1/settings/preferences)
 */
export const getPreferences = async (signal) => {
  const response = await apiClient.get("/settings/preferences", { signal });
  return response.data;
};

/**
 * Update workspace preferences (PATCH /api/v1/settings/preferences)
 */
export const updatePreferences = async (data, signal) => {
  const response = await apiClient.patch("/settings/preferences", data, { signal });
  return response.data;
};

export { uploadService } from "./uploadService";
export { logSourceService } from "./logSourceService";
export { logService } from "./logService";

export default apiClient;
