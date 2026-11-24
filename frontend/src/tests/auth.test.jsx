import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import { AuthProvider } from "../context/AuthContext";
import * as api from "../services/api";

vi.mock("../services/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue({ status: "success" }),
    getCurrentUserProfile: vi.fn().mockResolvedValue(null),
    getDemoAccounts: vi.fn().mockResolvedValue({
      accounts: [
        { username: "admin", role: "admin", label: "Administrator" },
        { username: "operator", role: "normal", label: "Normal User / Operator" },
      ],
    }),
  };
});

describe("JWT Authentication and Multi-Role Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders LoginPage with title, inputs, and 1-click demo role options", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Sign in to LogPilot AI")).toBeInTheDocument();
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with credentials/i })).toBeInTheDocument();
    expect(screen.getByText("ADMIN ROLE")).toBeInTheDocument();
    expect(screen.getByText("NORMAL ROLE")).toBeInTheDocument();
  });

  it("triggers 1-click demo login for Admin User", async () => {
    api.login.mockResolvedValueOnce({
      access_token: "mock-jwt-admin-token",
      token_type: "bearer",
      role: "admin",
      user: {
        id: "usr-admin",
        username: "admin",
        email: "admin@logpilot.ai",
        role: "admin",
        full_name: "System Administrator",
        is_active: true,
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const adminButton = screen.getByText("Admin User").closest("button");
    fireEvent.click(adminButton);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith("admin", "Admin@LogPilot2026!");
    });
  });

  it("triggers 1-click demo login for Normal User", async () => {
    api.login.mockResolvedValueOnce({
      access_token: "mock-jwt-normal-token",
      token_type: "bearer",
      role: "normal",
      user: {
        id: "usr-operator",
        username: "operator",
        email: "operator@logpilot.ai",
        role: "normal",
        full_name: "Observability Operator",
        is_active: true,
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const normalButton = screen.getByText("Normal User").closest("button");
    fireEvent.click(normalButton);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith("operator", "Operator@LogPilot2026!");
    });
  });

  it("displays error message on invalid credentials", async () => {
    api.login.mockRejectedValueOnce({
      details: "Invalid username or password",
      status: 401,
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const usernameInput = screen.getByLabelText(/username or email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitButton = screen.getByRole("button", { name: /sign in with credentials/i });

    fireEvent.change(usernameInput, { target: { value: "invalid_user" } });
    fireEvent.change(passwordInput, { target: { value: "bad_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid username or password")).toBeInTheDocument();
    });
  });

  it("switches to Create Account tab and submits registration with selected role", async () => {
    api.register.mockResolvedValueOnce({
      access_token: "mock-jwt-registered-token",
      token_type: "bearer",
      role: "admin",
      user: {
        id: "usr-new-admin",
        username: "test_admin",
        email: "test_admin@example.com",
        role: "admin",
        full_name: "Test Admin",
        is_active: true,
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Switch to Create Account tab
    const createAccountTab = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(createAccountTab);

    expect(screen.getByText("Create LogPilot Account")).toBeInTheDocument();
    expect(screen.getByLabelText(/username \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work email \*/i)).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/username \*/i);
    const emailInput = screen.getByLabelText(/work email \*/i);
    const passwordInput = screen.getByLabelText(/^password \*/i);

    fireEvent.change(usernameInput, { target: { value: "test_admin" } });
    fireEvent.change(emailInput, { target: { value: "test_admin@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });

    // Select Administrator role
    const adminRoleCard = screen.getByText("Full platform settings, maintenance & playbooks").closest(".signup-role-card");
    fireEvent.click(adminRoleCard);

    const submitBtn = screen.getByRole("button", { name: /create account & sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        username: "test_admin",
        email: "test_admin@example.com",
        password: "SecurePass123!",
        full_name: undefined,
        role: "admin",
      });
    });
  });
});
