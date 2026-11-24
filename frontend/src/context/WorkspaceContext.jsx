import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getPreferences, updatePreferences as apiUpdatePreferences } from "../services/api";

const WorkspaceContext = createContext({
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  displayDensity: "comfortable",
  setDisplayDensity: () => {},
  timezone: "UTC",
  setTimezone: () => {},
  autoRefreshEnabled: true,
  setAutoRefreshEnabled: () => {},
  autoRefreshInterval: 30,
  setAutoRefreshInterval: () => {},
  updateWorkspaceSettings: async () => {},
  loadingPreferences: false,
});

export function WorkspaceProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    try {
      return localStorage.getItem("logpilot_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [displayDensity, setDisplayDensityState] = useState(() => {
    try {
      return localStorage.getItem("logpilot_display_density") || "comfortable";
    } catch {
      return "comfortable";
    }
  });

  const [timezone, setTimezoneState] = useState(() => {
    try {
      return localStorage.getItem("logpilot_timezone") || "UTC";
    } catch {
      return "UTC";
    }
  });

  const [autoRefreshEnabled, setAutoRefreshEnabledState] = useState(true);
  const [autoRefreshInterval, setAutoRefreshIntervalState] = useState(30);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  // Sync density attribute to root DOM element
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-density", displayDensity);
    }
  }, [displayDensity]);

  const setSidebarCollapsed = useCallback((collapsed) => {
    setSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem("logpilot_sidebar_collapsed", String(collapsed));
    } catch (e) {
      console.warn("Could not write sidebar state to localStorage", e);
    }
  }, []);

  const setDisplayDensity = useCallback((density) => {
    setDisplayDensityState(density);
    try {
      localStorage.setItem("logpilot_display_density", density);
    } catch (e) {
      console.warn("Could not write density to localStorage", e);
    }
  }, []);

  const setTimezone = useCallback((tz) => {
    setTimezoneState(tz);
    try {
      localStorage.setItem("logpilot_timezone", tz);
    } catch (e) {
      console.warn("Could not write timezone to localStorage", e);
    }
  }, []);

  // Fetch backend preferences on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendPrefs() {
      try {
        const prefs = await getPreferences();
        if (isMounted && prefs) {
          if (prefs.sidebar_collapsed !== undefined) {
            setSidebarCollapsedState(prefs.sidebar_collapsed);
          }
          if (prefs.display_density) {
            setDisplayDensityState(prefs.display_density);
          }
          if (prefs.timezone) {
            setTimezoneState(prefs.timezone);
          }
          if (prefs.auto_refresh_enabled !== undefined) {
            setAutoRefreshEnabledState(prefs.auto_refresh_enabled);
          }
          if (prefs.auto_refresh_interval) {
            setAutoRefreshIntervalState(prefs.auto_refresh_interval);
          }
        }
      } catch {
        // Backend offline or unreachable: localStorage fallback already initialized
      } finally {
        if (isMounted) setLoadingPreferences(false);
      }
    }

    loadBackendPrefs();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateWorkspaceSettings = useCallback(
    async (partial) => {
      if (partial.sidebar_collapsed !== undefined) {
        setSidebarCollapsed(partial.sidebar_collapsed);
      }
      if (partial.display_density !== undefined) {
        setDisplayDensity(partial.display_density);
      }
      if (partial.timezone !== undefined) {
        setTimezone(partial.timezone);
      }
      if (partial.auto_refresh_enabled !== undefined) {
        setAutoRefreshEnabledState(partial.auto_refresh_enabled);
      }
      if (partial.auto_refresh_interval !== undefined) {
        setAutoRefreshIntervalState(partial.auto_refresh_interval);
      }

      try {
        await apiUpdatePreferences(partial);
      } catch (err) {
        console.warn("Failed to synchronize preferences to backend", err);
      }
    },
    [setSidebarCollapsed, setDisplayDensity, setTimezone]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        displayDensity,
        setDisplayDensity,
        timezone,
        setTimezone,
        autoRefreshEnabled,
        setAutoRefreshEnabled: setAutoRefreshEnabledState,
        autoRefreshInterval,
        setAutoRefreshInterval: setAutoRefreshIntervalState,
        updateWorkspaceSettings,
        loadingPreferences,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
