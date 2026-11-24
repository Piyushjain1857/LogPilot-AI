import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import FileDropzone from "../components/ingestion/FileDropzone";
import SelectedFileCard from "../components/ingestion/SelectedFileCard";
import FieldMappingTable from "../components/ingestion/FieldMappingTable";
import LogPreviewTable from "../components/ingestion/LogPreviewTable";
import UploadProgressCard from "../components/ingestion/UploadProgressCard";
import IngestionSummary from "../components/ingestion/IngestionSummary";
import LogSourcesPage from "../pages/placeholders/LogSourcesPage";
import LogExplorerPage from "../pages/placeholders/LogExplorerPage";
import * as uploadServiceModule from "../services/uploadService";
import * as logSourceServiceModule from "../services/logSourceService";
import * as logServiceModule from "../services/logService";

describe("Phase 3: Log Ingestion UI Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("FileDropzone renders upload prompt and supported format pills", () => {
    render(<FileDropzone onFilesSelected={vi.fn()} />);

    expect(screen.getByText(/Drop your log files here, or browse/i)).toBeInTheDocument();
    expect(screen.getByText(".log")).toBeInTheDocument();
    expect(screen.getByText(".csv")).toBeInTheDocument();
    expect(screen.getByText(".jsonl")).toBeInTheDocument();
  });

  it("SelectedFileCard displays file name, size, and remove button", () => {
    const fakeFile = new File(["sample log line"], "app.log", { type: "text/plain" });
    const onRemove = vi.fn();

    render(<SelectedFileCard file={fakeFile} onRemove={onRemove} format="LOG" />);

    expect(screen.getByText("app.log")).toBeInTheDocument();
    expect(screen.getByText("LOG")).toBeInTheDocument();

    const removeBtn = screen.getByTitle("Remove file");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(fakeFile);
  });

  it("FieldMappingTable allows column selection for target fields", () => {
    const available = ["timestamp", "lvl", "svc", "body", "trace"];
    const onChangeMapping = vi.fn();

    render(
      <FieldMappingTable
        availableColumns={available}
        mappings={{ message: "body" }}
        onChangeMapping={onChangeMapping}
        sampleRecord={{ body: "Order processed successfully" }}
      />
    );

    expect(screen.getByText("Target Field")).toBeInTheDocument();
    expect(screen.getByText("Message / Body")).toBeInTheDocument();

    const select = screen.getByLabelText(/Map source column for Message/i);
    expect(select.value).toBe("body");

    fireEvent.change(select, { target: { value: "svc" } });
    expect(onChangeMapping).toHaveBeenCalledWith("message", "svc");
  });

  it("LogPreviewTable displays parsed rows and redacted secret badges", () => {
    const records = [
      {
        line_number: 1,
        timestamp: "2026-11-24T10:00:00Z",
        severity: "ERROR",
        service_name: "auth-service",
        message: "Failed auth with token [REDACTED_BEARER_TOKEN]",
        trace_id: "tr-9988",
      },
    ];

    render(<LogPreviewTable records={records} />);

    expect(screen.getByText("auth-service")).toBeInTheDocument();
    expect(screen.getByText("tr-9988")).toBeInTheDocument();
    expect(screen.getByText("[REDACTED_BEARER_TOKEN]")).toBeInTheDocument();
    expect(screen.getByText("[REDACTED_BEARER_TOKEN]")).toHaveClass("redacted-badge");
  });

  it("UploadProgressCard renders stage, percentage, and metric counters", () => {
    const batch = {
      status: "PROCESSING",
      original_filename: "server-errors.txt",
      total_records: 100,
      processed_records: 65,
      successful_records: 60,
      failed_records: 5,
      redacted_records: 2,
    };

    render(
      <UploadProgressCard
        stage="processing"
        uploadPercent={100}
        batchData={batch}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/Ingesting & Analyzing Log Records/i)).toBeInTheDocument();
    expect(screen.getByText("server-errors.txt")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("Cancel Ingestion")).toBeInTheDocument();
  });

  it("IngestionSummary renders success status, metrics, and action buttons", () => {
    const batch = {
      status: "COMPLETED",
      original_filename: "microservices.csv",
      file_format: "CSV",
      file_size_bytes: 4096,
      successful_records: 150,
      failed_records: 0,
      redacted_records: 4,
      duration_ms: 1250,
    };

    const onExplore = vi.fn();
    const onUploadAnother = vi.fn();

    render(
      <IngestionSummary
        batchData={batch}
        onExploreLogs={onExplore}
        onUploadAnother={onUploadAnother}
      />
    );

    expect(screen.getByText("Log File Ingested Successfully")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    const exploreBtn = screen.getByText(/Explore Ingested Logs/i);
    fireEvent.click(exploreBtn);
    expect(onExplore).toHaveBeenCalled();
  });
});

describe("Phase 3: Log Sources and Explorer Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("LogSourcesPage loads sources and displays telemetry KPIs", async () => {
    vi.spyOn(logSourceServiceModule.logSourceService, "listSources").mockResolvedValue([
      { id: "src-1", name: "Billing Service", service_name: "billing", source_type: "file", is_active: true },
      { id: "src-2", name: "Auth Cluster", service_name: "auth", source_type: "api", is_active: true },
    ]);

    vi.spyOn(uploadServiceModule.uploadService, "listBatches").mockResolvedValue([
      {
        id: "batch-1",
        original_filename: "app.log",
        file_format: "LOG",
        file_size_bytes: 2048,
        status: "COMPLETED",
        successful_records: 200,
        failed_records: 0,
        redacted_records: 3,
        created_at: new Date().toISOString(),
      },
    ]);

    render(
      <BrowserRouter>
        <LogSourcesPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Log Sources & Telemetry Ingestion")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Billing Service")).toBeInTheDocument();
      expect(screen.getByText("Auth Cluster")).toBeInTheDocument();
    });

    // Check KPI counts
    expect(screen.getByText("2")).toBeInTheDocument(); // 2 active sources
    expect(screen.getByText("200")).toBeInTheDocument(); // 200 total records
  });

  it("LogExplorerPage renders filters, pagination, and loads logs from API", async () => {
    vi.spyOn(logSourceServiceModule.logSourceService, "listSources").mockResolvedValue([]);
    vi.spyOn(logServiceModule.logService, "listLogs").mockResolvedValue({
      items: [
        {
          id: "log-1",
          line_number: 1,
          timestamp: "2026-11-24T10:00:00Z",
          severity: "ERROR",
          service_name: "payment-service",
          message: "Payment gateway timeout connecting to stripe",
          trace_id: "tr-001",
        },
      ],
      total: 1,
      page: 1,
      page_size: 50,
      total_pages: 1,
    });

    render(
      <BrowserRouter>
        <LogExplorerPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Logs Explorer")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Payment gateway timeout connecting to stripe")).toBeInTheDocument();
      expect(screen.getByText("payment-service")).toBeInTheDocument();
    });
  });
});
