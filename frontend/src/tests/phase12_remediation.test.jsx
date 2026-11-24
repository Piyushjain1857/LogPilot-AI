import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RemediationPage from "../pages/placeholders/RemediationPage";
import PlaybookLibrary from "../components/remediation/PlaybookLibrary";
import RemediationConsole from "../components/remediation/RemediationConsole";
import { remediationService } from "../services/remediationService";

const mockPlaybooks = [
  {
    id: "pb-101",
    playbook_number: "PB-101",
    title: "PostgreSQL Connection Pool Recovery & Lock Mitigation",
    category: "DATABASE",
    target_service: "postgres-primary",
    risk_level: "SAFE",
    estimated_downtime: "0 seconds",
    description: "Recovers exhausted database connection pool slots by terminating idle sessions.",
    approval_status: "pending_approval",
    execution_status: "not_started",
    steps: [
      {
        step_number: 1,
        name: "Verify Connection Saturation",
        command: "SELECT count(*) FROM pg_stat_activity;",
        safety_tier: "SAFE",
        requires_approval: false,
        approved: true,
        verification_command: "CHECK connection_count < 100",
        rollback_command: "N/A",
      },
      {
        step_number: 2,
        name: "Increment Max Connections Headroom",
        command: "ALTER SYSTEM SET max_connections = '200';",
        safety_tier: "CAUTION",
        requires_approval: true,
        approved: false,
        verification_command: "SHOW max_connections;",
        rollback_command: "ALTER SYSTEM SET max_connections = '100';",
      },
    ],
  },
  {
    id: "pb-102",
    playbook_number: "PB-102",
    title: "Kubernetes OOMKilled Pod Rolling Restart",
    category: "CONTAINER",
    target_service: "payment-service",
    risk_level: "CAUTION",
    estimated_downtime: "0 seconds",
    description: "Safely restarts leaking pods and bumps memory limits.",
    approval_status: "pending_approval",
    execution_status: "not_started",
    steps: [],
  },
];

describe("Phase 12: Remediation & Playbook Studio", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders RemediationPage header and default runbook console", async () => {
    vi.spyOn(remediationService, "getPlaybooks").mockResolvedValue(mockPlaybooks);

    render(
      <MemoryRouter>
        <RemediationPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Remediation Playbook Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Remediation Console/i)).toBeInTheDocument();
    expect(screen.getByText(/Playbook Library/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/PostgreSQL Connection Pool Recovery/i)).toBeInTheDocument();
    });
  });

  it("switches to Playbook Library and filters by category", async () => {
    vi.spyOn(remediationService, "getPlaybooks").mockResolvedValue(mockPlaybooks);

    render(
      <MemoryRouter>
        <RemediationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Active Remediation Console/i)).toBeInTheDocument();
    });

    // Switch to library
    const libTab = screen.getByRole("button", { name: /Playbook Library/i });
    fireEvent.click(libTab);

    await waitFor(() => {
      expect(screen.getByText(/Kubernetes OOMKilled Pod Rolling Restart/i)).toBeInTheDocument();
    });
  });

  it("renders PlaybookLibrary component and handles search and selection", () => {
    const handleSelect = vi.fn();
    render(
      <PlaybookLibrary
        playbooks={mockPlaybooks}
        onSelectPlaybook={handleSelect}
        loading={false}
      />
    );

    expect(screen.getByText(/PB-101/i)).toBeInTheDocument();
    expect(screen.getByText(/PB-102/i)).toBeInTheDocument();

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Search runbooks/i);
    fireEvent.change(searchInput, { target: { value: "PostgreSQL" } });

    expect(screen.getByText(/PostgreSQL Connection Pool Recovery/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kubernetes OOMKilled Pod/i)).not.toBeInTheDocument();

    // Click Open Runbook
    const openBtn = screen.getByRole("button", { name: /Open Runbook/i });
    fireEvent.click(openBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockPlaybooks[0]);
  });

  it("handles step approval and triggers safe simulation in RemediationConsole", async () => {
    const handleUpdated = vi.fn();
    vi.spyOn(remediationService, "approveStep").mockResolvedValue({
      ...mockPlaybooks[0],
      approval_status: "approved",
      steps: [
        mockPlaybooks[0].steps[0],
        { ...mockPlaybooks[0].steps[1], approved: true },
      ],
    });

    vi.spyOn(remediationService, "simulatePlaybook").mockResolvedValue({
      playbook_id: "pb-101",
      execution_status: "simulated",
      all_passed: true,
      total_duration_ms: 120,
      steps: [
        {
          step_number: 1,
          command: "SELECT count(*) FROM pg_stat_activity;",
          safety_tier: "SAFE",
          preflight_passed: true,
          stdout: "state | count \n active | 88",
          stderr: "",
          exit_code: 0,
          duration_ms: 60,
          verification_passed: true,
          verification_output: "[VERIFY OK]",
          status: "simulated_success",
        },
      ],
    });

    render(
      <RemediationConsole
        playbook={mockPlaybooks[0]}
        onPlaybookUpdated={handleUpdated}
      />
    );

    // Click Approve Step
    const approveBtn = screen.getByRole("button", { name: /Approve Step/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(remediationService.approveStep).toHaveBeenCalledWith(
        "pb-101",
        2,
        true,
        "Authorized by SRE on-call"
      );
    });

    // Run Safe Simulation
    const simBtn = screen.getByRole("button", { name: /Run Safe Simulation/i });
    fireEvent.click(simBtn);

    await waitFor(() => {
      expect(remediationService.simulatePlaybook).toHaveBeenCalledWith("pb-101", {
        dry_run: true,
        enforce_approvals: true,
      });
    });

    // Terminal view should be displayed
    await waitFor(() => {
      expect(screen.getByText(/logpilot-sandbox — PB-101/i)).toBeInTheDocument();
      expect(screen.getByText(/state \| count/i)).toBeInTheDocument();
    });
  });
});
