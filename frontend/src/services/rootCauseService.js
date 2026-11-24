import apiClient from "./api";

export const rootCauseService = {
  /**
   * Run automated RCA for an incident or lookback window
   */
  async analyzeRootCause({ incidentId, lookbackMinutes = 60, serviceFilter = null } = {}, signal) {
    const response = await apiClient.post(
      "/root-cause/analyze",
      {
        incident_id: incidentId || null,
        lookback_minutes: lookbackMinutes,
        service_filter: serviceFilter || null,
      },
      { signal }
    );
    return response.data;
  },

  /**
   * Fetch global inferred service dependency topology
   */
  async getTopology(signal) {
    const response = await apiClient.get("/root-cause/topology", { signal });
    return response.data;
  },

  /**
   * Fetch analysis result by analysis ID
   */
  async getAnalysisById(analysisId, signal) {
    const response = await apiClient.get(`/root-cause/${analysisId}`, { signal });
    return response.data;
  },

  /**
   * Fetch latest RCA result for a specific incident
   */
  async getAnalysisForIncident(incidentId, signal) {
    const response = await apiClient.get(`/root-cause/incident/${incidentId}`, { signal });
    return response.data;
  },
};
