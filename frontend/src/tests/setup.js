import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock ResizeObserver for Recharts in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia for jsdom
if (typeof window !== "undefined") {
  window.matchMedia =
    window.matchMedia ||
    function (query) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: function () {},
        removeListener: function () {},
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () {},
      };
    };

  // Mock WebSocket for test environment
  global.WebSocket = class MockWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 1; // OPEN
      setTimeout(() => {
        if (this.onopen) this.onopen({ type: "open" });
      }, 0);
    }
    send() {}
    close() {
      this.readyState = 3;
      if (this.onclose) this.onclose({ type: "close" });
    }
  };
}

// Mock streamingService to prevent real network calls during App renders in tests
vi.mock("../services/streamingService", () => ({
  streamingService: {
    getStreamStatus: vi.fn().mockResolvedValue({
      status: "healthy",
      ws_endpoint: "ws://127.0.0.1:8000/ws/v1/logs",
      connected_clients: 0,
    }),
    getStreamMetrics: vi.fn().mockResolvedValue({
      logs_per_second: 0,
      queue_depth: 0,
      active_sources: {},
      severity_distribution: {},
    }),
    replayEvents: vi.fn().mockResolvedValue({ events: [], count: 0, has_more: false }),
  },
}));
