import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StreamingConnectionBadge from "../components/streaming/StreamingConnectionBadge";
import StreamToolbar from "../components/streaming/StreamToolbar";
import StreamFilterBar from "../components/streaming/StreamFilterBar";
import LiveLogTable from "../components/streaming/LiveLogTable";

describe("Phase 5 Streaming UI Components", () => {
  describe("StreamingConnectionBadge", () => {
    it("renders LIVE badge when status is CONNECTED", () => {
      render(<StreamingConnectionBadge status="CONNECTED" />);
      expect(screen.getByText("LIVE")).toBeInTheDocument();
    });

    it("renders Connecting status when status is CONNECTING", () => {
      render(<StreamingConnectionBadge status="CONNECTING" />);
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });

    it("renders Reconnecting status when status is RECONNECTING", () => {
      render(<StreamingConnectionBadge status="RECONNECTING" />);
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("renders Offline and Reconnect button when disconnected", () => {
      const handleReconnect = vi.fn();
      render(<StreamingConnectionBadge status="DISCONNECTED" onReconnect={handleReconnect} />);
      expect(screen.getByText("Offline")).toBeInTheDocument();
      const reconnectBtn = screen.getByRole("button", { name: /reconnect/i });
      expect(reconnectBtn).toBeInTheDocument();
      fireEvent.click(reconnectBtn);
      expect(handleReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("StreamToolbar", () => {
    it("renders Pause button when stream is active", () => {
      const handlePause = vi.fn();
      render(
        <StreamToolbar
          isPaused={false}
          pendingCount={0}
          onPause={handlePause}
          onResume={vi.fn()}
          onClear={vi.fn()}
          autoScroll={true}
          onToggleAutoScroll={vi.fn()}
          onJumpToLatest={vi.fn()}
          showJumpButton={false}
        />
      );
      const pauseBtn = screen.getByRole("button", { name: /pause/i });
      fireEvent.click(pauseBtn);
      expect(handlePause).toHaveBeenCalledTimes(1);
    });

    it("renders Resume button with pending count badge when stream is paused", () => {
      const handleResume = vi.fn();
      render(
        <StreamToolbar
          isPaused={true}
          pendingCount={42}
          onPause={vi.fn()}
          onResume={handleResume}
          onClear={vi.fn()}
          autoScroll={true}
          onToggleAutoScroll={vi.fn()}
          onJumpToLatest={vi.fn()}
          showJumpButton={false}
        />
      );
      const resumeBtn = screen.getByRole("button", { name: /resume/i });
      expect(screen.getByText("+42")).toBeInTheDocument();
      fireEvent.click(resumeBtn);
      expect(handleResume).toHaveBeenCalledTimes(1);
    });

    it("triggers Clear View handler", () => {
      const handleClear = vi.fn();
      render(
        <StreamToolbar
          isPaused={false}
          pendingCount={0}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClear={handleClear}
          autoScroll={true}
          onToggleAutoScroll={vi.fn()}
          onJumpToLatest={vi.fn()}
          showJumpButton={false}
        />
      );
      const clearBtn = screen.getByRole("button", { name: /clear view/i });
      fireEvent.click(clearBtn);
      expect(handleClear).toHaveBeenCalledTimes(1);
    });

    it("renders Jump to Latest button when scrolled up", () => {
      const handleJump = vi.fn();
      render(
        <StreamToolbar
          isPaused={false}
          pendingCount={0}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onClear={vi.fn()}
          autoScroll={false}
          onToggleAutoScroll={vi.fn()}
          onJumpToLatest={handleJump}
          showJumpButton={true}
        />
      );
      const jumpBtn = screen.getByRole("button", { name: /jump to latest/i });
      fireEvent.click(jumpBtn);
      expect(handleJump).toHaveBeenCalledTimes(1);
    });
  });

  describe("StreamFilterBar", () => {
    it("renders severity toggle buttons and triggers onFilterChange", () => {
      const handleFilterChange = vi.fn();
      render(
        <StreamFilterBar
          filters={{ severities: ["ERROR"], service: "", search: "" }}
          onFilterChange={handleFilterChange}
          matchCount={10}
          totalCount={50}
        />
      );

      const errorBadge = screen.getByRole("button", { name: /error/i });
      expect(errorBadge).toBeInTheDocument();

      // Click to toggle CRITICAL
      const critBadge = screen.getByRole("button", { name: /critical/i });
      fireEvent.click(critBadge);
      expect(handleFilterChange).toHaveBeenCalledWith({
        severities: ["ERROR", "CRITICAL"],
      });
    });

    it("handles text search input and debounce/change", () => {
      const handleFilterChange = vi.fn();
      render(
        <StreamFilterBar
          filters={{ severities: [], service: "", search: "" }}
          onFilterChange={handleFilterChange}
          matchCount={5}
          totalCount={20}
        />
      );

      const input = screen.getByPlaceholderText(/filter live logs/i);
      fireEvent.change(input, { target: { value: "database" } });
      expect(handleFilterChange).toHaveBeenCalledWith({ search: "database" });
    });
  });

  describe("LiveLogTable", () => {
    const mockLogs = [
      {
        id: "log-1",
        timestamp: "2026-11-25T00:00:00.123Z",
        severity: "ERROR",
        service_name: "auth-service",
        message: "Failed to connect to redis cache",
        environment: "production",
        host: "auth-pod-1",
        trace_id: "trace-abc-123",
        span_id: "span-def-456",
        drain_template: "Failed to connect to <*>",
        sensitive_redacted: true,
      },
      {
        id: "log-2",
        timestamp: "2026-11-25T00:00:01.456Z",
        severity: "INFO",
        service_name: "api-gateway",
        message: "HTTP 200 GET /health",
      },
    ];

    it("renders log entries in monospace table format", () => {
      render(
        <LiveLogTable
          logs={mockLogs}
          onClear={vi.fn()}
          filterActive={false}
          totalCount={2}
        />
      );

      expect(screen.getByText("auth-service")).toBeInTheDocument();
      expect(screen.getByText("Failed to connect to redis cache")).toBeInTheDocument();
      expect(screen.getByText("api-gateway")).toBeInTheDocument();
      expect(screen.getByText("HTTP 200 GET /health")).toBeInTheDocument();
    });

    it("expands log detail drawer on click displaying metadata and trace actions", () => {
      render(
        <LiveLogTable
          logs={mockLogs}
          onClear={vi.fn()}
          filterActive={false}
          totalCount={2}
        />
      );

      // Click first row to expand
      const row = screen.getByText("Failed to connect to redis cache").closest("tr");
      fireEvent.click(row);

      // Verify expanded detail attributes
      expect(screen.getByText("Record Detail & Contextual Metadata")).toBeInTheDocument();
      expect(screen.getByText("Copy Trace ID")).toBeInTheDocument();
      expect(screen.getByText("Sanitized Log Payload:")).toBeInTheDocument();
    });

    it("renders empty state when logs list is empty", () => {
      render(
        <LiveLogTable
          logs={[]}
          onClear={vi.fn()}
          filterActive={false}
          totalCount={0}
        />
      );

      expect(screen.getByText("No live log records in current view")).toBeInTheDocument();
    });
  });
});
