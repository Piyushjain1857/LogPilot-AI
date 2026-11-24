import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CausalServiceNode from "../components/rootcause/CausalServiceNode";
import HypothesisRankingList from "../components/rootcause/HypothesisRankingList";
import EvidenceDrawer from "../components/rootcause/EvidenceDrawer";
import RootCausePage from "../pages/placeholders/RootCausePage";
import { rootCauseService } from "../services/rootCauseService";
import { incidentService } from "../services/incidentService";

vi.mock("../services/rootCauseService", () => ({
  rootCauseService: {
    analyzeRootCause: vi.fn(),
    getTopology: vi.fn(),
    getAnalysisById: vi.fn(),
    getAnalysisForIncident: vi.fn(),
  },
}));

vi.mock("../services/incidentService", () => ({
  incidentService: {
    listIncidents: vi.fn(),
  },
}));

// Mock reactflow because canvas/DOM measurements in jsdom are empty
vi.mock("reactflow", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="react-flow-mock">{children}</div>,
  Background: () => <div data-testid="rf-background" />,
  Controls: () => <div data-testid="rf-controls" />,
  MiniMap: () => <div data-testid="rf-minimap" />,
  Handle: () => <div data-testid="rf-handle" />,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  MarkerType: { ArrowClosed: "arrowclosed" },
}));

describe("Phase 10: Evidence-Based Root Cause Analysis UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CausalServiceNode", () => {
    it("renders ROOT_CAUSE status, service label, error count, and anomaly score", () => {
      const mockData = {
        label: "payment-service",
        status: "ROOT_CAUSE",
        error_count: 24,
        anomaly_score: 0.96,
      };

      render(<CausalServiceNode data={mockData} />);

      expect(screen.getByText("ROOT CAUSE")).toBeInTheDocument();
      expect(screen.getByText("payment-service")).toBeInTheDocument();
      expect(screen.getByText("24 err")).toBeInTheDocument();
      expect(screen.getByText("96%")).toBeInTheDocument();
    });
  });

  describe("HypothesisRankingList", () => {
    const mockHypotheses = [
      {
        rank: 1,
        service_name: "payment-service",
        title: "Database Lock Contention in payment-service",
        explanation: "First anomalous degradation manifested at 01:00:00 UTC with 24 errors.",
        confidence_score: 0.94,
        temporal_precedence_score: 0.98,
        topological_depth_score: 0.95,
        error_severity_score: 0.88,
        cross_trace_score: 0.85,
        recommended_action: "Increase database pool size and inspect slow queries on table accounts.",
        evidence_citations: [
          {
            log_id: "log-101",
            timestamp: "2026-11-25T01:00:00Z",
            service_name: "payment-service",
            severity: "CRITICAL",
            message: "Deadlock detected on table accounts",
            trace_id: "tr-900",
            relevance_score: 0.95,
            citation_type: "LOG_ERROR",
          },
        ],
      },
    ];

    it("renders ranked card with confidence, score breakdown, remediation, and triggers evidence view", () => {
      const onSelect = vi.fn();
      const onViewEvidence = vi.fn();

      render(
        <HypothesisRankingList
          hypotheses={mockHypotheses}
          selectedService="payment-service"
          onSelectHypothesis={onSelect}
          onViewEvidence={onViewEvidence}
        />
      );

      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("payment-service")).toBeInTheDocument();
      expect(screen.getByText("PRIMARY ROOT CAUSE")).toBeInTheDocument();
      expect(screen.getByText("94%")).toBeInTheDocument();
      expect(screen.getByText(/Increase database pool size/i)).toBeInTheDocument();
      expect(screen.getByText("98%")).toBeInTheDocument(); // Time precedence

      // View Evidence button
      fireEvent.click(screen.getByRole("button", { name: /View Evidence/i }));
      expect(onViewEvidence).toHaveBeenCalledWith(mockHypotheses[0]);
    });
  });

  describe("EvidenceDrawer", () => {
    const mockHypothesis = {
      rank: 1,
      service_name: "payment-service",
      evidence_citations: [
        {
          log_id: "log-101",
          timestamp: "2026-11-25T01:00:00Z",
          service_name: "payment-service",
          severity: "CRITICAL",
          message: "Deadlock detected on table accounts_payable",
          trace_id: "tr-cascading-900",
          relevance_score: 0.96,
        },
      ],
    };

    it("renders drawer with citations, trace ID, timestamp, and message snippet", () => {
      const onClose = vi.fn();

      render(<EvidenceDrawer hypothesis={mockHypothesis} onClose={onClose} />);

      expect(screen.getByText(/Verified Evidence Citations/i)).toBeInTheDocument();
      expect(screen.getByText("Deadlock detected on table accounts_payable")).toBeInTheDocument();
      expect(screen.getByText("tr-cascading-900")).toBeInTheDocument();
      expect(screen.getByText("CRITICAL")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Close Evidence Drawer/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("RootCausePage Integration", () => {
    it("fetches incident, runs RCA, and renders graph and hypotheses", async () => {
      incidentService.listIncidents.mockResolvedValue({
        incidents: [
          {
            id: "inc-1",
            incident_number: "INC-1001",
            title: "Database Deadlock Outage",
          },
        ],
      });

      rootCauseService.getTopology.mockResolvedValue({
        nodes: [
          { id: "api-gateway", label: "api-gateway", status: "HEALTHY" },
          { id: "payment-service", label: "payment-service", status: "HEALTHY" },
        ],
        edges: [{ id: "e1", source: "api-gateway", target: "payment-service" }],
        total_services: 2,
        total_dependencies: 1,
      });

      rootCauseService.analyzeRootCause.mockResolvedValue({
        analysis_id: "ana-1",
        status: "completed",
        summary: "Automated RCA identified 'payment-service' as the root cause with 94% confidence.",
        confidence_score: 0.94,
        top_root_cause_service: "payment-service",
        graph: {
          nodes: [
            { id: "api-gateway", label: "api-gateway", status: "SYMPTOM" },
            { id: "payment-service", label: "payment-service", status: "ROOT_CAUSE", error_count: 15 },
          ],
          edges: [{ id: "ce1", source: "api-gateway", target: "payment-service", is_critical_path: true }],
          root_node_id: "payment-service",
        },
        hypotheses: [
          {
            rank: 1,
            service_name: "payment-service",
            title: "Originating Resource Contention in payment-service",
            explanation: "First anomalous degradation manifested in payment-service.",
            confidence_score: 0.94,
            temporal_precedence_score: 0.98,
            topological_depth_score: 0.95,
            error_severity_score: 0.88,
            cross_trace_score: 0.85,
            recommended_action: "Inspect connection limits.",
            evidence_citations: [],
          },
        ],
      });

      render(
        <BrowserRouter>
          <RootCausePage />
        </BrowserRouter>
      );

      expect(screen.getByText("Evidence-Based Root Cause Analysis")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Automated RCA identified 'payment-service'/i)).toBeInTheDocument();
        expect(screen.getByText("Originating Resource Contention in payment-service")).toBeInTheDocument();
      });

      // Switch to Global Topology view
      fireEvent.click(screen.getByRole("button", { name: /Global Topology/i }));
      expect(screen.getByText("Global Inferred Topology")).toBeInTheDocument();
    });
  });
});
