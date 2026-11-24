import React from "react";
import { Link } from "react-router-dom";
import {
  Terminal,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Layers,
  Search,
  Clock,
  Radio,
  Server,
  Database,
  Cloud,
  FileCode,
} from "lucide-react";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";

export default function LandingPage() {
  const capabilities = [
    {
      title: "Real-Time Log Monitoring",
      description: "Low-latency streaming ingestion and WebSocket broadcasting across distributed nodes.",
      icon: Radio,
      status: "Planned (Phase 2)",
    },
    {
      title: "Intelligent Anomaly Detection",
      description: "Statistical burst detection, moving-window z-score analysis, and log frequency shifts.",
      icon: Layers,
      status: "Planned (Phase 2)",
    },
    {
      title: "Automated Error Clustering",
      description: "Drain3 online template extraction grouping millions of variable error lines into semantic clusters.",
      icon: Search,
      status: "Planned (Phase 3)",
    },
    {
      title: "Root Cause Correlation",
      description: "Distributed trace ID correlation and dependency graph analysis pinpointing originating failure nodes.",
      icon: Cpu,
      status: "Planned (Phase 3)",
    },
    {
      title: "AI Autonomous Troubleshooting",
      description: "Gemini AI multimodal agent synthesizing stack traces, commit logs, and environmental changes.",
      icon: ShieldAlert,
      status: "Planned (Phase 4)",
    },
    {
      title: "Remediation Playbooks",
      description: "Automated runbook synthesis with human-in-the-loop approvals and safe execution guards.",
      icon: FileCode,
      status: "Planned (Phase 4)",
    },
  ];

  const sourceCategories = [
    { name: "Application Logs", icon: FileCode },
    { name: "Server Logs", icon: Server },
    { name: "API Gateways", icon: Radio },
    { name: "Database Logs", icon: Database },
    { name: "Microservice Logs", icon: Cloud },
    { name: "Deployment Events", icon: Layers },
  ];

  return (
    <div style={{ backgroundColor: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Top Bar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "var(--space-4) var(--space-8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(17, 24, 39, 0.8)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div className="sidebar-logo-icon">
            <Terminal size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
            LogPilot AI
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>|</span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Detect. Diagnose. Resolve.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <Badge variant="primary">Tech Fusion 4.0 — PS-01A</Badge>
          <Link to="/app">
            <Button variant="primary" size="sm" icon={ArrowRight}>
              Open Console
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-badge">
          <Terminal size={14} />
          <span>Autonomous AIOps & Debugging Platform</span>
        </div>
        <h1 className="landing-title">
          Intelligent Log Analytics & <br />
          <span className="landing-title-accent">Autonomous Troubleshooter Agent</span>
        </h1>
        <p className="landing-tagline">
          Ingest high-velocity system telemetry, filter noise with online template clustering,
          correlate cross-service root causes, and generate verifiable remediation playbooks.
        </p>
        <div className="landing-actions">
          <Link to="/app">
            <Button variant="primary" size="lg" icon={ArrowRight}>
              Get Started
            </Button>
          </Link>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" size="lg">
              Explore API Specs
            </Button>
          </a>
        </div>
      </section>

      {/* Hackathon Problem Statement Overview */}
      <section className="landing-section" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="landing-section-header">
          <h2 className="landing-section-title">Problem Statement: PS-01A</h2>
          <p className="landing-section-subtitle">
            Tech Fusion 4.0 Codestorm — Enterprise & Industry Track
          </p>
        </div>
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, marginBottom: "var(--space-4)" }}>
            Modern distributed architectures emit hundreds of gigabytes of unstructured logs per day.
            During production outages, on-call engineers face severe alert fatigue and fragmented context.
            <strong> LogPilot AI</strong> addresses this challenge through a hybrid pipeline combining deterministic
            pattern clustering (Drain3), statistical anomaly bounds, and non-deterministic LLM reasoning
            via the Google Gen AI SDK (Gemini).
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Badge variant="success">Phase 1 Foundation Live</Badge>
            <Badge variant="default">SQLite MVP Storage</Badge>
            <Badge variant="default">Zero Frontend Secret Exposure</Badge>
            <Badge variant="default">Human-in-the-Loop Safeguards</Badge>
          </div>
        </div>
      </section>

      {/* Planned Capabilities */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Platform Capabilities Roadmap</h2>
          <p className="landing-section-subtitle">
            Clear separation between active Phase 1 foundation and planned capabilities
          </p>
        </div>
        <div className="feature-grid">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="feature-card">
                <div className="feature-icon-wrapper">
                  <Icon size={20} />
                </div>
                <div className="feature-title">
                  <span>{cap.title}</span>
                  <Badge variant="default" icon={Clock}>
                    {cap.status}
                  </Badge>
                </div>
                <p className="feature-desc">{cap.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Supported Log Source Categories */}
      <section className="landing-section" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="landing-section-header">
          <h2 className="landing-section-title">Supported Log Sources</h2>
          <p className="landing-section-subtitle">
            Universal ingestion across the full modern cloud infrastructure stack
          </p>
        </div>
        <div className="category-tags">
          {sourceCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.name} className="category-tag">
                <Icon size={14} style={{ color: "var(--accent-primary)" }} />
                <span>{cat.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>LogPilot AI — Detect. Diagnose. Resolve.</div>
        <div style={{ marginTop: 4 }}>
          Tech Fusion 4.0 — Codestorm | Enterprise & Industry (PS-01A) | Phase 1 Full-Stack Project Foundation
        </div>
      </footer>
    </div>
  );
}
