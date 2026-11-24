import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import ClusterMetricCards from "../components/clusters/ClusterMetricCards";
import ClusterTable from "../components/clusters/ClusterTable";
import ClusterDetailDrawer from "../components/clusters/ClusterDetailDrawer";
import ClusterExplorerPage from "../pages/placeholders/ClusterExplorerPage";
import { clusterService } from "../services/clusterService";
import { logSourceService } from "../services/logSourceService";

vi.mock("../services/clusterService", () => ({
  clusterService: {
    listClusters: vi.fn(),
    getClusterDetail: vi.fn(),
    updateClusterStatus: vi.fn(),
    mineClusters: vi.fn(),
    getStatistics: vi.fn(),
  },
}));

vi.mock("../services/logSourceService", () => ({
  logSourceService: {
    listSources: vi.fn(),
  },
}));

describe("Phase 8: Log Clustering & Pattern Mining UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ClusterMetricCards", () => {
    it("renders total, active, grouped errors, and new clusters metrics", () => {
      const stats = {
        total_clusters: 42,
        active_clusters: 38,
        total_grouped_errors: 1250,
        new_last_24h: 5,
        resolved_clusters: 4,
      };

      render(<ClusterMetricCards stats={stats} loading={false} />);

      expect(screen.getByText("Total Patterns Mined")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("Grouped Error Events")).toBeInTheDocument();
      expect(screen.getByText("1,250")).toBeInTheDocument();
      expect(screen.getByText("New Clusters (24h)")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Resolved Clusters")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  describe("ClusterTable", () => {
    const mockClusters = [
      {
        id: "cl-1",
        service_name: "payment-service",
        name: "Payment timeout for user on gateway",
        template: "Payment timeout for user <NUM> on gateway <IP>",
        severity: "ERROR",
        occurrence_count: 85,
        error_count: 85,
        status: "ACTIVE",
        first_seen_at: "2026-11-25T00:00:00Z",
        last_seen_at: "2026-11-25T01:15:00Z",
      },
    ];

    it("renders cluster row with template chips, counts, and triggers actions", () => {
      const onSelect = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ClusterTable
          clusters={mockClusters}
          loading={false}
          onSelectCluster={onSelect}
          onUpdateStatus={onUpdate}
        />
      );

      expect(screen.getByText("payment-service")).toBeInTheDocument();
      expect(screen.getByText("<NUM>")).toBeInTheDocument();
      expect(screen.getByText("<IP>")).toBeInTheDocument();
      expect(screen.getAllByText("85").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();

      // Inspect click
      fireEvent.click(screen.getByRole("button", { name: /Inspect/i }));
      expect(onSelect).toHaveBeenCalledWith("cl-1");

      // Mute click
      fireEvent.click(screen.getByTitle("Mute Cluster"));
      expect(onUpdate).toHaveBeenCalledWith("cl-1", "MUTED");
    });
  });

  describe("ClusterDetailDrawer", () => {
    const mockDetail = {
      id: "cl-1",
      signature_hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      service_name: "payment-service",
      name: "Payment timeout for user on gateway",
      template: "Payment timeout for user <NUM> on gateway <IP>",
      severity: "ERROR",
      occurrence_count: 85,
      error_count: 85,
      status: "ACTIVE",
      first_seen_at: "2026-11-25T00:00:00Z",
      last_seen_at: "2026-11-25T01:15:00Z",
      variable_parameters: {
        num: ["1001", "1002", "1003"],
        ip: ["192.168.1.10", "192.168.1.11"],
      },
      member_logs: [
        {
          id: "log-1",
          timestamp: "2026-11-25T01:15:00Z",
          severity: "ERROR",
          message: "Payment timeout for user 1001 on gateway 192.168.1.10",
          trace_id: "tr-9988",
        },
      ],
    };

    it("renders drawer with template, variables, and member logs", () => {
      const onClose = vi.fn();
      const onUpdate = vi.fn();

      render(
        <ClusterDetailDrawer
          clusterDetail={mockDetail}
          isOpen={true}
          onClose={onClose}
          onUpdateStatus={onUpdate}
        />
      );

      expect(screen.getByText("Payment timeout for user on gateway")).toBeInTheDocument();
      expect(screen.getByText("<NUM>:").parentElement).toHaveTextContent("1001");
      expect(screen.getByText("<IP>:").parentElement).toHaveTextContent("192.168.1.10");
      expect(screen.getByText("Payment timeout for user 1001 on gateway 192.168.1.10")).toBeInTheDocument();

      // Trigger status update
      fireEvent.click(screen.getByText(/Mark Resolved/i));
      expect(onUpdate).toHaveBeenCalledWith("cl-1", "RESOLVED");
    });
  });

  describe("ClusterExplorerPage Integration", () => {
    it("renders page, handles template mining action, and fetches clusters", async () => {
      logSourceService.listSources.mockResolvedValue([{ service_name: "payment-service" }]);
      clusterService.getStatistics.mockResolvedValue({
        total_clusters: 15,
        active_clusters: 12,
        muted_clusters: 2,
        resolved_clusters: 1,
        new_last_24h: 3,
        total_grouped_errors: 450,
        top_clusters: [],
      });

      clusterService.listClusters.mockResolvedValue({
        items: [
          {
            id: "cl-99",
            service_name: "payment-service",
            name: "Database deadlock on order",
            template: "Database deadlock on order processing <NUM>",
            severity: "CRITICAL",
            occurrence_count: 50,
            error_count: 50,
            status: "ACTIVE",
            first_seen_at: "2026-11-25T00:00:00Z",
            last_seen_at: "2026-11-25T01:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        page_size: 25,
        total_pages: 1,
      });

      clusterService.mineClusters.mockResolvedValue({
        status: "COMPLETED",
        logs_processed: 120,
        clusters_created: 2,
        clusters_updated: 5,
        total_active_clusters: 12,
      });

      render(
        <BrowserRouter>
          <ClusterExplorerPage />
        </BrowserRouter>
      );

      expect(screen.getByText("Log Clusters & Pattern Mining")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText("payment-service").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("<NUM>")).toBeInTheDocument();
        expect(screen.getAllByText("50").length).toBeGreaterThanOrEqual(1);
      });

      // Trigger mining
      fireEvent.click(screen.getByRole("button", { name: /Mine Templates/i }));

      await waitFor(() => {
        expect(clusterService.mineClusters).toHaveBeenCalled();
        expect(screen.getByText(/Drain3 mining completed/i)).toBeInTheDocument();
      });
    });
  });
});
