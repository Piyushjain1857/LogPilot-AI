import { WS_BASE_URL } from "../config/constants";

class WebSocketService {
  constructor() {
    this.ws = null;
    this.status = "DISCONNECTED"; // CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED
    this.listeners = new Map(); // eventType -> Set of callbacks
    this.statusListeners = new Set();
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.lastPongTime = null;
    this.lastSequence = 0;
    this.currentFilters = { severities: [], services: [], source_ids: [] };
    this.isExplicitlyClosed = false;

    // Window event listeners for network changes
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        if (this.status !== "CONNECTED") {
          this.reconnect();
        }
      });
      window.addEventListener("offline", () => {
        this._updateStatus("DISCONNECTED");
      });
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this._updateStatus(this.reconnectAttempt > 0 ? "RECONNECTING" : "CONNECTING");

    const endpoint = `${WS_BASE_URL}/ws/v1/logs`;
    try {
      this.ws = new WebSocket(endpoint);
    } catch (err) {
      console.warn("Failed to create WebSocket:", err);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this._updateStatus("CONNECTED");
      this._startHeartbeat();

      // Re-apply subscription filters if any
      this.subscribe(this.currentFilters, this.lastSequence);
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, sequence } = parsed;

        if (sequence && sequence > this.lastSequence) {
          this.lastSequence = sequence;
        }

        if (type === "heartbeat.ack") {
          this.lastPongTime = Date.now();
        }

        this._emit(type, parsed);
        this._emit("*", parsed);
      } catch (err) {
        console.warn("Error parsing WebSocket message:", err);
      }
    };

    this.ws.onerror = (err) => {
      console.warn("WebSocket error observed:", err);
    };

    this.ws.onclose = () => {
      this._stopHeartbeat();
      if (!this.isExplicitlyClosed) {
        this._updateStatus("DISCONNECTED");
        this._scheduleReconnect();
      }
    };
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {
        /* ignore close errors */
      }
      this.ws = null;
    }
    this._updateStatus("DISCONNECTED");
  }

  reconnect() {
    this.disconnect();
    this.reconnectAttempt = 0;
    this.connect();
  }

  subscribe(filters = {}, afterSequence = null) {
    this.currentFilters = { ...filters };
    if (afterSequence !== null) {
      this.lastSequence = afterSequence;
    }
    this.send({
      type: "subscribe",
      filters: this.currentFilters,
      after_sequence: this.lastSequence || undefined,
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (err) {
        console.warn("Failed to send WebSocket message:", err);
      }
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  _emit(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("Error in WebSocket event listener:", err);
        }
      });
    }
  }

  _updateStatus(newStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => {
      try {
        cb(newStatus);
      } catch (_) {
        /* ignore listener error */
      }
    });
  }

  _scheduleReconnect() {
    if (this.isExplicitlyClosed) return;
    this.reconnectAttempt += 1;
    // Exponential backoff with random jitter up to 30s max
    const maxDelay = 30000;
    const baseDelay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempt), maxDelay);
    const jitter = Math.random() * 800;
    const delay = Math.min(baseDelay + jitter, maxDelay);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, delay);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, 20000); // 20s interval
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const websocketService = new WebSocketService();
