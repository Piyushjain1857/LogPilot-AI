import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import InvestigationStream from "../components/troubleshooter/InvestigationStream";
import TroubleshootingReport from "../components/troubleshooter/TroubleshootingReport";
import DiagnosticChat from "../components/troubleshooter/DiagnosticChat";
import TroubleshooterPage from "../pages/placeholders/TroubleshooterPage";
import { troubleshooterService } from "../services/troubleshooterService";
import { incidentService } from "../services/incidentService";

vi.mock("../services/troubleshooterService", () => ({
  troubleshooterService: {
    investigate: vi.fn(),
    getInvestigationById: vi.fn(),
    chat: vi.fn(),
  },
}));

vi.mock("../services/incidentService", () => ({
  incidentService: {
    listIncidents: vi.fn(),
  },
}));

describe("Phase 11: Gemini AI Troubleshooter UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("InvestigationStream", () => {
    const mockSteps = [
      {
        step: 1,
        thought: "Inspecting incident metadata and blast radius.",
        tool: "get_incident_detail",
        tool_input: { incident_id: "inc-1" },
        observation: { found: true, primary_service: "payment-service" },
      },
      {
        step: 2,
        thought: "Querying logs to extract trace spans.",
        tool: "query_logs",
        tool_input: { service: "payment-service" },
        observation: [{ log_id: "l1", message: "Timeout waiting for lock" }],
      },
    ];

    it("renders step pills, tool badges, and expandable observations", () => {
      render(<InvestigationStream thoughtSteps={mockSteps} />);

      expect(screen.getByText("get_incident_detail")).toBeInTheDocument();
      expect(screen.getByText("query_logs")).toBeInTheDocument();
      expect(screen.getAllByText("Inspecting incident metadata and blast radius.").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Tool Observation Output:/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("TroubleshootingReport", () => {
    const mockReport = {
      investigation_id: "inv-101",
      status: "completed",
      executive_summary: "Autonomous investigation verified database deadlock in payment-service.",
      root_cause_analysis: "Detailed causal chain analysis.",
      model_used: "gemini-2.5-flash",
      perspectives: {
        sre: {
          title: "SRE & Reliability Engineering",
          summary: "SLO error budget consumed.",
          severity: "CRITICAL",
          findings: ["Cascading timeouts across order-service."],
        },
        database_infra: {
          title: "Infrastructure & Database Tier",
          summary: "Connection pool exhausted (100/100).",
          severity: "HIGH",
          findings: ["Lock contention on accounts table."],
        },
      },
      remediation_steps: [
        {
          step_number: 1,
          action: "Scale payment-service pods to 5 replicas",
          command: "kubectl scale deployment payment-service --replicas=5",
          verification: "Verify pods running",
          rollback_plan: "kubectl scale deployment payment-service --replicas=3",
        },
      ],
      evidence_citations: [
        {
          log_id: "log-1",
          timestamp: "2026-11-25T01:00:00Z",
          service: "payment-service",
          severity: "CRITICAL",
          message: "Deadlock detected waiting for lock",
          trace_id: "tr-900",
        },
      ],
    };

    it("renders summary, model badge, switches perspectives, and shows remediation", () => {
      render(<TroubleshootingReport report={mockReport} />);

      expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument();
      expect(screen.getByText(/Autonomous investigation verified database deadlock/i)).toBeInTheDocument();
      expect(screen.getByText("SRE & Reliability")).toBeInTheDocument();
      expect(screen.getByText("Cascading timeouts across order-service.")).toBeInTheDocument();

      // Switch to database perspective
      fireEvent.click(screen.getByRole("button", { name: /Database & Infra/i }));
      expect(screen.getByText("Connection pool exhausted (100/100).")).toBeInTheDocument();

      // Remediation command
      expect(screen.getByText("kubectl scale deployment payment-service --replicas=5")).toBeInTheDocument();
      expect(screen.getByText("Deadlock detected waiting for lock")).toBeInTheDocument();
    });
  });

  describe("DiagnosticChat", () => {
    it("renders chat input and handles message submission", async () => {
      const onSend = vi.fn().mockResolvedValue({
        response: "The deadlock was caused by missing indexes on accounts_payable.",
        evidence_citations: [{ log_id: "l1" }],
      });

      render(
        <DiagnosticChat
          investigationId="inv-1"
          incidentId="inc-1"
          onSendMessage={onSend}
          loading={false}
        />
      );

      expect(screen.getByText("Grounded Diagnostic Chat")).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/Ask diagnostic questions/i);
      fireEvent.change(input, { target: { value: "Why did the service fail?" } });
      fireEvent.click(screen.getByRole("button", { name: /Send/i }));

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Why did the service fail?",
          })
        );
        expect(screen.getByText("The deadlock was caused by missing indexes on accounts_payable.")).toBeInTheDocument();
      });
    });
  });

  describe("TroubleshooterPage Integration", () => {
    it("loads incidents and triggers autonomous investigation", async () => {
      incidentService.listIncidents.mockResolvedValue({
        incidents: [
          {
            id: "inc-1",
            incident_number: "INC-1001",
            title: "Database Deadlock Outage",
          },
        ],
      });

      troubleshooterService.investigate.mockResolvedValue({
        investigation_id: "inv-1",
        status: "completed",
        executive_summary: "Verified root cause in payment-service.",
        root_cause_analysis: "Root cause detail.",
        model_used: "gemini-2.5-flash",
        perspectives: {
          sre: {
            title: "SRE & Reliability",
            summary: "Error rate elevated.",
            severity: "HIGH",
            findings: ["SLO degraded."],
          },
        },
        remediation_steps: [],
        evidence_citations: [],
        thought_steps: [
          {
            step: 1,
            thought: "Inspecting incident.",
            tool: "get_incident_detail",
            tool_input: {},
            observation: {},
          },
        ],
      });

      render(
        <BrowserRouter>
          <TroubleshooterPage />
        </BrowserRouter>
      );

      expect(screen.getByText("Gemini AI Troubleshooter & Autonomous Agent")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Verified root cause in payment-service.")).toBeInTheDocument();
        expect(screen.getByText("get_incident_detail")).toBeInTheDocument();
      });

      // Switch to Chat tab
      fireEvent.click(screen.getByRole("button", { name: /Grounded Chat/i }));
      expect(screen.getByText("Grounded Diagnostic Chat")).toBeInTheDocument();
    });
  });
});
