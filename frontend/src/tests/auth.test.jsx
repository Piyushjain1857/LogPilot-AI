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
});
