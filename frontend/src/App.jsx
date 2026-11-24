import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { StreamingProvider } from "./context/StreamingContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OverviewPage from "./pages/OverviewPage";
import LiveLogsPage from "./pages/placeholders/LiveLogsPage";
import LogSourcesPage from "./pages/placeholders/LogSourcesPage";
import LogExplorerPage from "./pages/placeholders/LogExplorerPage";
import TraceExplorerPage from "./pages/placeholders/TraceExplorerPage";
import AnomaliesPage from "./pages/placeholders/AnomaliesPage";
import ClusterExplorerPage from "./pages/placeholders/ClusterExplorerPage";
import IncidentsPage from "./pages/placeholders/IncidentsPage";
import RootCausePage from "./pages/placeholders/RootCausePage";
import TroubleshooterPage from "./pages/placeholders/TroubleshooterPage";
import AIAssistantPage from "./pages/placeholders/AIAssistantPage";
import RemediationPage from "./pages/placeholders/RemediationPage";
import ReportsPage from "./pages/placeholders/ReportsPage";
import DemoPage from "./pages/placeholders/DemoPage";
import SettingsPage from "./pages/placeholders/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

function ProtectedAppShell() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-base)" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--border-subtle)", borderTopColor: "var(--accent-primary)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <StreamingProvider>
      <AppShell />
    </StreamingProvider>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Login Page */}
              <Route path="/login" element={<LoginPage />} />

              {/* Console Application Shell */}
              <Route path="/app" element={<ProtectedAppShell />}>
                <Route index element={<OverviewPage />} />
                <Route path="live-logs" element={<LiveLogsPage />} />
                <Route path="log-sources" element={<LogSourcesPage />} />
                <Route path="log-explorer" element={<LogExplorerPage />} />
                <Route path="traces" element={<TraceExplorerPage />} />
                <Route path="traces/:traceId" element={<TraceExplorerPage />} />
                <Route path="anomalies" element={<AnomaliesPage />} />
                <Route path="clusters" element={<ClusterExplorerPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="root-cause" element={<RootCausePage />} />
                <Route path="troubleshooter" element={<TroubleshooterPage />} />
                <Route path="assistant" element={<AIAssistantPage />} />
                <Route path="remediation" element={<RemediationPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="demo" element={<DemoPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
