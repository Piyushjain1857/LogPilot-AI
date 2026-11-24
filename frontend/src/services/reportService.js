import apiClient from "./api";

export const reportService = {
  /**
   * Fetch all reports with optional category filter
   */
  async listReports({ category = "ALL", limit = 50, signal } = {}) {
    const params = new URLSearchParams();
    if (category && category !== "ALL") params.append("category", category);
    params.append("limit", limit.toString());

    const response = await apiClient.get(`/reports?${params.toString()}`, { signal });
    return response.data;
  },

  /**
   * Fetch full detail of a specific report
   */
  async getReport(id, signal) {
    const response = await apiClient.get(`/reports/${id}`, { signal });
    return response.data;
  },

  /**
   * Generate an automated post-mortem report from an existing incident
   */
  async generatePostMortem({ incidentId, title = null } = {}, signal) {
    const response = await apiClient.post(
      "/reports/generate",
      {
        incident_id: incidentId,
        title: title || undefined,
      },
      { signal }
    );
    return response.data;
  },

  /**
   * Export report as markdown text
   */
  async getMarkdown(id, signal) {
    const response = await apiClient.get(`/reports/${id}/export/markdown`, { signal });
    return response.data;
  },

  /**
   * Export report as raw structured JSON
   */
  async getJson(id, signal) {
    const response = await apiClient.get(`/reports/${id}/export/json`, { signal });
    return response.data;
  },

  /**
   * Download generated PDF report binary
   */
  async downloadPdf(id, filename = `report-${id}.pdf`) {
    const response = await apiClient.get(`/reports/${id}/export/pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};

export default reportService;
