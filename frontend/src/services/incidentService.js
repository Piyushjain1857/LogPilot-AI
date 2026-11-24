import apiClient from "./api";

export const incidentService = {
  /**
   * Fetch paginated list of operational incidents with filters
   */
  async listIncidents({
    status = "ALL",
    severity = "ALL",
    service = "",
    search = "",
    page = 1,
    pageSize = 20,
    signal,
  } = {}) {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (severity && severity !== "ALL") params.append("severity", severity);
    if (service) params.append("service", service);
    if (search) params.append("search", search);
    params.append("page", page.toString());
    params.append("page_size", pageSize.toString());

    const response = await apiClient.get(`/incidents?${params.toString()}`, { signal });
    return response.data;
  },

  /**
   * Fetch incident statistics and MTTR
   */
  async getStatistics(signal) {
    const response = await apiClient.get("/incidents/statistics", { signal });
    return response.data;
  },

  /**
   * Fetch full incident detail with timeline and blast radius
   */
  async getIncidentDetail(id, signal) {
    const response = await apiClient.get(`/incidents/${id}`, { signal });
    return response.data;
  },

  /**
   * Trigger automated correlation of anomalies and clusters
   */
  async correlateIncidents({ lookbackMinutes = 60, forceRecorrelate = false } = {}, signal) {
    const response = await apiClient.post(
      "/incidents/correlate",
      { lookback_minutes: lookbackMinutes, force_recorrelate: forceRecorrelate },
      { signal }
    );
    return response.data;
  },

  /**
   * Update incident lifecycle status or assignee
   */
  async updateStatus(id, { status, assigned_to, resolution_notes } = {}) {
    const response = await apiClient.patch(`/incidents/${id}/status`, {
      status,
      assigned_to,
      resolution_notes,
    });
    return response.data;
  },

  /**
   * Append diagnostic note to incident timeline
   */
  async addNote(id, { note, author = "Operator" } = {}) {
    const response = await apiClient.post(`/incidents/${id}/notes`, {
      note,
      author,
    });
    return response.data;
  },
};
