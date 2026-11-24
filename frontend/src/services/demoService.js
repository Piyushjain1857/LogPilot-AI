import apiClient from "./api";

export const demoService = {
  /**
   * Fetch current status and progression of the 7-stage demonstration
   */
  async getStatus(signal) {
    const response = await apiClient.get("/demo/status", { signal });
    return response.data;
  },

  /**
   * Advance the demo to the next stage or trigger a specific stage (1 to 7)
   */
  async advanceStage(stage = null, signal) {
    const payload = stage ? { stage } : {};
    const response = await apiClient.post("/demo/advance", payload, { signal });
    return response.data;
  },

  /**
   * Reset the demonstration state back to clean baseline
   */
  async resetDemo(signal) {
    const response = await apiClient.post("/demo/reset", {}, { signal });
    return response.data;
  },
};

export default demoService;
