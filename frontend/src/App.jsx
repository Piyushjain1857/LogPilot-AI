import React, { Suspense, lazy } from "react";
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
import NotFoundPage from "./pages/NotFoundPage";

// Lazy-loaded secondary routes: Prevents dev server socket congestion (net::ERR_INSUFFICIENT_RESOURCES)
const WebsitesPage = lazy(() => import("./pages/WebsitesPage"));
const LiveLogsPage = lazy(() => import("./pages/placeholders/LiveLogsPage"));
const LogSourcesPage = lazy(() => import("./pages/placeholders/LogSourcesPage"));
const LogExplorerPage = lazy(() => import("./pages/placeholders/LogExplorerPage"));
const TraceExplorerPage = lazy(() => import("./pages/placeholders/TraceExplorerPage"));
const AnomaliesPage = lazy(() => import("./pages/placeholders/AnomaliesPage"));
const ClusterExplorerPage = lazy(() => import("./pages/placeholders/ClusterExplorerPage"));
const IncidentsPage = lazy(() => import("./pages/placeholders/IncidentsPage"));
const RootCausePage = lazy(() => import("./pages/placeholders/RootCausePage"));
const TroubleshooterPage = lazy(() => import("./pages/placeholders/TroubleshooterPage"));
const AIAssistantPage = lazy(() => import("./pages/placeholders/AIAssistantPage"));
const RemediationPage = lazy(() => import("./pages/placeholders/RemediationPage"));
const ReportsPage = lazy(() => import("./pages/placeholders/ReportsPage"));
const DemoPage = lazy(() => import("./pages/placeholders/DemoPage"));
const SettingsPage = lazy(() => import("./pages/placeholders/SettingsPage"));

function PageLoadingFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", width: "100%" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border-subtle)", borderTopColor: "var(--accent-primary)", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

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
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* Login Page */}
                <Route path="/login" element={<LoginPage />} />

                {/* Console Application Shell */}
                <Route path="/app" element={<ProtectedAppShell />}>
                  <Route index element={<OverviewPage />} />
                  <Route path="websites" element={<WebsitesPage />} />
                  <Route path="websites/:websiteId" element={<WebsitesPage />} />
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
            </Suspense>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
