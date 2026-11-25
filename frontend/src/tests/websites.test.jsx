import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WebsitesPage from "../pages/WebsitesPage";
import * as websiteService from "../services/websiteService";

vi.mock("../services/websiteService", () => ({
  listWebsites: vi.fn(),
  getWebsite: vi.fn(),
  createWebsite: vi.fn(),
  pauseWebsite: vi.fn(),
  resumeWebsite: vi.fn(),
  checkWebsiteNow: vi.fn(),
  deleteWebsite: vi.fn(),
  diagnoseWebsiteAI: vi.fn(),
  getGitHubCodePatch: vi.fn(),
}));

describe("Websites & Live Monitoring Dashboard", () => {
  const mockWebsites = [
    {
      id: "site-1",
      name: "Storefront Web App",
      url: "https://storefront.example.com",
      ingestion_key: "lp_live_mock_token_12345",
      status: "active",
      interval_seconds: 30,
      last_status: "up",
      last_status_code: 200,
      last_response_time_ms: 124.5,
      uptime_percentage: 99.8,
      total_checks: 100,
      successful_checks: 99,
      ssl_valid: true,
      ssl_days_remaining: 82,
      ssl_issuer: "Let's Encrypt",
      dns_ip: "104.21.45.12",
      dns_lookup_time_ms: 3.2,
      github_repo: "acme/storefront",
      github_branch: "main",
      recent_checks: [
        {
          id: "chk-1",
          website_id: "site-1",
          checked_at: new Date().toISOString(),
          status: "up",
          status_code: 200,
          response_time_ms: 124.5,
          dns_lookup_time_ms: 3.2,
          ssl_valid: true,
          error_message: null,
        },
      ],
      recent_sdk_events: [
        {
          id: "evt-1",
          website_id: "site-1",
          event_type: "error",
          timestamp: new Date().toISOString(),
          severity: "CRITICAL",
          message: "DatabaseConnectionError: pool exhausted (max=100)",
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    websiteService.listWebsites.mockResolvedValue({
      websites: mockWebsites,
      total_count: 1,
      online_count: 1,
      offline_count: 0,
      degraded_count: 0,
    });
    websiteService.getWebsite.mockResolvedValue(mockWebsites[0]);
  });

  it("renders WebsitesPage with header, site switcher, and KPI stat cards", async () => {
    render(
      <MemoryRouter>
        <WebsitesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Connect Website & Live Observability")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Storefront Web App").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/99\.8/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/124\.5/).length).toBeGreaterThan(0);
    expect(screen.getByText("82 Days")).toBeInTheDocument();
  });

  it("triggers manual synthetic probe on demand", async () => {
    websiteService.checkWebsiteNow.mockResolvedValueOnce({
      id: "chk-new",
      website_id: "site-1",
      checked_at: new Date().toISOString(),
      status: "up",
      status_code: 200,
      response_time_ms: 110.0,
      dns_lookup_time_ms: 2.5,
      ssl_valid: true,
      error_message: null,
    });

    render(
      <MemoryRouter>
        <WebsitesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Probe Now")).toBeInTheDocument();
    });

    const probeBtn = screen.getByText("Probe Now");
    fireEvent.click(probeBtn);

    await waitFor(() => {
      expect(websiteService.checkWebsiteNow).toHaveBeenCalledWith("site-1");
    });
  });

  it("opens modal and connects a new website", async () => {
    websiteService.createWebsite.mockResolvedValueOnce({
      id: "site-2",
      name: "Payment API Service",
      url: "https://pay.example.com/health",
      ingestion_key: "lp_live_new_key",
      status: "active",
      interval_seconds: 15,
      last_status: "up",
      last_status_code: 200,
      uptime_percentage: 100.0,
      total_checks: 1,
      successful_checks: 1,
    });

    render(
      <MemoryRouter>
        <WebsitesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /connect new website/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /connect new website/i }));

    expect(screen.getByText("Connect Website for Live Monitoring")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. Production Storefront API/i);
    const urlInput = screen.getByPlaceholderText(/http:\/\/localhost:5174\/health or https:\/\/myapp\.com/i);

    fireEvent.change(nameInput, { target: { value: "Payment API Service" } });
    fireEvent.change(urlInput, { target: { value: "https://pay.example.com/health" } });

    const submitBtn = screen.getByRole("button", { name: /connect & start probing/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(websiteService.createWebsite).toHaveBeenCalledWith({
        name: "Payment API Service",
        url: "https://pay.example.com/health",
        interval_seconds: 30,
        check_ssl: true,
        check_dns: true,
        github_repo: null,
      });
    });
  });

  it("runs AI Troubleshooter diagnosis and displays root cause and code patch", async () => {
    websiteService.diagnoseWebsiteAI.mockResolvedValueOnce({
      website_id: "site-1",
      website_name: "Storefront Web App",
      error_summary: "PostgreSQL Connection Pool Saturation",
      severity: "CRITICAL",
      affected_service: "storefront-database",
      probable_root_cause: "Connection leak in checkout worker transaction pool.",
      confidence_level: "HIGH (96% Confidence)",
      confidence_score: 0.96,
      is_confirmed_finding: true,
      supporting_evidence: [
        {
          type: "log",
          timestamp: new Date().toISOString(),
          source: "SDK: error",
          content: "DatabaseConnectionError: pool exhausted (max=100)",
          confirmed: true,
        },
      ],
      suggested_solution: "Increase PgBouncer pool ceiling to 250 connections.",
      suggested_code_patch: "--- a/config/database.js\n+++ b/config/database.js\n@@ -14,3 +14,5 @@\n   max: 250,\n",
      recommended_prevention_measures: ["Deploy automated circuit breaker."],
      created_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <WebsitesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("AI Troubleshooter")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("AI Troubleshooter"));

    await waitFor(() => {
      expect(screen.getByText("PostgreSQL Connection Pool Saturation")).toBeInTheDocument();
      expect(screen.getByText(/Connection leak in checkout worker transaction pool/i)).toBeInTheDocument();
      expect(screen.getByText(/Increase PgBouncer pool ceiling/i)).toBeInTheDocument();
      expect(screen.getByText(/AI PROPOSED CODE FIX/i)).toBeInTheDocument();
    });
  });
});
