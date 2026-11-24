import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OverviewPage from "../pages/OverviewPage";
import * as api from "../services/api";

vi.mock("../services/api");

describe("OverviewPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders metric cards and telemetry on successful API responses", async () => {
    api.getSystemStatus.mockResolvedValueOnce({
      backend_status: "online",
      database_connected: true,
      app_version: "0.1.0",
      environment: "development",
      uptime_seconds: 42.5,
      current_timestamp: "2026-11-24T17:00:00Z",
      gemini_status: "not_configured",
    });

    api.getSystemCapabilities.mockResolvedValueOnce({
      log_file_ingestion: "planned",
      incident_management: "implemented",
      ai_troubleshooting: "planned",
    });

    api.getOverviewSummary.mockResolvedValueOnce({
      total_logs: 120,
      error_logs: 15,
      warning_logs: 8,
      critical_logs: 2,
      active_incidents: 1,
      configured_sources: 3,
    });

    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("120")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("SQLite Connected")).toBeInTheDocument();
    expect(screen.getByText("Not Configured")).toBeInTheDocument();
    expect(screen.getByText("42.5s")).toBeInTheDocument();
  });

  it("renders EmptyState when total_logs is 0", async () => {
    api.getSystemStatus.mockResolvedValueOnce({
      backend_status: "online",
      database_connected: true,
      app_version: "0.1.0",
      environment: "development",
      uptime_seconds: 10.0,
      current_timestamp: "2026-11-24T17:00:00Z",
      gemini_status: "not_configured",
    });

    api.getSystemCapabilities.mockResolvedValueOnce({
      log_file_ingestion: "planned",
      incident_management: "implemented",
    });

    api.getOverviewSummary.mockResolvedValueOnce({
      total_logs: 0,
      error_logs: 0,
      warning_logs: 0,
      critical_logs: 0,
      active_incidents: 0,
      configured_sources: 0,
    });

    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("No Ingested Logs")).toBeInTheDocument();
  });

  it("displays ErrorMessage when backend API fails", async () => {
    api.getSystemStatus.mockRejectedValueOnce({
      message: "Backend is currently unreachable (Connection Refused).",
      status: 0,
      requestId: "err-1234",
    });
    api.getSystemCapabilities.mockRejectedValueOnce(new Error("Failed"));
    api.getOverviewSummary.mockRejectedValueOnce(new Error("Failed"));

    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Backend is currently unreachable/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Request ID: err-1234")).toBeInTheDocument();
  });
});
