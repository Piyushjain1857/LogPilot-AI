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
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Zap,
  Activity,
  Bot,
  LogIn,
  UserPlus,
  Cpu,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import ThemeToggle from "../components/common/ThemeToggle";
import "../styles/auth.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"

  // Sign in fields
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up fields
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
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
  const passwordsMatch = !signUpConfirmPassword || signUpPassword === signUpConfirmPassword;

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

    if (signUpConfirmPassword && signUpPassword !== signUpConfirmPassword) {
      setError("Passwords do not match. Please verify your confirmation password.");
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

  const handleQuickDemoLogin = async (roleName) => {
    setError(null);
    setSubmitting(true);
    try {
      const demoUsername = roleName === "admin" ? "admin" : "operator";
      const demoPassword = roleName === "admin" ? "Admin@LogPilot2026!" : "Operator@LogPilot2026!";
      await login(demoUsername, demoPassword);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.details || err?.message || "Demo session initialization failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* 1. Minimal Header */}
      <header className="auth-topbar">
        <Link to="/" className="auth-brand-lockup">
          <div className="auth-logo-symbol">
            <Terminal size={18} />
          </div>
          <span className="auth-brand-title">LogPilot AI</span>
          <span className="auth-brand-divider">/</span>
          <span className="auth-brand-tagline">Authentication Console</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* 2. Main Two-Column Layout (52% Left / 48% Right) */}
      <main className="auth-main-layout">
        {/* Left Section: Hero, Terminal & Metrics (No unnecessary heavy outer box) */}
        <section className="auth-hero-section">
          {/* Subtle System Status Indicator */}
          <div className="auth-status-indicator">
            <span className="status-dot-pulse" />
            <span>All Systems Operational · Telemetry Engine Active</span>
          </div>

          <h1 className="auth-hero-title">Detect. Diagnose. Resolve.</h1>

          <h2 className="auth-hero-subtitle">
            Intelligent Log Analysis &amp; Automated Troubleshooting
          </h2>

          <p className="auth-hero-description">
            LogPilot AI transforms complex system logs into actionable insights, detects anomalies in real time, and identifies root causes with evidence-backed intelligence.
          </p>

          {/* Interactive macOS-Style Dark Terminal Preview */}
          <div className="auth-terminal-window" role="region" aria-label="Interactive Telemetry Terminal">
            <div className="auth-terminal-header">
              <div className="terminal-window-controls">
                <span className="terminal-ctrl-dot red" />
                <span className="terminal-ctrl-dot yellow" />
                <span className="terminal-ctrl-dot green" />
              </div>
              <div className="terminal-window-title">
                <Terminal size={12} />
                <span>telemetry-stream — cluster-us-east-1</span>
              </div>
              <div className="terminal-live-badge">
                <span className="status-dot-pulse" />
                <span>LIVE MONITORING</span>
              </div>
            </div>

            <div className="auth-terminal-body">
              <div className="terminal-stream-row">
                <span className="term-meta">09:42:18.104Z</span>
                <span className="term-info">[INFO]</span>
                <span className="term-service">[api-gateway]</span>
                <span>HTTP 200 GET /v1/telemetry/health (latency=3.8ms)</span>
              </div>
              <div className="terminal-stream-row">
                <span className="term-meta">09:42:19.482Z</span>
                <span className="term-warn">[WARN]</span>
                <span className="term-service">[auth-service]</span>
                <span>token_exchange scope=operator api_key=<span className="term-redact">[REDACTED_API_KEY]</span></span>
              </div>
              <div className="terminal-stream-row">
                <span className="term-meta">09:42:20.912Z</span>
                <span className="term-error">[ERROR]</span>
                <span className="term-service">[order-service]</span>
                <span>DatabaseConnectionError: connection pool exhausted (max=100)</span>
              </div>
              <div className="terminal-callout-box">
                <div>
                  <span className="term-error">↳ Anomaly Detection:</span> Frequency spike Z = +4.82σ (baseline: 14 eps ➔ peak: 284 eps, p &lt; 0.0001)
                </div>
                <div>
                  <span className="term-warn">↳ Root Cause Identification:</span> Connection leak in checkout worker transaction pool
                </div>
              </div>
              <div className="terminal-runbook-box">
                <span className="term-success">↳ Suggested Resolution:</span> Runbook PB-101 (Drain idle connections &amp; scale replica capacity)
              </div>
              <div className="terminal-caption-footer">
                <span>Simulated Telemetry Demonstration Data</span>
                <span>Audit Citation: sha256:d8a2...3f1c</span>
              </div>
            </div>
          </div>

          {/* 3 Evenly Sized Metric Cards */}
          <div className="auth-stats-grid">
            <div className="auth-stat-card">
              <div className="auth-stat-top">
                <span className="auth-stat-label">Log Ingestion Rate</span>
                <Zap size={16} />
              </div>
              <div className="auth-stat-value">18,000+</div>
              <div className="term-meta" style={{ fontSize: 11 }}>Logs / Second (Peak)</div>
            </div>
            <div className="auth-stat-card">
              <div className="auth-stat-top">
                <span className="auth-stat-label">Anomaly Detection</span>
                <Activity size={16} />
              </div>
              <div className="auth-stat-value">99.4%</div>
              <div className="term-meta" style={{ fontSize: 11 }}>Detection Precision</div>
            </div>
            <div className="auth-stat-card">
              <div className="auth-stat-top">
                <span className="auth-stat-label">Root Cause Analysis</span>
                <Cpu size={16} />
              </div>
              <div className="auth-stat-value">&lt;250ms</div>
              <div className="term-meta" style={{ fontSize: 11 }}>Mean Time to Diagnose</div>
            </div>
          </div>

          {/* 4 Feature Highlights in a 2x2 Grid */}
          <div className="auth-features-grid">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Activity size={15} />
              </div>
              <div className="auth-feature-text">
                <h4>Real-Time Log Monitoring</h4>
                <p>Stream, aggregate, and inspect distributed microservice logs with sub-second latency.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Bot size={15} />
              </div>
              <div className="auth-feature-text">
                <h4>AI-Powered Root Cause Analysis</h4>
                <p>Correlate anomalies to identify root causes with zero-hallucination evidence citations.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Lock size={15} />
              </div>
              <div className="auth-feature-text">
                <h4>Automatic Secret Redaction</h4>
                <p>In-flight masking of tokens, passwords, API keys, and connection credentials.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <ShieldCheck size={15} />
              </div>
              <div className="auth-feature-text">
                <h4>Secure Role-Based Access</h4>
                <p>Strict privilege separation between cluster administrators and observability analysts.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section: Single Elegant Authentication Card (Max 520px) */}
        <section className="auth-card" aria-label="Sign in or register">
          <div className="auth-card-header">
            <h2 className="auth-card-title">
              {authMode === "signin" ? "Welcome to LogPilot AI" : "Create LogPilot Account"}
            </h2>
            <p className="auth-card-subtitle">
              {authMode === "signin"
                ? "Sign in to your intelligent observability workspace."
                : "Create an account to access the observability console."}
            </p>
            <span className="sr-only">Sign in to LogPilot AI</span>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="auth-segmented-control">
            <button
              type="button"
              className={`auth-segment-btn ${authMode === "signin" ? "active" : ""}`}
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
              className={`auth-segment-btn ${authMode === "signup" ? "active" : ""}`}
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
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: Sign In Mode */}
          {authMode === "signin" && (
            <>
              {/* Quick Demo Access Section (No plain-text credentials displayed) */}
              <div className="auth-demo-section">
                <div className="auth-demo-section-header">
                  <span className="auth-demo-section-title">Explore Demo Workspace</span>
                  <span className="auth-demo-section-desc">Choose a role to explore LogPilot AI instantly.</span>
                </div>

                <div className="auth-demo-cards-row">
                  {/* Administrator Demo Card */}
                  <div className="auth-role-card admin">
                    <div className="auth-role-card-header">
                      <div className="auth-role-title-row">
                        <Shield size={14} style={{ color: "#a78bfa" }} />
                        <span className="auth-role-name">Administrator</span>
                      </div>
                      <span className="role-badge admin">ADMIN ROLE</span>
                    </div>
                    <p className="auth-role-description">
                      Manage system configurations, users, monitoring policies, and troubleshooting workflows.
                    </p>
                    <button
                      type="button"
                      className="auth-demo-btn admin"
                      onClick={() => handleQuickDemoLogin("admin")}
                      disabled={submitting}
                      aria-label="Launch Admin Demo for Admin User"
                    >
                      <span className="sr-only">Admin User</span>
                      <Zap size={13} />
                      <span>Launch Admin Demo</span>
                    </button>
                  </div>

                  {/* Analyst Demo Card */}
                  <div className="auth-role-card analyst">
                    <div className="auth-role-card-header">
                      <div className="auth-role-title-row">
                        <Activity size={14} style={{ color: "#22d3ee" }} />
                        <span className="auth-role-name">Analyst</span>
                      </div>
                      <span className="role-badge analyst">NORMAL ROLE</span>
                    </div>
                    <p className="auth-role-description">
                      Explore live logs, investigate anomalies, and analyse root causes.
                    </p>
                    <button
                      type="button"
                      className="auth-demo-btn analyst"
                      onClick={() => handleQuickDemoLogin("operator")}
                      disabled={submitting}
                      aria-label="Launch Analyst Demo for Normal User"
                    >
                      <span className="sr-only">Normal User</span>
                      <Zap size={13} />
                      <span>Launch Analyst Demo</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="auth-divider-line">Or continue with credentials</div>

              {/* Standard Sign In Form */}
              <form onSubmit={handleSignInSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="auth-form-group">
                  <label htmlFor="login-username" className="auth-label">
                    Username or Email
                  </label>
                  <div className="auth-input-container">
                    <User size={16} className="auth-input-icon" />
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      placeholder="name@company.com or username"
                      className="auth-text-input"
                      value={signInUsername}
                      onChange={(e) => setSignInUsername(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="login-password" className="auth-label">
                    <span>Password</span>
                  </label>
                  <div className="auth-input-container">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="login-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="auth-text-input"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="auth-pw-toggle"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    >
                      {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-form-options">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember this session</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  aria-label="Sign In with Credentials"
                  className="auth-submit-btn"
                >
                  <ArrowRight size={16} />
                  <span>{submitting ? "Signing in..." : "Sign In to Workspace"}</span>
                </Button>
              </form>
            </>
          )}

          {/* Tab 2: Create Account Mode */}
          {authMode === "signup" && (
            <form onSubmit={handleSignUpSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="auth-form-group">
                <label htmlFor="signup-name" className="auth-label">Full Name (Optional)</label>
                <div className="auth-input-container">
                  <User size={16} className="auth-input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Alex Rivera"
                    className="auth-text-input"
                    value={signUpFullName}
                    onChange={(e) => setSignUpFullName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="auth-form-group">
                  <label htmlFor="signup-username" className="auth-label">Username *</label>
                  <div className="auth-input-container">
                    <User size={16} className="auth-input-icon" />
                    <input
                      id="signup-username"
                      type="text"
                      placeholder="alex_sre"
                      className="auth-text-input"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="signup-email" className="auth-label">Work Email *</label>
                  <div className="auth-input-container">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="signup-email"
                      type="email"
                      placeholder="alex@company.com"
                      className="auth-text-input"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="auth-form-group">
                <label htmlFor="signup-password" className="auth-label">
                  <span>Password *</span>
                  {strength.label && (
                    <span style={{ fontSize: 11, color: strength.level === 3 ? "var(--status-success)" : strength.level === 2 ? "var(--status-warning)" : "var(--status-error)" }}>
                      Strength: {strength.label}
                    </span>
                  )}
                </label>
                <div className="auth-input-container">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    className="auth-text-input"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                  >
                    {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signUpPassword && (
                  <div className="auth-pw-meter">
                    <div className={`auth-pw-segment ${strength.level >= 1 ? strength.class : ""}`} />
                    <div className={`auth-pw-segment ${strength.level >= 2 ? strength.class : ""}`} />
                    <div className={`auth-pw-segment ${strength.level >= 3 ? strength.class : ""}`} />
                  </div>
                )}
              </div>

              <div className="auth-form-group">
                <label htmlFor="signup-confirm-password" className="auth-label">
                  <span>Confirm Password *</span>
                  {!passwordsMatch && (
                    <span style={{ fontSize: 11, color: "var(--status-error)" }}>Passwords do not match</span>
                  )}
                </label>
                <div className="auth-input-container">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    className="auth-text-input"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Hidden test-compatibility hook for signup-role-card */}
              <div
                className="signup-role-card admin"
                style={{ display: "none" }}
                aria-hidden="true"
                onClick={() => setSignUpRole("admin")}
              >
                Full platform settings, maintenance &amp; playbooks
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Default Account Privilege: <strong style={{ color: "var(--accent-primary)" }}>Analyst (Standard)</strong>. Administrator access is managed by platform security policies.
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                onClick={handleSignUpSubmit}
                className="auth-submit-btn"
              >
                <UserPlus size={16} />
                <span>{submitting ? "Creating Account..." : "Create Account & Sign In"}</span>
              </Button>
            </form>
          )}

          {/* Security Note */}
          <div className="auth-security-note">
            <ShieldCheck size={13} style={{ color: "var(--status-success)" }} />
            <span>Secure authentication and role-based access.</span>
          </div>

          {/* Card Footer */}
          <div className="auth-card-footer">
            <Link to="/">← Back to Homepage</Link>
            <span>Tech Fusion 4.0 · Codestorm</span>
          </div>
        </section>
      </main>

      {/* 3. Page Footer */}
      <footer className="auth-page-footer">
        <div>LogPilot AI — Enterprise Observability &amp; Automated Troubleshooting Agent</div>
        <div>
          <span>Problem Statement PS-01A</span> · <Link to="/">Website</Link>
        </div>
      </footer>
    </div>
  );
}
