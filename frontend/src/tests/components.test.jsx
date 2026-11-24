import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import SeverityBadge from "../components/common/SeverityBadge";
import ConnectionStatusIndicator from "../components/common/ConnectionStatusIndicator";
import EmptyState from "../components/common/EmptyState";
import ErrorMessage from "../components/common/ErrorMessage";
import ErrorBoundary from "../components/common/ErrorBoundary";

describe("Common UI Components", () => {
  it("renders SeverityBadge with correct colors and labels", () => {
    const { rerender } = render(<SeverityBadge severity="DEBUG" />);
    expect(screen.getByText("DEBUG")).toHaveClass("severity-debug");

    rerender(<SeverityBadge severity="INFO" />);
    expect(screen.getByText("INFO")).toHaveClass("severity-info");

    rerender(<SeverityBadge severity="WARNING" />);
    expect(screen.getByText("WARNING")).toHaveClass("severity-warning");

    rerender(<SeverityBadge severity="ERROR" />);
    expect(screen.getByText("ERROR")).toHaveClass("severity-error");

    rerender(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toHaveClass("severity-critical");
  });

  it("renders Button and triggers click event", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const button = screen.getByRole("button", { name: "Click Me" });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables Button when loading", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders Card with title, body, and footer", () => {
    render(
      <Card title="Card Title" footer={<span>Footer Content</span>}>
        <p>Body Content</p>
      </Card>
    );
    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Body Content")).toBeInTheDocument();
    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });

  it("renders ConnectionStatusIndicator states", () => {
    const { rerender } = render(<ConnectionStatusIndicator status="online" />);
    expect(screen.getByText("Backend Online")).toBeInTheDocument();

    rerender(<ConnectionStatusIndicator status="offline" />);
    expect(screen.getByText("Backend Offline")).toBeInTheDocument();

    rerender(<ConnectionStatusIndicator status="connecting" />);
    expect(screen.getByText("Checking Connection...")).toBeInTheDocument();
  });

  it("renders EmptyState and ErrorMessage with retry handler", () => {
    render(<EmptyState title="No Records" description="Try again later" />);
    expect(screen.getByText("No Records")).toBeInTheDocument();
    expect(screen.getByText("Try again later")).toBeInTheDocument();

    const handleRetry = vi.fn();
    render(
      <ErrorMessage
        title="Failed Request"
        message="500 Server Error"
        onRetry={handleRetry}
      />
    );
    expect(screen.getByText("Failed Request")).toBeInTheDocument();
    expect(screen.getByText("500 Server Error")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("catches render errors in ErrorBoundary", () => {
    const ProblemChild = () => {
      throw new Error("Test explosion");
    };

    // Suppress console.error in test output for intentional throw
    const originalConsoleError = console.error;
    console.error = vi.fn();

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Application Render Error")).toBeInTheDocument();
    expect(screen.getByText(/Test explosion/)).toBeInTheDocument();

    console.error = originalConsoleError;
  });
});
