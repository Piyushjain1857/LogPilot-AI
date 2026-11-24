import React from "react";
import { Menu, BookOpen, ExternalLink } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import ConnectionStatusIndicator from "../common/ConnectionStatusIndicator";

export default function Navbar({ onToggleSidebar, backendStatus = "online" }) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
        >
          <Menu size={18} />
        </button>
        <Breadcrumbs />
      </div>
      <div className="navbar-right">
        <ConnectionStatusIndicator status={backendStatus} />
        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
          style={{ gap: 6 }}
        >
          <BookOpen size={14} />
          <span>API Docs</span>
          <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
        </a>
      </div>
    </header>
  );
}
