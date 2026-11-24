import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Terminal,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  Layers,
  GitBranch,
  Bot,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import ThemeToggle from "../components/common/ThemeToggle";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"

  // Sign in fields
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign up fields
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState("normal"); // "normal" | "admin"
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const destination = location.state?.from?.pathname || "/app";

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, destination, navigate]);

  // Compute password strength for Sign Up
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: "" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: "Weak", class: "active-weak" };
    if (score <= 2) return { level: 2, label: "Medium", class: "active-medium" };
    return { level: 3, label: "Strong", class: "active-strong" };
  };

  const strength = getPasswordStrength(signUpPassword);

  const handleSignInSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!signInUsername.trim() || !signInPassword) {
      setError("Please enter both username and password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(signInUsername.trim(), signInPassword);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.details || err?.message || "Invalid credentials. Please verify your username and password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!signUpUsername.trim() || !signUpEmail.trim() || !signUpPassword) {
      setError("Please fill in username, email, and password.");
      return;
    }

    if (signUpPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await register({
        username: signUpUsername.trim(),
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
        full_name: signUpFullName.trim() || undefined,
        role: signUpRole,
      });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.details || err?.message || "Registration failed. Please check inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoUsername, demoPassword) => {
    setSignInUsername(demoUsername);
    setSignInPassword(demoPassword);
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
      {/* Top Bar with Brand & Navigation */}
      <div className="login-topbar">
        <Link to="/" className="login-topbar-brand">
          <div className="sidebar-logo-icon">
            <Terminal size={16} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>LogPilot AI</span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>/</span>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>Authentication Console</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Split Layout */}
      <div className="login-split-layout">
        {/* Left: Showcase & Telemetry Panel */}
        <div className="login-showcase-panel">
          <div>
            <div className="showcase-badge-pill">
              <span className="pulse-dot-green" />
              <span>Real-Time Telemetry Fabric (18,450 logs/sec · &lt;4ms)</span>
            </div>

            <h2 className="showcase-headline">
              From High-Volume Telemetry to Autonomous Root Cause Resolution.
            </h2>

            <p className="showcase-description">
              LogPilot AI ingests streaming microservice logs, redacts sensitive credentials in-flight, isolates anomaly frequency bursts with z-scores, and diagnoses root causes with verified citations.
            </p>

            {/* In-Flight Preview Snippet */}
            <div className="showcase-preview-card">
              <div className="showcase-terminal-bar">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Activity size={12} style={{ color: "var(--accent-primary)" }} />
                  <span>telemetry-stream // order-service</span>
                </span>
                <span style={{ color: "var(--status-critical)", fontWeight: 700, fontSize: 11 }}>
                  BURST ANOMALY z = +4.82σ
                </span>
              </div>
              <div className="showcase-terminal-code">
                <div>
                  <span style={{ color: "var(--text-muted)" }}>2026-11-25T04:12:00Z</span>{" "}
                  <span style={{ color: "var(--status-critical)", fontWeight: 700 }}>[CRITICAL]</span>{" "}
                  <span style={{ color: "var(--accent-primary)" }}>[order-service]</span>{" "}
                  DatabaseConnectionError: pool exhausted (max=100) uri=postgresql://postgres:
                  <span className="highlight-redact">[REDACTED_PASSWORD]</span>@db-primary:5432
                </div>
              </div>
            </div>

            {/* Topological Causal Flow Diagram */}
            <div className="showcase-causal-diagram">
              <div className="causal-node-pill">
                <Layers size={13} style={{ color: "var(--accent-primary)" }} />
                <span>api-gateway:80</span>
              </div>
              <div className="causal-arrow-step">
                <span>504 Timeout</span>
                <span>➔</span>
              </div>
              <div className="causal-node-pill" style={{ borderColor: "rgba(239, 68, 68, 0.4)", backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <GitBranch size={13} style={{ color: "var(--status-critical)" }} />
                <span style={{ color: "#fca5a5" }}>order-service:8080</span>
              </div>
              <div className="causal-arrow-step">
                <span>Pool Lock</span>
                <span>➔</span>
              </div>
              <div className="causal-node-pill">
                <Lock size={13} style={{ color: "var(--accent-secondary)" }} />
                <span>postgres:5432</span>
              </div>
            </div>

            {/* Zero-Hallucination Evidence Citation */}
            <div className="showcase-evidence-badge">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={13} style={{ color: "var(--status-success)" }} />
                <span>Zero-Hallucination Evidence Citation</span>
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                sha256:d8a2...3f1c
              </span>
            </div>

            {/* 3-Column Telemetry Metrics Row */}
            <div className="showcase-stats-row">
              <div className="showcase-stat-box">
                <div className="showcase-stat-value" style={{ color: "#38bdf8" }}>18,000+</div>
                <div className="showcase-stat-label">Logs / Sec</div>
              </div>
              <div className="showcase-stat-box">
                <div className="showcase-stat-value" style={{ color: "#f43f5e" }}>+4.82σ</div>
                <div className="showcase-stat-label">Z-Score Spike</div>
              </div>
              <div className="showcase-stat-box">
                <div className="showcase-stat-value" style={{ color: "#10b981" }}>&lt;250ms</div>
                <div className="showcase-stat-label">RCA Resolution</div>
              </div>
            </div>

            {/* Architecture Highlights Grid */}
            <div className="showcase-specs-grid">
              <div className="showcase-spec-item">
                <Zap size={14} style={{ color: "#38bdf8" }} />
                <span>Streaming Ingestion & Masking</span>
              </div>
              <div className="showcase-spec-item">
                <Bot size={14} style={{ color: "#a855f7" }} />
                <span>Zero-Hallucination RCA</span>
              </div>
              <div className="showcase-spec-item">
                <GitBranch size={14} style={{ color: "#06b6d4" }} />
                <span>Distributed Trace Graph</span>
              </div>
              <div className="showcase-spec-item">
                <Shield size={14} style={{ color: "#10b981" }} />
                <span>Dual-Tier RBAC Architecture</span>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: "var(--space-4)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={12} style={{ color: "var(--accent-secondary)" }} />
              <span>Tech Fusion 4.0 · Codestorm</span>
            </span>
            <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>Problem Statement PS-01A</span>
          </div>
        </div>

        {/* Right: Auth Console Form */}
        <div className="login-card">
          <div className="login-header-branding">
            <div className="login-logo-badge">
              <Shield size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {authMode === "signin" ? "Sign in to LogPilot AI" : "Create LogPilot Account"}
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                {authMode === "signin"
                  ? "Enter credentials or select a 1-click evaluation demo role"
                  : "Register a new operator or administrator account"}
              </p>
            </div>
          </div>

          {/* Segmented Switcher Tabs */}
          <div className="auth-segmented-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${authMode === "signin" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("signin");
                setError(null);
              }}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authMode === "signup" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("signup");
                setError(null);
              }}
            >
              <UserPlus size={14} />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Banner */}
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

          {/* MODE 1: SIGN IN */}
          {authMode === "signin" && (
            <>
              {/* 1-Click Fast Demo Login Roles */}
              <div className="demo-roles-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    1-Click Evaluation Accounts
                  </span>
                  <span style={{ fontSize: 10, color: "var(--accent-primary)", fontWeight: 700, background: "rgba(56, 189, 248, 0.12)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}>
                    Instant Access
                  </span>
                </div>

                {/* Admin Role Card */}
                <button
                  type="button"
                  className="demo-role-item admin-role"
                  onClick={() => handleQuickDemoLogin("admin", "Admin@LogPilot2026!")}
                  disabled={submitting}
                  title="Click to instantly sign in as Administrator"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>Admin User</span>
                      <span className="role-tag-admin">ADMIN ROLE</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      Full control: settings, purge telemetry, remediation playbooks
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Username: <strong style={{ color: "#c4b5fd" }}>admin</strong> · Password: <strong style={{ color: "#c4b5fd" }}>Admin@LogPilot2026!</strong>
                    </div>
                  </div>
                  <div className="demo-role-btn-pill admin">
                    <span>Launch</span>
                    <Zap size={12} />
                  </div>
                </button>

                {/* Normal User Role Card */}
                <button
                  type="button"
                  className="demo-role-item normal-role"
                  onClick={() => handleQuickDemoLogin("operator", "Operator@LogPilot2026!")}
                  disabled={submitting}
                  title="Click to instantly sign in as Operator (Normal User)"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>Normal User</span>
                      <span className="role-tag-normal">NORMAL ROLE</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      Observability view: live streaming, logs, traces, RCA investigation
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Username: <strong style={{ color: "#67e8f9" }}>operator</strong> · Password: <strong style={{ color: "#67e8f9" }}>Operator@LogPilot2026!</strong>
                    </div>
                  </div>
                  <div className="demo-role-btn-pill normal">
                    <span>Launch</span>
                    <Zap size={12} />
                  </div>
                </button>
              </div>

              <div className="login-divider">or sign in with password</div>

              {/* Standard Login Form */}
              <form onSubmit={handleSignInSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="login-form-group">
                  <label htmlFor="login-username">Username or Email</label>
                  <div className="login-input-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      placeholder="admin or operator"
                      value={signInUsername}
                      onChange={(e) => setSignInUsername(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="login-form-group">
                  <label htmlFor="login-password">Password</label>
                  <div className="login-input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="login-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="toggle-pw-btn"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    >
                      {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
            </>
          )}

          {/* MODE 2: CREATE ACCOUNT (SIGN UP) */}
          {authMode === "signup" && (
            <form onSubmit={handleSignUpSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="login-form-group">
                <label htmlFor="signup-name">Full Name (Optional)</label>
                <div className="login-input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="e.g. Alex Rivera"
                    value={signUpFullName}
                    onChange={(e) => setSignUpFullName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                <div className="login-form-group">
                  <label htmlFor="signup-username">Username *</label>
                  <div className="login-input-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      id="signup-username"
                      type="text"
                      placeholder="e.g. alex_sre"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="login-form-group">
                  <label htmlFor="signup-email">Work Email *</label>
                  <div className="login-input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="signup-email"
                      type="email"
                      placeholder="alex@logpilot.ai"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="login-form-group">
                <label htmlFor="signup-password">
                  <span>Password *</span>
                  {strength.label && (
                    <span style={{ fontSize: 11, color: strength.level === 3 ? "var(--status-success)" : strength.level === 2 ? "var(--status-warning)" : "var(--status-critical)" }}>
                      Strength: {strength.label}
                    </span>
                  )}
                </label>
                <div className="login-input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pw-btn"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                  >
                    {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signUpPassword && (
                  <div className="password-strength-bar">
                    <div className={`password-strength-segment ${strength.level >= 1 ? strength.class : ""}`} />
                    <div className={`password-strength-segment ${strength.level >= 2 ? strength.class : ""}`} />
                    <div className={`password-strength-segment ${strength.level >= 3 ? strength.class : ""}`} />
                  </div>
                )}
              </div>

              {/* Role Selector Cards */}
              <div className="login-form-group">
                <label>Select Initial RBAC Role</label>
                <div className="signup-role-selector">
                  <div
                    className={`signup-role-card ${signUpRole === "normal" ? "selected" : ""}`}
                    onClick={() => setSignUpRole("normal")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>Normal User</span>
                      <span className="role-tag-normal">NORMAL</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      Live logs, traces, anomaly detector & RCA investigation
                    </span>
                  </div>

                  <div
                    className={`signup-role-card admin ${signUpRole === "admin" ? "selected admin" : ""}`}
                    onClick={() => setSignUpRole("admin")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>Administrator</span>
                      <span className="role-tag-admin">ADMIN</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      Full platform settings, maintenance & playbooks
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                icon={UserPlus}
                style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
              >
                {submitting ? "Creating Account..." : "Create Account & Sign In"}
              </Button>
            </form>
          )}

          {/* Footer Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "var(--space-2)",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <Link to="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              ← Back to Homepage
            </Link>
            <span>SHA-256 JWT & PBKDF2 Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
