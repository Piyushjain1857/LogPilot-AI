import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DemoPage from "../pages/placeholders/DemoPage";
import { demoService } from "../services/demoService";
import { securityService } from "../services/securityService";

// Mock demoService
vi.mock("../services/demoService", () => ({
  demoService: {
    getStatus: vi.fn(),
    advanceStage: vi.fn(),
    resetDemo: vi.fn(),
  },
}));

// Mock securityService
vi.mock("../services/securityService", () => ({
  securityService: {
    getRoles: vi.fn(),
    getAudit: vi.fn(),
  },
}));

describe("Phase 15: 7-Stage Interactive Demonstration & RBAC Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demoService.getStatus.mockResolvedValue({
      current_stage: 1,
      total_stages: 7,
      logs_ingested: 25,
      incident_id: "INC-101",
      incident_status: "active",
      post_mortem_id: null,
      is_complete: false,
    });
    demoService.advanceStage.mockResolvedValue({
      execution: {
        stage: 2,
        name: "Anomaly Detection",
        details: "Z-score breached normal baseline on db-primary.",
      },
      demo_status: {
        current_stage: 2,
        total_stages: 7,
        is_complete: false,
      },
    });
    demoService.resetDemo.mockResolvedValue({
      result: { status: "SUCCESS" },
      demo_status: {
        current_stage: 0,
        total_stages: 7,
        is_complete: false,
      },
    });
    securityService.getAudit.mockResolvedValue({
      caller_context: { role: "ADMIN" },
      security_posture: { rbac_enforcement: "ACTIVE" },
      redaction_engine: { patterns_loaded: 8 },
    });
  });

  it("renders DemoPage with 7-stage stepper and problem statement callout", async () => {
    render(
      <MemoryRouter>
        <DemoPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Autonomous Self-Healing Demonstration")).toBeInTheDocument();
    expect(screen.getByText("Problem Statement PS-01A Capability Validated:")).toBeInTheDocument();
    expect(screen.getAllByText(/Telemetry Ingestion/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Anomaly Detection/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pattern Clustering/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Incident Correlation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Root Cause Analysis/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Autonomous Diagnosis/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Remediation & Recovery/i).length).toBeGreaterThan(0);
  });

  it("advances demo stage when clicking Next Stage button", async () => {
    render(
      <MemoryRouter>
        <DemoPage />
      </MemoryRouter>
    );

    const nextBtn = screen.getByRole("button", { name: /Next Stage/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(demoService.advanceStage).toHaveBeenCalled();
      expect(screen.getAllByText(/Z-score breached normal baseline on db-primary/i).length).toBeGreaterThan(0);
    });
  });

  it("resets demo when clicking Reset Demo button", async () => {
    render(
      <MemoryRouter>
        <DemoPage />
      </MemoryRouter>
    );

    const resetBtn = screen.getByRole("button", { name: /Reset Demo/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(demoService.resetDemo).toHaveBeenCalled();
    });
  });

  it("allows selecting RBAC persona from dropdown", async () => {
    render(
      <MemoryRouter>
        <DemoPage />
      </MemoryRouter>
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "VIEWER" } });

    await waitFor(() => {
      expect(securityService.getAudit).toHaveBeenCalledWith("VIEWER");
    });
  });
});
