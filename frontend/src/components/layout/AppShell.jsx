import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppShell({ backendStatus = "online" }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} />
      <div className="main-content">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          backendStatus={backendStatus}
        />
        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
