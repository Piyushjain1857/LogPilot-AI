import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as apiLogin, logout as apiLogout, getCurrentUserProfile } from "../services/api";

const AuthContext = createContext({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isAdmin: false,
  isNormal: false,
  loading: false,
  login: async () => {},
  logout: () => {},
  switchDemoRole: async () => {},
});

export const TOKEN_STORAGE_KEY = "logpilot_access_token";
export const USER_STORAGE_KEY = "logpilot_user_info";
export const LOGGED_OUT_KEY = "logpilot_logged_out";

const DEFAULT_ADMIN_USER = {
  id: "usr-admin-demo",
  username: "admin",
  email: "admin@logpilot.ai",
  role: "admin",
  full_name: "System Administrator",
  is_active: true,
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(LOGGED_OUT_KEY) === "true") {
        return null;
      }
      const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
      return stored || "demo-admin-jwt-token";
    } catch {
      return "demo-admin-jwt-token";
    }
  });

  const [user, setUser] = useState(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(LOGGED_OUT_KEY) === "true") {
        return null;
      }
      const saved = typeof window !== "undefined" ? localStorage.getItem(USER_STORAGE_KEY) : null;
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
    } catch {
      return DEFAULT_ADMIN_USER;
    }
  });

  const [loading, setLoading] = useState(false);

  // If a real backend token exists, validate session against backend
  useEffect(() => {
    let isMounted = true;
    if (token && token !== "demo-admin-jwt-token") {
      try {
        const promise = getCurrentUserProfile();
        if (promise && typeof promise.then === "function") {
          promise
            .then((profile) => {
              if (isMounted && profile) {
                setUser(profile);
                try {
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
                } catch {}
              }
            })
            .catch((err) => {
              if (err?.status === 401 || err?.status === 403) {
                console.warn("Session token expired, clearing session:", err);
                setToken(null);
                setUser(null);
                try {
                  localStorage.removeItem(TOKEN_STORAGE_KEY);
                  localStorage.removeItem(USER_STORAGE_KEY);
                  localStorage.setItem(LOGGED_OUT_KEY, "true");
                } catch {}
              }
            });
        }
      } catch (err) {
        console.warn("Profile fetch error:", err);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const data = await apiLogin(username, password);
      setToken(data.access_token);
      setUser(data.user);
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        localStorage.removeItem(LOGGED_OUT_KEY);
      } catch {}
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout().catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.setItem(LOGGED_OUT_KEY, "true");
      } catch {}
    }
  }, []);

  const switchDemoRole = useCallback(async (targetRole) => {
    const creds = targetRole.toLowerCase() === "admin"
      ? { username: "admin", password: "Admin@LogPilot2026!" }
      : { username: "operator", password: "Operator@LogPilot2026!" };
    return await login(creds.username, creds.password);
  }, [login]);

  const rawRole = (user?.role || "").toLowerCase();
  const isAuthenticated = Boolean(token && user);
  const isAdmin = rawRole === "admin";
  const isNormal = rawRole === "normal" || rawRole === "operator" || rawRole === "viewer" || rawRole === "analyst";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: rawRole || "guest",
        isAuthenticated,
        isAdmin,
        isNormal,
        loading,
        login,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
