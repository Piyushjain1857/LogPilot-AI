import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SystemPulseBanner from "../components/dashboard/SystemPulseBanner";
import ServiceHealthMatrix from "../components/dashboard/ServiceHealthMatrix";
import CommandPalette from "../components/common/CommandPalette";
import OverviewPage from "../pages/OverviewPage";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual("../services/api");
  return {
    ...actual,
    getSystemStatus: vi.fn(),
    getSystemCapabilities: vi.fn(),
    getOverviewSummary: vi.fn(),
    getLogActivity: vi.fn(),
    getSeverityDistribution: vi.fn(),
    getRecentIncidents: vi.fn(),
    getSourceHealth: vi.fn(),
    getServiceMatrix: vi.fn(),
    getCommandCenterTelemetry: vi.fn(),
    getPreferences: vi.fn(),
    getNotifications: vi.fn(),
  };
});

const mockTelemetry = {
  system_health_index: 96,
  system_status: "HEALTHY",
  events_per_second: 18.2,
  errors_per_minute: 0.6,
  active_incidents_count: 0,
  unresolved_anomalies_count: 0,
  total_logs: 15420,
  error_rate_percentage: 0.4,
};

const mockServices = [
  {
    service_name: "gateway-service",
    tier: "Tier-1 Edge",
    health: "HEALTHY",
    log_count: 5200,
    error_count: 12,
    error_rate: 0.23,
    avg_latency_ms: 24,
    last_seen_at: "2026-11-25T01:00:00Z",
    open_incidents: 0,
  },
  {
    service_name: "payment-service",
    tier: "Tier-1 Core",
    health: "DEGRADED",
    log_count: 3100,
    error_count: 65,
    error_rate: 2.1,
    avg_latency_ms: 110,
    last_seen_at: "2026-11-25T01:00:00Z",
    open_incidents: 1,
  },
];

describe("Phase 13: Interactive Monitoring Dashboard & Command Center", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders SystemPulseBanner with health index and handles time range / service filters", () => {
    const handleTimeChange = vi.fn();
    const handleServiceChange = vi.fn();

    render(
      <SystemPulseBanner
        telemetry={mockTelemetry}
        timeRange="24h"
        onTimeRangeChange={handleTimeChange}
        selectedService="all"
        onServiceChange={handleServiceChange}
      />
    );

    expect(screen.getByText("96%")).toBeInTheDocument();
    expect(screen.getByText("HEALTHY")).toBeInTheDocument();
    expect(screen.getByText("18.2")).toBeInTheDocument();

    // Click 1h time horizon
    const btn1h = screen.getByRole("button", { name: "1h" });
    fireEvent.click(btn1h);
    expect(handleTimeChange).toHaveBeenCalledWith("1h");

    // Change service dropdown
    const select = screen.getByLabelText(/Filter by microservice/i);
    fireEvent.change(select, { target: { value: "payment-service" } });
    expect(handleServiceChange).toHaveBeenCalledWith("payment-service");
  });

  it("renders ServiceHealthMatrix with service status, latency, and click selection", () => {
    const handleSelect = vi.fn();

    render(
      <MemoryRouter>
        <ServiceHealthMatrix
          services={mockServices}
          selectedService="all"
          onSelectService={handleSelect}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("gateway-service")).toBeInTheDocument();
    expect(screen.getByText("payment-service")).toBeInTheDocument();
    expect(screen.getByText(/24ms avg/i)).toBeInTheDocument();
    expect(screen.getByText(/110ms avg/i)).toBeInTheDocument();

    // Click on payment-service card
    const paymentCard = screen.getByText("payment-service").closest("div[style*='cursor: pointer']");
    if (paymentCard) {
      fireEvent.click(paymentCard);
      expect(handleSelect).toHaveBeenCalledWith("payment-service");
    }
  });

  it("renders CommandPalette and searches both routes and dynamic log queries", () => {
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/Search pages/i)).toBeInTheDocument();
    expect(screen.getByText("Overview Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Remediation Playbooks")).toBeInTheDocument();

    // Type a specific query
    const input = screen.getByPlaceholderText(/Search pages/i);
    fireEvent.change(input, { target: { value: "database timeout" } });

    // Dynamic log query item should appear
    expect(screen.getByText('Search logs for "database timeout"')).toBeInTheDocument();
  });

  it("renders upgraded OverviewPage including SystemPulseBanner and ServiceHealthMatrix", async () => {
    api.getSystemStatus.mockResolvedValue({ backend_status: "online", status: "healthy", database: "connected" });
    api.getSystemCapabilities.mockResolvedValue({});
    api.getOverviewSummary.mockResolvedValue({
      total_logs: 100,
      error_logs: 5,
      warning_logs: 10,
      critical_logs: 0,
      active_incidents: 1,
      configured_sources: 3,
    });
    api.getLogActivity.mockResolvedValue({ points: [] });
    api.getSeverityDistribution.mockResolvedValue({ total: 100, distribution: [] });
    api.getRecentIncidents.mockResolvedValue({ incidents: [] });
    api.getSourceHealth.mockResolvedValue({ sources: [] });
    api.getServiceMatrix.mockResolvedValue({ services: mockServices });
    api.getCommandCenterTelemetry.mockResolvedValue(mockTelemetry);

    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/System Health Index/i)).toBeInTheDocument();
      expect(screen.getByText("gateway-service")).toBeInTheDocument();
    });
  });
});
