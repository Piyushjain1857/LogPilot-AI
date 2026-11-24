import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Terminal,
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import ThemeToggle from "../components/common/ThemeToggle";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const destination = location.state?.from?.pathname || "/app";

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, destination, navigate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.details || err?.message || "Invalid credentials. Please verify your username and password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoUsername, demoPassword) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setError(null);
    setSubmitting(true);
    try {
      await login(demoUsername, demoPassword);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.details || err?.message || "Quick demo authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Top Bar with Brand & Theme Toggle */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "var(--space-4) var(--space-8)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            textDecoration: "none",
            color: "var(--text-primary)",
          }}
        >
          <div className="sidebar-logo-icon">
            <Terminal size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>LogPilot AI</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Login Card */}
      <div className="login-card">
        <div className="login-header-branding">
          <div className="login-logo-badge">
            <Shield size={24} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Sign in to LogPilot AI
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            Autonomous Observability & Incident Remediation Console
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "var(--accent-primary)",
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            <Sparkles size={11} />
            <span>JWT & Two-Tier RBAC Protected (Admin / Normal)</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--status-critical)",
              fontSize: 12,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Manual Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="login-form-group">
            <label htmlFor="login-username">Username or Email</label>
            <div className="login-input-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                placeholder="admin or operator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="login-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="login-password">Password</label>
            </div>
            <div className="login-input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="toggle-pw-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            icon={ArrowRight}
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          >
            {submitting ? "Authenticating..." : "Sign In with Credentials"}
          </Button>
        </form>

        <div className="login-divider">or 1-click demo role</div>

        {/* 1-Click Fast Demo Login Roles */}
        <div className="demo-roles-panel">
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Instant Evaluation Demo Accounts:
          </div>

          {/* Admin Role Card */}
          <button
            type="button"
            className="demo-role-item admin-role"
            onClick={() => handleQuickDemoLogin("admin", "Admin@LogPilot2026!")}
            disabled={submitting}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>Admin User</span>
                <span className="role-tag-admin">ADMIN ROLE</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Full privileges: maintenance, telemetry purge, playbooks & settings
              </span>
            </div>
            <div style={{ color: "#a78bfa", display: "flex", alignItems: "center" }}>
              <Zap size={16} />
            </div>
          </button>

          {/* Normal User Role Card */}
          <button
            type="button"
            className="demo-role-item normal-role"
            onClick={() => handleQuickDemoLogin("operator", "Operator@LogPilot2026!")}
            disabled={submitting}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>Normal User</span>
                <span className="role-tag-normal">NORMAL ROLE</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Observability view: live streaming, logs, traces, RCA investigation
              </span>
            </div>
            <div style={{ color: "#22d3ee", display: "flex", alignItems: "center" }}>
              <Zap size={16} />
            </div>
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
          <Link to="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            ← Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
