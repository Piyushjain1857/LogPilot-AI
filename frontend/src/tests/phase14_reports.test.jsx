import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReportsPage from "../pages/placeholders/ReportsPage";
import AIAssistantPage from "../pages/placeholders/AIAssistantPage";
import { reportService } from "../services/reportService";
import { assistantService } from "../services/assistantService";
import { incidentService } from "../services/incidentService";

// Mock reportService
vi.mock("../services/reportService", () => ({
  reportService: {
    listReports: vi.fn(),
    getReport: vi.fn(),
    generatePostMortem: vi.fn(),
    getMarkdown: vi.fn(),
    getJson: vi.fn(),
    downloadPdf: vi.fn(),
  },
}));

// Mock assistantService
vi.mock("../services/assistantService", () => ({
  assistantService: {
    chat: vi.fn(),
    translateQuery: vi.fn(),
  },
}));

// Mock incidentService
vi.mock("../services/incidentService", () => ({
  incidentService: {
    listIncidents: vi.fn(),
  },
}));

const mockReports = [
  {
    id: "rpt-test-1",
    report_number: "RPT-1001",
    title: "Post-Mortem: DB Connection Saturation",
    category: "INCIDENT_POSTMORTEM",
    status: "FINALIZED",
    incident_id: "INC-101",
    summary: "PostgreSQL Hikari pool was exhausted due to unindexed query.",
    impact_assessment: "Affected 4.2% of checkout transactions.",
    root_cause_analysis: "Missing compound index on inventory_locks table.",
    remediation_summary: "Scaled connection pool and added index.",
    timeline: [
      { timestamp: "2026-11-24T10:00:00Z", component: "order-service", event: "Checkout timeout spike", severity: "CRITICAL" },
    ],
    metrics: { mttd: "420ms", mttr: "24m" },
    author: "LogPilot Autonomous SRE",
    created_at: "2026-11-24T10:30:00Z",
    updated_at: "2026-11-24T10:30:00Z",
  },
  {
    id: "rpt-test-2",
    report_number: "RPT-1002",
    title: "SLA Reliability & Uptime Audit",
    category: "SLA_AUDIT",
    status: "FINALIZED",
    incident_id: null,
    summary: "Weekly SLA report showing 99.98% availability across cluster.",
    impact_assessment: "Zero breach of SLO tier 1 services.",
    root_cause_analysis: "N/A",
    remediation_summary: "Cluster operating within nominal guardrails.",
    timeline: [],
    metrics: { availability: "99.98%" },
    author: "LogPilot Autonomous SRE",
    created_at: "2026-11-23T23:59:00Z",
    updated_at: "2026-11-23T23:59:00Z",
  },
];

describe("Phase 14: Incident Reports & AI Assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportService.listReports.mockResolvedValue(mockReports);
    reportService.getMarkdown.mockResolvedValue("# Post-Mortem: DB Connection Saturation");
    reportService.getJson.mockResolvedValue(mockReports[0]);
    reportService.downloadPdf.mockResolvedValue(true);
    incidentService.listIncidents.mockResolvedValue({
      incidents: [{ id: "INC-101", title: "DB connection spike", status: "active", service: "order-service" }],
    });
    assistantService.chat.mockResolvedValue({
      reply: "Active incident INC-101 is undergoing mitigation.",
      query_translation: "service:order-service AND status:500",
      suggested_actions: [{ label: "View Incidents", path: "/app/incidents" }],
    });
    assistantService.translateQuery.mockResolvedValue({
      question: "Show 500 errors in payment-service",
      translated_query: "service:payment-service AND status:500",
      explanation: "Filter payment-service with HTTP 500 status",
    });
  });

  it("renders ReportsPage with report catalog and detailed post-mortem sections", async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    // Header check
    expect(screen.getByText("Incident & Reliability Reports")).toBeInTheDocument();

    // Wait for mock reports to populate
    await waitFor(() => {
      expect(screen.getAllByText("RPT-1001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Post-Mortem: DB Connection Saturation").length).toBeGreaterThan(0);
    });

    // Check post-mortem sections
    expect(screen.getByText("1. Executive Summary")).toBeInTheDocument();
    expect(screen.getByText(/PostgreSQL Hikari pool was exhausted/i)).toBeInTheDocument();
    expect(screen.getByText("2. User Impact Assessment")).toBeInTheDocument();
    expect(screen.getByText("4. Root Cause Analysis")).toBeInTheDocument();
    expect(screen.getByText("5. Remediation & Action Items")).toBeInTheDocument();

    // Verify timeline entry
    expect(screen.getByText("Checkout timeout spike")).toBeInTheDocument();
  });

  it("supports report category filtering", async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("RPT-1001").length).toBeGreaterThan(0);
    });

    // Click SLA Audits filter button
    const slaBtn = screen.getByRole("button", { name: /SLA Audits/i });
    fireEvent.click(slaBtn);

    expect(reportService.listReports).toHaveBeenCalledWith({ category: "SLA_AUDIT" });
  });

  it("opens Generate Post-Mortem modal and calls reportService.generatePostMortem", async () => {
    reportService.generatePostMortem.mockResolvedValue({
      id: "rpt-new",
      report_number: "RPT-1003",
      title: "Synthesized Post-Mortem",
    });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    const openBtn = screen.getByRole("button", { name: /Generate Post-Mortem/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByText("Synthesize Incident Post-Mortem")).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("submit-generate-postmortem");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reportService.generatePostMortem).toHaveBeenCalledWith({
        incidentId: "INC-101",
        title: undefined,
      });
    });
  });

  it("renders AIAssistantPage, handles chat message submission and NLQ query translation", async () => {
    render(
      <MemoryRouter>
        <AIAssistantPage />
      </MemoryRouter>
    );

    expect(screen.getByText("AI SRE Assistant & NLQ Translator")).toBeInTheDocument();
    expect(screen.getByText("LogPilot Autonomous SRE")).toBeInTheDocument();

    // Chat submission
    const input = screen.getByPlaceholderText(/Ask SRE Assistant or describe/i);
    fireEvent.change(input, { target: { value: "What is happening with INC-101?" } });

    const sendBtn = screen.getByTitle("Send message");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(assistantService.chat).toHaveBeenCalledWith({
        message: "What is happening with INC-101?",
      });
      expect(screen.getByText("Active incident INC-101 is undergoing mitigation.")).toBeInTheDocument();
      expect(screen.getByText("service:order-service AND status:500")).toBeInTheDocument();
    });

    // NLQ compilation
    const nlqTextarea = screen.getByPlaceholderText(/Find connection pool errors/i);
    fireEvent.change(nlqTextarea, { target: { value: "Show 500 errors in payment-service" } });

    const compileBtn = screen.getByRole("button", { name: /Translate to LogPilot Query/i });
    fireEvent.click(compileBtn);

    await waitFor(() => {
      expect(assistantService.translateQuery).toHaveBeenCalledWith("Show 500 errors in payment-service");
      expect(screen.getByText("Filter payment-service with HTTP 500 status")).toBeInTheDocument();
    });
  });
});
