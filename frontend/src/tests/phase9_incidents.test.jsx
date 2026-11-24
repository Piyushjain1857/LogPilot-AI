import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import IncidentMetricCards from "../components/incidents/IncidentMetricCards";
import IncidentTable from "../components/incidents/IncidentTable";
import IncidentDetailDrawer from "../components/incidents/IncidentDetailDrawer";
import IncidentsPage from "../pages/placeholders/IncidentsPage";
import { incidentService } from "../services/incidentService";
import { logSourceService } from "../services/logSourceService";

vi.mock("../services/incidentService", () => ({
  incidentService: {
    listIncidents: vi.fn(),
    getStatistics: vi.fn(),
    getIncidentDetail: vi.fn(),
    correlateIncidents: vi.fn(),
    updateStatus: vi.fn(),
    addNote: vi.fn(),
  },
}));

vi.mock("../services/logSourceService", () => ({
  logSourceService: {
    getSources: vi.fn(),
  },
}));

describe("Phase 9: Automated Incident Management UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("IncidentMetricCards", () => {
    it("renders total incidents, active count, critical count, and MTTR format", () => {
      const mockStats = {
        total_incidents: 24,
        active_incidents: 5,
        critical_incidents: 2,
        mitigated_incidents: 3,
        resolved_incidents: 16,
        mttr_seconds: 750, // 12m 30s
      };

      render(<IncidentMetricCards statistics={mockStats} loading={false} />);

      expect(screen.getByText("Total Incidents")).toBeInTheDocument();
      expect(screen.getByText("24")).toBeInTheDocument();
      expect(screen.getByText("Active Incidents")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText(/2 critical requiring attention/i)).toBeInTheDocument();
      expect(screen.getByText("12m 30s")).toBeInTheDocument();
    });
  });

  describe("IncidentTable", () => {
    const mockIncidents = [
      {
        id: "inc-101",
        incident_number: "INC-1001",
        title: "PostgreSQL Database Connection Exhaustion",
        description: "Connection pool saturated across order and payment services.",
        severity: "CRITICAL",
        status: "active",
        primary_service: "payment-service",
        affected_services: ["payment-service", "order-service"],
        anomaly_count: 2,
        cluster_count: 1,
        first_detected_at: "2026-11-25T01:00:00Z",
        last_detected_at: "2026-11-25T01:15:00Z",
      },
    ];

    it("renders incident row with number, services, signals count, and triggers inspect", () => {
      const onSelect = vi.fn();
      const onUpdate = vi.fn();

      render(
        <IncidentTable
          incidents={mockIncidents}
          loading={false}
          onSelectIncident={onSelect}
          onUpdateStatus={onUpdate}
        />
      );

      expect(screen.getByText("INC-1001")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL Database Connection Exhaustion")).toBeInTheDocument();
      expect(screen.getByText("payment-service")).toBeInTheDocument();
      expect(screen.getByText("order-service")).toBeInTheDocument();
      expect(screen.getByText("3 signals")).toBeInTheDocument();
      expect(screen.getByText("CRITICAL")).toBeInTheDocument();

      // Click Inspect
      fireEvent.click(screen.getByRole("button", { name: /Inspect/i }));
      expect(onSelect).toHaveBeenCalledWith("inc-101");

      // Click Investigate icon action
      fireEvent.click(screen.getByTitle("Acknowledge & Investigate"));
      expect(onUpdate).toHaveBeenCalledWith("inc-101", "investigating");
    });
  });

  describe("IncidentDetailDrawer", () => {
    const mockDetail = {
      id: "inc-101",
      incident_number: "INC-1001",
      title: "PostgreSQL Database Connection Exhaustion",
      description: "Connection pool saturated across order and payment services.",
      severity: "CRITICAL",
      status: "active",
      primary_service: "payment-service",
      affected_services: ["payment-service", "order-service"],
      root_cause_hypothesis: "Initial anomalous pool contention surfaced in payment-service before cascading downstream.",
      timeline_events: [
        {
          timestamp: "2026-11-25T01:00:00Z",
          event_type: "ANOMALY_DETECTED",
          service: "payment-service",
          description: "Statistical anomaly detected: error_rate spiked to 0.85",
        },
        {
          timestamp: "2026-11-25T01:05:00Z",
          event_type: "CLUSTER_SPIKE",
          service: "order-service",
          description: "Cluster pattern spike: 503 Service Unavailable",
        },
      ],
      sample_logs: [
        {
          id: "log-1",
          timestamp: "2026-11-25T01:00:00Z",
          service: "payment-service",
          severity: "CRITICAL",
          message: "PoolTimeout: Connection could not be acquired within 30000ms",
          trace_id: "tr-9001",
        },
      ],
    };

    it("renders drawer with blast radius, timeline events, evidence logs, and posts notes", () => {
      const onClose = vi.fn();
      const onUpdate = vi.fn();
      const onAddNote = vi.fn().mockResolvedValue({});

      render(
        <IncidentDetailDrawer
          incident={mockDetail}
          loading={false}
          onClose={onClose}
          onUpdateStatus={onUpdate}
          onAddNote={onAddNote}
        />
      );

      expect(screen.getAllByText("INC-1001").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Blast Radius & Service Impact")).toBeInTheDocument();
      expect(screen.getByText("[ORIGIN]")).toBeInTheDocument();
      expect(screen.getByText(/Initial anomalous pool contention/i)).toBeInTheDocument();
      expect(screen.getByText("Chronological Incident Timeline")).toBeInTheDocument();
      expect(screen.getByText(/error_rate spiked to 0.85/i)).toBeInTheDocument();
      expect(screen.getByText(/PoolTimeout: Connection could not be acquired/i)).toBeInTheDocument();

      // Post Note
      const noteInput = screen.getByPlaceholderText(/Record diagnostic finding/i);
      fireEvent.change(noteInput, { target: { value: "Restarting db connection pool." } });
      fireEvent.click(screen.getByRole("button", { name: /Post Note/i }));
      expect(onAddNote).toHaveBeenCalledWith("inc-101", "Restarting db connection pool.");
    });
  });

  describe("IncidentsPage Integration", () => {
    it("fetches incidents, displays table, and handles correlation trigger", async () => {
      logSourceService.getSources.mockResolvedValue([
        { id: "s1", service_name: "payment-service" },
        { id: "s2", service_name: "order-service" },
      ]);

      incidentService.getStatistics.mockResolvedValue({
        total_incidents: 10,
        active_incidents: 2,
        critical_incidents: 1,
        mitigated_incidents: 1,
        resolved_incidents: 7,
        mttr_seconds: 300,
      });

      incidentService.listIncidents.mockResolvedValue({
        incidents: [
          {
            id: "inc-101",
            incident_number: "INC-1001",
            title: "PostgreSQL Database Connection Exhaustion",
            description: "Connection pool saturated across order and payment services.",
            severity: "CRITICAL",
            status: "active",
            primary_service: "payment-service",
            affected_services: ["payment-service", "order-service"],
            anomaly_count: 2,
            cluster_count: 1,
            first_detected_at: "2026-11-25T01:00:00Z",
            last_detected_at: "2026-11-25T01:15:00Z",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      });

      incidentService.correlateIncidents.mockResolvedValue({
        status: "COMPLETED",
        incidents_created: 1,
        incidents_updated: 0,
        anomalies_correlated: 2,
        clusters_correlated: 1,
        incident_ids: ["inc-101"],
      });

      render(
        <BrowserRouter>
          <IncidentsPage />
        </BrowserRouter>
      );

      expect(screen.getByText("Incident Management Command Center")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("INC-1001")).toBeInTheDocument();
        expect(screen.getByText("PostgreSQL Database Connection Exhaustion")).toBeInTheDocument();
      });

      // Trigger correlation button
      fireEvent.click(screen.getByRole("button", { name: /Correlate Incidents/i }));

      await waitFor(() => {
        expect(incidentService.correlateIncidents).toHaveBeenCalled();
        expect(screen.getByText(/Correlation completed/i)).toBeInTheDocument();
      });
    });
  });
});
