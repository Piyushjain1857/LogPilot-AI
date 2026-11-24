import apiClient from "./api";

export const securityService = {
  /**
   * Fetch available RBAC roles and permissions
   */
  async getRoles(signal) {
    const response = await apiClient.get("/security/roles", { signal });
    return response.data;
  },

  /**
   * Fetch live security posture and audit logs
   */
  async getAudit(roleOverride = null, signal) {
    const headers = {};
    if (roleOverride) {
      headers["X-LogPilot-Role"] = roleOverride;
    }
    const response = await apiClient.get("/security/audit", { headers, signal });
    return response.data;
  },
};

export default securityService;
