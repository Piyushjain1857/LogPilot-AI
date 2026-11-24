import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import LandingPage from "../pages/LandingPage";

vi.mock("../services/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getHealthStatus: vi.fn().mockResolvedValue({ status: "healthy", timestamp: "2026-11-24T00:00:00Z" }),
    getSystemStatus: vi.fn().mockResolvedValue({
      backend_status: "online",
      database_connected: true,
      app_version: "0.1.0",
      environment: "development",
      uptime_seconds: 10.0,
      current_timestamp: "2026-11-24T00:00:00Z",
      gemini_status: "not_configured",
    }),
    getSystemCapabilities: vi.fn().mockResolvedValue({
      incident_management: "implemented",
      log_file_ingestion: "planned",
    }),
    getOverviewSummary: vi.fn().mockResolvedValue({
      total_logs: 0,
      error_logs: 0,
      warning_logs: 0,
      critical_logs: 0,
      active_incidents: 0,
      configured_sources: 0,
    }),
  };
});

describe("Application Routing and Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Landing Page with branding and Get Started button", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText("LogPilot AI")[0]).toBeInTheDocument();
    expect(screen.getByText("Detect. Diagnose. Resolve.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByText(/Problem Statement: PS-01A/i)).toBeInTheDocument();
  });

  it("renders Console AppShell with Sidebar when navigating to /app", async () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText("System Overview")).toBeInTheDocument();
    expect(screen.getByText("OBSERVABILITY")).toBeInTheDocument();
    expect(screen.getByText("INTELLIGENCE & AI")).toBeInTheDocument();
  });

  it("renders Placeholder View for future subsystem routes", async () => {
    render(
      <MemoryRouter initialEntries={["/app/troubleshooter"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByText("AI Troubleshooter Agent — Placeholder View")
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Phase 4/)[0]).toBeInTheDocument();
  });

  it("renders NotFoundPage for unknown routes", () => {
    render(
      <MemoryRouter initialEntries={["/some/random/unknown-route"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("404 — Page Not Found")).toBeInTheDocument();
  });
});
