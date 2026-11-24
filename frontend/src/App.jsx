import React from "react";
import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { StreamingProvider } from "./context/StreamingContext";
import LandingPage from "./pages/LandingPage";
import OverviewPage from "./pages/OverviewPage";
import LiveLogsPage from "./pages/placeholders/LiveLogsPage";
import LogSourcesPage from "./pages/placeholders/LogSourcesPage";
import LogExplorerPage from "./pages/placeholders/LogExplorerPage";
import AnomaliesPage from "./pages/placeholders/AnomaliesPage";
import IncidentsPage from "./pages/placeholders/IncidentsPage";
import RootCausePage from "./pages/placeholders/RootCausePage";
import TroubleshooterPage from "./pages/placeholders/TroubleshooterPage";
import RemediationPage from "./pages/placeholders/RemediationPage";
import ReportsPage from "./pages/placeholders/ReportsPage";
import SettingsPage from "./pages/placeholders/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WorkspaceProvider>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Console Application Shell */}
            <Route
              path="/app"
              element={
                <StreamingProvider>
                  <AppShell />
                </StreamingProvider>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="live-logs" element={<LiveLogsPage />} />
              <Route path="log-sources" element={<LogSourcesPage />} />
              <Route path="log-explorer" element={<LogExplorerPage />} />
              <Route path="anomalies" element={<AnomaliesPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="root-cause" element={<RootCausePage />} />
              <Route path="troubleshooter" element={<TroubleshooterPage />} />
              <Route path="remediation" element={<RemediationPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
