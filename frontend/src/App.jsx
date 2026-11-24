import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ErrorBoundary from "./components/common/ErrorBoundary";
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
import { getHealthStatus } from "./services/api";

export default function App() {
  const [backendStatus, setBackendStatus] = useState("connecting");

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const res = await getHealthStatus();
        if (isMounted) {
          setBackendStatus(res.status === "healthy" ? "online" : "offline");
        }
      } catch {
        if (isMounted) {
          setBackendStatus("offline");
        }
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Console Application Shell */}
        <Route path="/app" element={<AppShell backendStatus={backendStatus} />}>
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
    </ErrorBoundary>
  );
}
