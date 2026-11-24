import apiClient from "./api";

export const assistantService = {
  /**
   * Send a message to conversational AI SRE Assistant
   */
  async chat({ message, contextIncidentId = null, signal } = {}) {
    const response = await apiClient.post(
      "/assistant/chat",
      {
        message,
        context_incident_id: contextIncidentId || null,
      },
      { signal }
    );
    return response.data;
  },

  /**
   * Translate a natural language query into LogPilot boolean search syntax
   */
  async translateQuery(question, signal) {
    const response = await apiClient.post(
      "/assistant/translate-query",
      { question },
      { signal }
    );
    return response.data;
  },
};

export default assistantService;
