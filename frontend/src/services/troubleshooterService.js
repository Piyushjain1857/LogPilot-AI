import apiClient from "./api";

export const troubleshooterService = {
  /**
   * Run autonomous ReAct diagnostic investigation
   */
  async investigate({ incidentId, query, targetService } = {}, signal) {
    const response = await apiClient.post(
      "/troubleshooter/investigate",
      {
        incident_id: incidentId || null,
        query: query || null,
        target_service: targetService || null,
      },
      { signal }
    );
    return response.data;
  },

  /**
   * Fetch stored investigation by ID
   */
  async getInvestigationById(investigationId, signal) {
    const response = await apiClient.get(`/troubleshooter/investigations/${investigationId}`, { signal });
    return response.data;
  },

  /**
   * Send grounded interactive chat message
   */
  async chat({ investigationId, incidentId, message, history = [] } = {}, signal) {
    const response = await apiClient.post(
      "/troubleshooter/chat",
      {
        investigation_id: investigationId || null,
        incident_id: incidentId || null,
        message,
        history,
      },
      { signal }
    );
    return response.data;
  },
};
