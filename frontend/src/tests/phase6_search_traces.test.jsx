import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdvancedSearchBar from "../components/search/AdvancedSearchBar";
import SavedSearchesModal from "../components/search/SavedSearchesModal";
import ExportDialog from "../components/search/ExportDialog";
import LogDetailDrawer from "../components/search/LogDetailDrawer";
import TraceTimeline from "../components/traces/TraceTimeline";

describe("Phase 6 Search & Traces UI Components", () => {
  describe("AdvancedSearchBar", () => {
    it("renders search input and triggers onSearch when submitted", () => {
      const handleSearch = vi.fn();
      const handleChange = vi.fn();
      render(
        <AdvancedSearchBar
          value="service:auth"
          onChange={handleChange}
          onSearch={handleSearch}
          suggestions={[]}
        />
      );

      const input = screen.getByPlaceholderText(/Filter logs:/i);
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("service:auth");

      const searchBtn = screen.getByRole("button", { name: "Search" });
      fireEvent.click(searchBtn);
      expect(handleSearch).toHaveBeenCalledTimes(1);
    });

    it("displays suggestions when dropdown is active", () => {
      const handleChange = vi.fn();
      const suggestions = [
        { value: "severity:ERROR", label: "Filter by severity level", category: "field" },
        { value: "service:payment", label: "Service: payment", category: "value" },
      ];

      render(
        <AdvancedSearchBar
          value=""
          onChange={handleChange}
          onSearch={vi.fn()}
          suggestions={suggestions}
        />
      );

      const input = screen.getByPlaceholderText(/Filter logs:/i);
      fireEvent.focus(input);

      expect(screen.getByText("Suggested Filters & Operators")).toBeInTheDocument();
      expect(screen.getByText("severity:ERROR")).toBeInTheDocument();

      fireEvent.click(screen.getByText("severity:ERROR"));
      expect(handleChange).toHaveBeenCalledWith("severity:ERROR");
    });
  });

  describe("SavedSearchesModal", () => {
    const mockSearches = [
      {
        id: "saved-1",
        name: "Critical Database Failures",
        query: "service:db AND severity:CRITICAL",
        description: "Deadlocks and pool timeouts",
      },
    ];

    it("renders saved search entries and executes selected query", () => {
      const handleSelect = vi.fn();
      render(
        <SavedSearchesModal
          isOpen={true}
          onClose={vi.fn()}
          savedSearches={mockSearches}
          onSelectSearch={handleSelect}
          onSaveCurrentQuery={vi.fn()}
          onDeleteSearch={vi.fn()}
          currentQuery=""
        />
      );

      expect(screen.getByText("Critical Database Failures")).toBeInTheDocument();
      expect(screen.getByText("service:db AND severity:CRITICAL")).toBeInTheDocument();

      const runBtn = screen.getByRole("button", { name: /run/i });
      fireEvent.click(runBtn);
      expect(handleSelect).toHaveBeenCalledWith("service:db AND severity:CRITICAL");
    });
  });

  describe("ExportDialog", () => {
    it("allows switching between CSV and JSON formats and triggers onExport", async () => {
      const handleExport = vi.fn().mockResolvedValue({});
      render(
        <ExportDialog
          isOpen={true}
          onClose={vi.fn()}
          onExport={handleExport}
          totalRecords={250}
        />
      );

      expect(screen.getByText("Export Logs")).toBeInTheDocument();
      expect(screen.getByText(/Formula Injection Defense Active/i)).toBeInTheDocument();

      // Click JSON format
      const jsonBtn = screen.getByRole("button", { name: /json document/i });
      fireEvent.click(jsonBtn);

      const downloadBtn = screen.getByRole("button", { name: /download json/i });
      fireEvent.click(downloadBtn);

      expect(handleExport).toHaveBeenCalledWith({ format: "json", limit: 1000 });
    });
  });

  describe("LogDetailDrawer", () => {
    const mockLog = {
      id: "log-abc-123",
      timestamp: "2026-11-25T01:00:00Z",
      severity: "ERROR",
      service_name: "auth-service",
      message: "JWT signature validation failed",
      trace_id: "trace-xyz-789",
      span_id: "span-001",
      template_id: "tmpl-42",
      metadata: { env: "production", attempt: 2 },
    };

    it("renders drawer with trace waterfall action and metadata", () => {
      render(
        <MemoryRouter>
          <LogDetailDrawer log={mockLog} isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.getByText("JWT signature validation failed")).toBeInTheDocument();
      expect(screen.getByText("trace-xyz-789")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /view trace waterfall/i })).toBeInTheDocument();
      expect(screen.getByText("tmpl-42")).toBeInTheDocument();
    });
  });

  describe("TraceTimeline", () => {
    const mockEvents = [
      {
        id: "evt-1",
        relative_start_ms: 0,
        duration_ms: 15.2,
        service_name: "api-gateway",
        severity: "INFO",
        message: "POST /login request received",
        is_error: false,
      },
      {
        id: "evt-2",
        relative_start_ms: 18.5,
        duration_ms: 45.0,
        service_name: "auth-service",
        severity: "ERROR",
        message: "Database connection refused on user query",
        is_error: true,
      },
    ];

    it("renders chronological trace events and highlights errors", () => {
      render(<TraceTimeline events={mockEvents} durationMs={65.0} />);

      expect(screen.getByText("+0ms")).toBeInTheDocument();
      expect(screen.getByText("api-gateway")).toBeInTheDocument();
      expect(screen.getByText("+18.5ms")).toBeInTheDocument();
      expect(screen.getByText("auth-service")).toBeInTheDocument();
      expect(screen.getByText("Database connection refused on user query")).toBeInTheDocument();
    });
  });
});
