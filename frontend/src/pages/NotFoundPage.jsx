import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import Button from "../components/common/Button";

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          padding: "var(--space-8)",
          maxWidth: 480,
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
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--status-warning)",
            marginBottom: "var(--space-4)",
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: "var(--space-2)" }}>
          404 — Page Not Found
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 14,
            marginBottom: "var(--space-6)",
            lineHeight: 1.5,
          }}
        >
          The requested route does not exist in the LogPilot AI navigation registry.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)" }}>
          <Link to="/">
            <Button variant="secondary" icon={Home}>
              Landing Page
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="primary" icon={ArrowLeft}>
              Console Overview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
