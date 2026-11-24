import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OverviewPage from "../pages/OverviewPage";
import { WorkspaceProvider } from "../context/WorkspaceContext";
import * as api from "../services/api";

vi.mock("../services/api");

const renderOverview = () => {
  return render(
    <MemoryRouter>
      <WorkspaceProvider>
        <OverviewPage />
      </WorkspaceProvider>
    </MemoryRouter>
  );
};

describe("OverviewPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    api.getPreferences.mockResolvedValue({
      theme: "dark",
      sidebar_collapsed: false,
      display_density: "comfortable",
      timezone: "UTC",
      auto_refresh_enabled: false,
      auto_refresh_interval: 30,
    });
    api.getLogActivity.mockResolvedValue({
      window_hours: 24,
      total_logs: 0,
      points: [],
    });
    api.getSeverityDistribution.mockResolvedValue({
      total: 0,
      distribution: [],
    });
    api.getRecentIncidents.mockResolvedValue({
      incidents: [],
    });
    api.getSourceHealth.mockResolvedValue({
      sources: [],
    });
  });

  it("renders metric cards and telemetry on successful API responses", async () => {
    api.getSystemStatus.mockResolvedValue({
      backend_status: "online",
      database_connected: true,
      app_version: "0.1.0",
      environment: "development",
      uptime_seconds: 42.5,
      current_timestamp: "2026-11-24T17:00:00Z",
      gemini_status: "not_configured",
    });

    api.getSystemCapabilities.mockResolvedValue({
      log_file_ingestion: "planned",
      incident_management: "implemented",
      ai_troubleshooting: "planned",
    });

    api.getOverviewSummary.mockResolvedValue({
      total_logs: 120,
      error_logs: 15,
      warning_logs: 8,
      critical_logs: 2,
      active_incidents: 1,
      configured_sources: 3,
    });

    api.getSeverityDistribution.mockResolvedValue({
      total: 120,
      distribution: [
        { severity: "ERROR", count: 15, percentage: 12.5 },
        { severity: "WARNING", count: 8, percentage: 6.7 },
        { severity: "CRITICAL", count: 2, percentage: 1.7 },
      ],
    });

    renderOverview();

    expect(await screen.findByText("120")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("SQLite Connected")).toBeInTheDocument();
    expect(screen.getByText("Not Configured")).toBeInTheDocument();
    expect(screen.getByText("42.5s")).toBeInTheDocument();
  });

  it("renders EmptyState when total_logs is 0", async () => {
    api.getSystemStatus.mockResolvedValue({
      backend_status: "online",
      database_connected: true,
      app_version: "0.1.0",
      environment: "development",
      uptime_seconds: 10.0,
      current_timestamp: "2026-11-24T17:00:00Z",
      gemini_status: "not_configured",
    });

    api.getSystemCapabilities.mockResolvedValue({
      log_file_ingestion: "planned",
      incident_management: "implemented",
    });

    api.getOverviewSummary.mockResolvedValue({
      total_logs: 0,
      error_logs: 0,
      warning_logs: 0,
      critical_logs: 0,
      active_incidents: 0,
      configured_sources: 0,
    });

    renderOverview();

    expect(await screen.findByText("No Ingested Logs")).toBeInTheDocument();
  });

  it("displays ErrorMessage when backend API fails", async () => {
    api.getSystemStatus.mockRejectedValue({
      message: "Backend is currently unreachable (Connection Refused).",
      status: 0,
      requestId: "err-1234",
    });
    api.getSystemCapabilities.mockRejectedValue(new Error("Failed"));
    api.getOverviewSummary.mockRejectedValue(new Error("Failed"));
    api.getLogActivity.mockRejectedValue(new Error("Failed"));
    api.getSeverityDistribution.mockRejectedValue(new Error("Failed"));
    api.getRecentIncidents.mockRejectedValue(new Error("Failed"));
    api.getSourceHealth.mockRejectedValue(new Error("Failed"));

    renderOverview();

    expect(
      await screen.findByText(/Backend is currently unreachable/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Request ID: err-1234")).toBeInTheDocument();
  });
});
