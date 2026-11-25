import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AIAssistantPage from "../pages/placeholders/AIAssistantPage";
import SettingsPage from "../pages/placeholders/SettingsPage";
import { aiService } from "../services/aiService";
import { websiteService, listWebsites } from "../services/websiteService";
import { incidentService } from "../services/incidentService";
import { ThemeProvider } from "../context/ThemeContext";
import { WorkspaceProvider } from "../context/WorkspaceContext";
import { AuthProvider } from "../context/AuthContext";

vi.mock("../services/aiService", () => ({
  aiService: {
    getAIConfig: vi.fn(),
    updateAIConfig: vi.fn(),
    testConnection: vi.fn(),
    analyzeIncident: vi.fn(),
    chatCopilot: vi.fn(),
    getHistory: vi.fn(),
  },
}));

vi.mock("../services/websiteService", () => ({
  listWebsites: vi.fn(),
  getWebsite: vi.fn(),
  createWebsite: vi.fn(),
  pauseWebsite: vi.fn(),
  resumeWebsite: vi.fn(),
  checkWebsiteNow: vi.fn(),
  deleteWebsite: vi.fn(),
  diagnoseWebsiteAI: vi.fn(),
  getGitHubCodePatch: vi.fn(),
  websiteService: {
    listWebsites: vi.fn(),
    getWebsites: vi.fn(),
  },
}));

vi.mock("../services/incidentService", () => ({
  incidentService: {
    listIncidents: vi.fn(),
  },
}));

describe("AI Engine & Copilot Frontend Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWebsites.mockResolvedValue([
      { id: "site-1", name: "Production Gateway", url: "https://api.example.com" },
    ]);
    aiService.getAIConfig.mockResolvedValue({
      gemini_model: "gemini-2.5-flash",
      ai_enabled: true,
      ai_auto_analysis: true,
      confidence_threshold: 0.8,
      api_key_configured: true,
      api_key_masked: "AIzaSyB************************",
      gemini_status: "CONNECTED",
      total_analyses: 24,
      total_tokens: 38400,
      daily_requests: 12,
    });

    aiService.testConnection.mockResolvedValue({
      connected: true,
      latency_ms: 42,
      model: "gemini-2.5-flash",
      message: "Google Gemini 2.5 Flash connection verified.",
    });

    aiService.chatCopilot.mockResolvedValue({
      reply: "Database connection pool exhaustion detected in auth-service.",
      confidence: 0.94,
      evidence_citations: [
        {
          evidence_id: "EV-001",
          source: "postgresql_logs",
          description: "HikariPool-1 - Connection is not available, request timed out after 30000ms.",
          timestamp: "2026-11-25T10:00:00Z",
          sample_data: "max_connections=100 reached",
        },
      ],
      code_snippets: [
        {
          file_path: "src/config/database.js",
          language: "javascript",
          original_code: "poolSize: 10",
          proposed_code: "poolSize: 50, connectionTimeoutMillis: 5000",
          unified_diff: "@@ -10,1 +10,2 @@\n- poolSize: 10\n+ poolSize: 50\n+ connectionTimeoutMillis: 5000",
          description: "Increase Hikari connection pool size to handle peak concurrency.",
          is_safe: true,
        },
      ],
      suggested_actions: ["Scale PostgreSQL Pool", "Restart Auth Pods"],
      follow_up_prompts: ["How do I verify connection pool health?", "What caused the connection leak?"],
      conversation_id: "conv-test-123",
    });

    incidentService.listIncidents.mockResolvedValue({
      incidents: [
        { id: "INC-101", title: "DB Pool Exhaustion", severity: "CRITICAL" },
        { id: "INC-102", title: "Payment Service Latency Spike", severity: "WARNING" },
      ],
    });
  });

  it("renders AI Copilot page with canonical preset questions and target context selectors", async () => {
    render(
      <MemoryRouter>
        <AIAssistantPage />
      </MemoryRouter>
    );

    expect(screen.getByText("AI SRE Assistant & NLQ Translator")).toBeInTheDocument();
    expect(screen.getByText("Target Website:")).toBeInTheDocument();
    expect(screen.getByText("Incident:")).toBeInTheDocument();

    // Check canonical preset buttons
    expect(screen.getByText("Why is my website down?")).toBeInTheDocument();
    expect(screen.getByText("Why is my API returning HTTP 500?")).toBeInTheDocument();
    expect(screen.getByText("What caused this database failure?")).toBeInTheDocument();
  });

  it("submits user message and renders grounded reply with evidence citations and code snippets", async () => {
    render(
      <MemoryRouter>
        <AIAssistantPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask SRE Assistant or describe/i);
    fireEvent.change(input, { target: { value: "Why is my website down?" } });
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(aiService.chatCopilot).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Why is my website down?",
        })
      );
    });

    // Check rendered grounded response
    await waitFor(() => {
      expect(screen.getByText(/Database connection pool exhaustion detected/i)).toBeInTheDocument();
      expect(screen.getByText(/94% Confidence · Grounded/i)).toBeInTheDocument();
      expect(screen.getByText(/\[EV-001\]/i)).toBeInTheDocument();
      expect(screen.getByText(/src\/config\/database\.js/i)).toBeInTheDocument();
      expect(screen.getByText("Copy Code")).toBeInTheDocument();
    });
  });

  it("renders AI reasoning settings tab with model selection and connection probe", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <ThemeProvider>
              <SettingsPage />
            </ThemeProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Switch to AI Reasoning tab
    const aiTabBtn = screen.getByRole("tab", { name: /AI Reasoning/i });
    fireEvent.click(aiTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Active Google Gemini Model Tier/i)).toBeInTheDocument();
      expect(screen.getByText(/Gemini 2.5 Flash \(Fast Triage\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Gemini 2.5 Pro \(Deep Causal\)/i)).toBeInTheDocument();
    });

    // Test connectivity button
    const testBtn = screen.getByRole("button", { name: /Test AI Connectivity/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(aiService.testConnection).toHaveBeenCalled();
      expect(screen.getByText(/AI Engine operational · Round-trip latency: 42ms/i)).toBeInTheDocument();
    });
  });
});
