import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== undefined && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "450px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-6)",
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              padding: "var(--space-8)",
              maxWidth: 520,
              backgroundColor: "var(--bg-card)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--status-error)",
                marginBottom: "var(--space-4)",
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: "var(--space-2)" }}>
              Application Render Error
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: "var(--space-6)" }}>
              LogPilot AI encountered an unexpected rendering exception. You can refresh the view to recover.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: "var(--bg-primary)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                  color: "var(--status-error)",
                  marginBottom: "var(--space-6)",
                  textAlign: "left",
                  overflowX: "auto",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="btn btn-primary btn-md"
              style={{ width: "100%" }}
            >
              <RefreshCw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
