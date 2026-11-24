import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import CommandPalette from "../common/CommandPalette";
import Drawer from "../common/Drawer";
import ErrorBoundary from "../common/ErrorBoundary";
import { useBackendConnection } from "../../hooks/useBackendConnection";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function AppShell() {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useWorkspace();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Hook managing real-time connectivity lifecycle
  const { status, latencyMs } = useBackendConnection();

  const handleToggleSidebar = () => {
    // If mobile, toggle drawer
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="app-container">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        connectionStatus={status}
      />

      {/* Mobile Drawer Sidebar */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        width="260px"
      >
        <Sidebar
          collapsed={false}
          onNavigate={() => setMobileDrawerOpen(false)}
          connectionStatus={status}
        />
      </Drawer>

      <div className="main-content">
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          connectionStatus={status}
          latencyMs={latencyMs}
        />

        <main className="content-body">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Cmd+K Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpen={() => setCommandPaletteOpen(true)}
      />
    </div>
  );
}
