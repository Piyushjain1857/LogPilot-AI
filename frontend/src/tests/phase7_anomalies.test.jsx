import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import AnomalyMetricCards from "../components/anomalies/AnomalyMetricCards";
import AnomalyTable from "../components/anomalies/AnomalyTable";
import AnomalyDetailDrawer from "../components/anomalies/AnomalyDetailDrawer";
import DetectionRunModal from "../components/anomalies/DetectionRunModal";
import AnomaliesPage from "../pages/placeholders/AnomaliesPage";
import { anomalyService } from "../services/anomalyService";
import { logSourceService } from "../services/logSourceService";

vi.mock("../services/anomalyService", () => ({
  anomalyService: {
    listAnomalies: vi.fn(),
    getAnomalyDetail: vi.fn(),
    updateAnomalyStatus: vi.fn(),
    getStatistics: vi.fn(),
    getBaselines: vi.fn(),
    rebuildBaselines: vi.fn(),
    triggerDetection: vi.fn(),
    getConfiguration: vi.fn(),
    updateConfiguration: vi.fn(),
  },
}));

vi.mock("../services/logSourceService", () => ({
  logSourceService: {
    listSources: vi.fn(),
  },
}));

describe("Phase 7: Anomaly Detection UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AnomalyMetricCards", () => {
    it("renders active, critical, score, and outlier service statistics", () => {
      const stats = {
        total_active: 8,
        critical_count: 2,
        high_count: 3,
        avg_anomaly_score: 0.742,
        most_anomalous_service: "payment-gateway",
      };

      render(<AnomalyMetricCards stats={stats} loading={false} />);

      expect(screen.getByText("Active Anomalies")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("Critical Anomalies")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("74.2%")).toBeInTheDocument();
      expect(screen.getByText("payment-gateway")).toBeInTheDocument();
    });
  });

  describe("AnomalyTable", () => {
    const mockAnomalies = [
      {
        id: 101,
        detected_at: "2026-11-25T01:00:00Z",
        service_name: "checkout-service",
        anomaly_type: "ERROR_SPIKE",
        severity: "CRITICAL",
        anomaly_score: 0.92,
        algorithm: "Z_SCORE",
        metric_name: "error_rate",
        observed_value: 0.85,
        expected_value: 0.05,
        threshold: 0.25,
        status: "ACTIVE",
      },
    ];

    it("renders anomaly records with severity, scores, and triggers actions", () => {
      const onSelect = vi.fn();
      const onUpdate = vi.fn();

      render(
        <AnomalyTable
          anomalies={mockAnomalies}
          loading={false}
          onSelectAnomaly={onSelect}
          onUpdateStatus={onUpdate}
        />
      );

      expect(screen.getByText("checkout-service")).toBeInTheDocument();
      expect(screen.getByText("ERROR SPIKE")).toBeInTheDocument();
      expect(screen.getByText("CRITICAL")).toBeInTheDocument();
      expect(screen.getByText("92%")).toBeInTheDocument();
      expect(screen.getByText("Z-Score")).toBeInTheDocument();

      // Trigger inspect
      fireEvent.click(screen.getByText(/Inspect/i));
      expect(onSelect).toHaveBeenCalledWith(101);

      // Trigger acknowledge
      fireEvent.click(screen.getByText(/Ack/i));
      expect(onUpdate).toHaveBeenCalledWith(101, "ACKNOWLEDGED");
    });
  });

  describe("AnomalyDetailDrawer", () => {
    const mockDetail = {
      id: 101,
      detected_at: "2026-11-25T01:00:00Z",
      service_name: "checkout-service",
      anomaly_type: "ERROR_SPIKE",
      severity: "CRITICAL",
      anomaly_score: 0.92,
      algorithm: "Z_SCORE",
      metric_name: "error_rate",
      observed_value: 0.85,
      expected_value: 0.05,
      threshold: 0.25,
      status: "ACTIVE",
      baseline: {
        mean: 0.05,
        std_dev: 0.02,
        median: 0.04,
        mad: 0.01,
        ewma_mean: 0.045,
        p95: 0.08,
      },
      surrounding_logs: [
        {
          id: "log-1",
          timestamp: "2026-11-25T01:00:05Z",
          severity: "CRITICAL",
          message: "Transaction rollback due to connection failure",
          trace_id: "tr-98112",
        },
      ],
    };

    it("renders drawer with metrics divergence, baseline profile, and surrounding logs", () => {
      const onClose = vi.fn();
      const onUpdate = vi.fn();

      render(
        <AnomalyDetailDrawer
          anomalyDetail={mockDetail}
          isOpen={true}
          onClose={onClose}
          onUpdateStatus={onUpdate}
        />
      );

      expect(screen.getByText("checkout-service — ERROR SPIKE")).toBeInTheDocument();
      expect(screen.getByText("92%")).toBeInTheDocument();
      expect(screen.getByText("Transaction rollback due to connection failure")).toBeInTheDocument();
      expect(screen.getByText("tr-98112")).toBeInTheDocument();

      // Click Mark Resolved
      fireEvent.click(screen.getByText(/Mark Resolved/i));
      expect(onUpdate).toHaveBeenCalledWith(101, "RESOLVED");
    });
  });

  describe("DetectionRunModal", () => {
    it("handles form inputs and triggers onRunDetection", async () => {
      const onClose = vi.fn();
      const onRun = vi.fn().mockResolvedValue({
        total_windows_analyzed: 12,
        anomalies_detected: 2,
      });

      render(
        <DetectionRunModal
          isOpen={true}
          onClose={onClose}
          onRunDetection={onRun}
          services={["auth-service", "checkout-service"]}
        />
      );

      expect(screen.getByText("Execute Anomaly Detection")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Run Detection/i }));

      await waitFor(() => {
        expect(onRun).toHaveBeenCalled();
        expect(screen.getByText(/Detection Completed!/i)).toBeInTheDocument();
      });
    });
  });

  describe("AnomaliesPage Integration", () => {
    it("mounts page, fetches stats, sources, and renders anomaly table", async () => {
      logSourceService.listSources.mockResolvedValue([
        { service_name: "checkout-service" },
        { service_name: "payment-service" },
      ]);

      anomalyService.getStatistics.mockResolvedValue({
        total_active: 3,
        critical_count: 1,
        high_count: 1,
        medium_count: 1,
        low_count: 0,
        avg_anomaly_score: 0.65,
        most_anomalous_service: "checkout-service",
        recent_trend: [],
      });

      anomalyService.listAnomalies.mockResolvedValue({
        items: [
          {
            id: 202,
            detected_at: "2026-11-25T01:10:00Z",
            service_name: "payment-service",
            anomaly_type: "LATENCY_P95_BREACH",
            severity: "HIGH",
            anomaly_score: 0.78,
            algorithm: "MAD",
            metric_name: "p95_latency_ms",
            observed_value: 3200,
            expected_value: 120,
            threshold: 450,
            status: "ACTIVE",
          },
        ],
        total: 1,
        page: 1,
        page_size: 25,
        total_pages: 1,
      });

      render(
        <BrowserRouter>
          <AnomaliesPage />
        </BrowserRouter>
      );

      expect(screen.getByText("Anomaly Detection Engine")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText("payment-service").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("LATENCY P95 BREACH")).toBeInTheDocument();
        expect(screen.getByText("78%")).toBeInTheDocument();
      });
    });
  });
});
