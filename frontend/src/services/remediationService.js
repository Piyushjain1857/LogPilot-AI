import apiClient from "./api";

export const remediationService = {
  /**
   * Retrieves all playbooks with optional filtering.
   */
  async getPlaybooks(params = {}) {
    try {
      const response = await apiClient.get("/remediation/playbooks", { params });
      return response.data;
    } catch (error) {
      console.warn("API unavailable, returning fallback playbooks:", error.message);
      return [
        {
          id: "pb-101-fallback",
          playbook_number: "PB-101",
          slug: "postgres-pool-recovery",
          title: "PostgreSQL Connection Pool Recovery & Lock Mitigation",
          category: "DATABASE",
          target_service: "postgres-primary",
          risk_level: "SAFE",
          estimated_downtime: "0 seconds (Online Dynamic Reconfiguration)",
          description: "Recovers exhausted database connection pool slots by terminating abandoned idle transactions and dynamically adjusting connection headroom.",
          approval_status: "pending_approval",
          execution_status: "not_started",
          steps: [
            {
              step_number: 1,
              name: "Verify Connection Saturation & Locking Backends",
              description: "Inspects pg_stat_activity to quantify total active, idle, and waiting connection sessions.",
              command: "SELECT count(*), state FROM pg_stat_activity GROUP BY state;",
              safety_tier: "SAFE",
              requires_approval: false,
              approved: true,
              rollback_command: "N/A (Read-only inspection)",
              verification_command: "CHECK connection_count < max_connections",
              status: "pending",
            },
            {
              step_number: 2,
              name: "Terminate Idle In-Transaction Sessions",
              description: "Terminates hanging worker transactions holding row locks on tables.",
              command: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < current_timestamp - INTERVAL '2 minutes';",
              safety_tier: "SAFE",
              requires_approval: false,
              approved: true,
              rollback_command: "N/A (Terminated clients safely reconnect automatically)",
              verification_command: "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction';",
              status: "pending",
            },
            {
              step_number: 3,
              name: "Dynamically Increment Max Connections Ceiling",
              description: "Increments max_connections from 100 to 200 and triggers runtime config reload.",
              command: "ALTER SYSTEM SET max_connections = '200'; SELECT pg_reload_conf();",
              safety_tier: "CAUTION",
              requires_approval: true,
              approved: false,
              rollback_command: "ALTER SYSTEM SET max_connections = '100'; SELECT pg_reload_conf();",
              verification_command: "SHOW max_connections;",
              status: "pending",
            },
          ],
        },
      ];
    }
  },

  /**
   * Retrieves single playbook details.
   */
  async getPlaybookById(playbookId) {
    try {
      const response = await apiClient.get(`/remediation/playbooks/${playbookId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch playbook ${playbookId}:`, error.message);
      const all = await this.getPlaybooks();
      return all.find((p) => p.id === playbookId || p.playbook_number === playbookId) || all[0];
    }
  },

  /**
   * Evaluates an incident's symptoms and ranks relevant mitigation runbooks.
   */
  async recommendPlaybooks(incidentId) {
    try {
      const response = await apiClient.post("/remediation/recommend", { incident_id: incidentId });
      return response.data;
    } catch (error) {
      console.warn("Failed to fetch recommendations:", error.message);
      return [];
    }
  },

  /**
   * Updates human-in-the-loop approval state for a playbook step.
   */
  async approveStep(playbookId, stepNumber, approved, note = "", performedBy = "sre-operator") {
    const response = await apiClient.post(`/remediation/playbooks/${playbookId}/approve`, {
      step_number: stepNumber,
      approved,
      approver_note: note,
      performed_by: performedBy,
    });
    return response.data;
  },

  /**
   * Runs safe dry-run simulation of approved steps in the sandbox environment.
   */
  async simulatePlaybook(playbookId, options = { dry_run: true, enforce_approvals: true }) {
    const response = await apiClient.post(`/remediation/playbooks/${playbookId}/simulate`, options);
    return response.data;
  },

  /**
   * Executes compensating rollback actions.
   */
  async rollbackPlaybook(playbookId, options = { steps_to_rollback: null, performed_by: "sre-operator" }) {
    const response = await apiClient.post(`/remediation/playbooks/${playbookId}/rollback`, options);
    return response.data;
  },

  /**
   * Generates deployable automation manifests (Kubernetes YAML, Ansible, or Bash).
   */
  async exportPlaybook(playbookId, format = "yaml") {
    const response = await apiClient.get(`/remediation/playbooks/${playbookId}/export`, {
      params: { format },
      responseType: "text",
    });
    return response.data;
  },

  /**
   * Retrieves immutable audit trail.
   */
  async getAuditLogs(playbookId = null) {
    const params = playbookId ? { playbook_id: playbookId } : {};
    const response = await apiClient.get("/remediation/audit-logs", { params });
    return response.data;
  },
};
