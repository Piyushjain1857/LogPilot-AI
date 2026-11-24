import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/common/ThemeToggle";
import StatusBadge from "../components/common/StatusBadge";
import ConnectionIndicator from "../components/common/ConnectionIndicator";
import CommandPalette from "../components/common/CommandPalette";
import LogTable from "../components/logs/LogTable";
import { MemoryRouter } from "react-router-dom";

function ThemeConsumerTest() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <ThemeToggle />
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
    </div>
  );
}

describe("Phase 2 UI and Interaction Components", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("handles theme switching and updates document data-theme attribute", () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTest />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    const setLightBtn = screen.getByText("Set Light");
    fireEvent.click(setLightBtn);

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("logpilot_theme")).toBe("light");
  });

  it("renders StatusBadge with correct variant classes and indicators", () => {
    const { rerender } = render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE").previousSibling).toHaveClass("status-badge-dot-active");

    rerender(<StatusBadge status="RESOLVED" />);
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("RESOLVED").previousSibling).toHaveClass("status-badge-dot-resolved");

    rerender(<StatusBadge status="INVESTIGATING" />);
    expect(screen.getByText("INVESTIGATING")).toBeInTheDocument();
    expect(screen.getByText("INVESTIGATING").previousSibling).toHaveClass("status-badge-dot-investigating");
  });

  it("renders ConnectionIndicator states with tooltip and latency", () => {
    const { rerender } = render(<ConnectionIndicator status="connected" latencyMs={45} />);
    expect(screen.getByText("Connected (45ms)")).toBeInTheDocument();

    rerender(<ConnectionIndicator status="reconnecting" />);
    expect(screen.getByText("Reconnecting...")).toBeInTheDocument();

    rerender(<ConnectionIndicator status="disconnected" />);
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("opens CommandPalette and filters navigation commands", () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/Search pages, navigation routes/i)).toBeInTheDocument();
    expect(screen.getByText("Overview Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Live Logs Stream")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Search pages, navigation routes/i);
    fireEvent.change(input, { target: { value: "remediation" } });

    expect(screen.getByText("Remediation Playbooks")).toBeInTheDocument();
    expect(screen.queryByText("Live Logs Stream")).not.toBeInTheDocument();
  });

  it("renders LogTable with expandable detail rows and structured metadata", async () => {
    const sampleLogs = [
      {
        id: "log-1",
        timestamp: "2026-11-24T22:00:00Z",
        severity: "ERROR",
        service_name: "auth-service",
        message: "JWT signature validation failed for user token",
        trace_id: "trace-abc-12345",
        span_id: "span-456",
        source_id: "source-pod-1",
        template_id: "E-1002",
      },
    ];

    render(<LogTable logs={sampleLogs} onSelect={() => {}} />);

    expect(screen.getByText("JWT signature validation failed for user token")).toBeInTheDocument();
    expect(screen.getByText("auth-service")).toBeInTheDocument();
    expect(screen.getByText("ERROR")).toBeInTheDocument();

    // Click to expand row
    const row = screen.getByText("JWT signature validation failed for user token");
    fireEvent.click(row);

    // Context details revealed
    await waitFor(() => {
      expect(screen.getByText("span-456")).toBeInTheDocument();
      expect(screen.getByText("source-pod-1")).toBeInTheDocument();
      expect(screen.getByText("E-1002")).toBeInTheDocument();
    });
  });
});
