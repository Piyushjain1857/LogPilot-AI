import apiClient from "./api";

export async function listWebsites() {
  const response = await apiClient.get("/websites");
  return response.data;
}

export async function getWebsite(websiteId) {
  const response = await apiClient.get(`/websites/${websiteId}`);
  return response.data;
}

export async function createWebsite(payload) {
  const response = await apiClient.post("/websites", payload);
  return response.data;
}

export async function updateWebsite(websiteId, payload) {
  const response = await apiClient.put(`/websites/${websiteId}`, payload);
  return response.data;
}

export async function pauseWebsite(websiteId) {
  const response = await apiClient.post(`/websites/${websiteId}/pause`);
  return response.data;
}

export async function resumeWebsite(websiteId) {
  const response = await apiClient.post(`/websites/${websiteId}/resume`);
  return response.data;
}

export async function checkWebsiteNow(websiteId) {
  const response = await apiClient.post(`/websites/${websiteId}/check`);
  return response.data;
}

export async function deleteWebsite(websiteId) {
  const response = await apiClient.delete(`/websites/${websiteId}`);
  return response.data;
}

export async function diagnoseWebsiteAI(websiteId) {
  const response = await apiClient.post(`/websites/${websiteId}/ai-troubleshoot`);
  return response.data;
}

export async function getGitHubCodePatch(websiteId) {
  const response = await apiClient.post(`/websites/${websiteId}/github/patch`);
  return response.data;
}
