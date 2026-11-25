/**
 * LogPilot AI — Real-Time Client Telemetry & Error Observer SDK
 * Lightweight, zero-dependency browser integration script.
 * 
 * Captures:
 *  - JavaScript runtime exceptions
 *  - Unhandled promise rejections
 *  - Failed HTTP API requests (fetch & XMLHttpRequest >= 400 or network drops)
 *  - Console error events
 *  - Web Vitals & Navigation Performance metrics
 *
 * Privacy & Security:
 *  - In-flight redaction of passwords, tokens, auth headers, cookies, and sensitive PII.
 */
(function (root) {
  'use strict';

  var SENSITIVE_KEYS = [
    'password', 'passwd', 'secret', 'token', 'auth', 'authorization',
    'cookie', 'api_key', 'apikey', 'access_token', 'refresh_token',
    'private_key', 'ssn', 'credit_card', 'card_number', 'cvv'
  ];

  function sanitize(val) {
    if (!val) return val;
    if (typeof val === 'string') {
      var lower = val.toLowerCase();
      for (var i = 0; i < SENSITIVE_KEYS.length; i++) {
        var k = SENSITIVE_KEYS[i];
        if (lower.indexOf(k) !== -1 && (lower.indexOf('=') !== -1 || lower.indexOf(':') !== -1)) {
          return '[REDACTED_CREDENTIAL]';
        }
      }
      if (lower.indexOf('bearer ') !== -1 || lower.indexOf('basic ') !== -1) {
        return '[REDACTED_AUTH_TOKEN]';
      }
      return val;
    }
    if (typeof val === 'object') {
      try {
        var copy = Array.isArray(val) ? [] : {};
        for (var key in val) {
          if (Object.prototype.hasOwnProperty.call(val, key)) {
            var kLower = key.toLowerCase();
            var isSensitive = false;
            for (var j = 0; j < SENSITIVE_KEYS.length; j++) {
              if (kLower.indexOf(SENSITIVE_KEYS[j]) !== -1) {
                isSensitive = true;
                break;
              }
            }
            copy[key] = isSensitive ? '[REDACTED]' : sanitize(val[key]);
          }
        }
        return copy;
      } catch (e) {
        return '[Unserializable Object]';
      }
    }
    return val;
  }

  var LogPilot = {
    projectKey: null,
    endpoint: 'http://127.0.0.1:8000/api/v1/websites/ingest',
    debug: false,
    _queue: [],
    _flushTimer: null,
    _initialized: false,

    init: function (options) {
      if (this._initialized) return;
      options = options || {};

      // 1. Resolve configuration from passed options or script tag data attributes
      this.projectKey = options.projectKey;
      this.endpoint = options.endpoint || this.endpoint;
      this.debug = Boolean(options.debug);

      if (!this.projectKey && typeof document !== 'undefined') {
        var currentScript = document.currentScript || document.querySelector('script[data-project-key]');
        if (currentScript) {
          this.projectKey = currentScript.getAttribute('data-project-key');
          var ep = currentScript.getAttribute('data-endpoint');
          if (ep) this.endpoint = ep;
          if (currentScript.getAttribute('data-debug') === 'true') this.debug = true;
        }
      }

      if (!this.projectKey) {
        if (this.debug) console.warn('[LogPilot SDK] Missing project key. Initialization delayed.');
        return;
      }

      this._initialized = true;
      this._bindGlobalErrorHandlers();
      this._bindNetworkInterceptors();
      this._bindPerformanceCollector();

      if (this.debug) {
        console.log('[LogPilot SDK] Observer active. Streaming to:', this.endpoint, 'Project:', this.projectKey.slice(0, 12) + '...');
      }
    },

    captureEvent: function (event) {
      if (!this._initialized || !this.projectKey) return;
      event.timestamp = event.timestamp || new Date().toISOString();
      event.url = event.url || (typeof window !== 'undefined' ? window.location.href : '');
      event.user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeJS/Browser';

      // Run redaction sanitizer
      event.message = sanitize(event.message || 'Unknown runtime event');
      if (event.metadata) {
        event.metadata = sanitize(event.metadata);
      }

      this._queue.push(event);

      if (this.debug) {
        console.info('[LogPilot Telemetry Queued]', event.event_type, event.message);
      }

      // If critical error, flush immediately, otherwise debounce flush
      if (event.severity === 'CRITICAL' || this._queue.length >= 5) {
        this.flush();
      } else if (!this._flushTimer) {
        var self = this;
        this._flushTimer = setTimeout(function () {
          self.flush();
        }, 2000);
      }
    },

    flush: function () {
      if (this._flushTimer) {
        clearTimeout(this._flushTimer);
        this._flushTimer = null;
      }
      if (this._queue.length === 0 || !this.projectKey) return;

      var batch = this._queue.slice(0);
      this._queue = [];

      var payload = JSON.stringify({ events: batch });

      // Attempt Beacon transmission if available on page teardown
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          var blob = new Blob([payload], { type: 'application/json' });
          var beaconUrl = this.endpoint + (this.endpoint.indexOf('?') === -1 ? '?' : '&') + 'key=' + encodeURIComponent(this.projectKey);
          var success = navigator.sendBeacon(beaconUrl, blob);
          if (success) return;
        } catch (e) {
          // Fall back to fetch
        }
      }

      // Standard fetch transmission
      if (typeof fetch !== 'undefined') {
        fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-LogPilot-Key': this.projectKey,
          },
          body: payload,
          keepalive: true,
        }).catch(function (err) {
          if (LogPilot.debug) console.warn('[LogPilot Delivery Failed]', err);
        });
      }
    },

    _bindGlobalErrorHandlers: function () {
      var self = this;

      // 1. Unhandled runtime errors
      window.addEventListener('error', function (event) {
        var msg = event.message || 'Script error';
        var file = event.filename || '';
        var line = event.lineno || 0;
        var col = event.colno || 0;
        var stack = event.error && event.error.stack ? event.error.stack : '';

        self.captureEvent({
          event_type: 'error',
          severity: 'ERROR',
          message: msg,
          source_file: file,
          line_number: line,
          col_number: col,
          stack_trace: stack,
          metadata: {
            type: 'uncaught_exception',
          },
        });
      });

      // 2. Unhandled promise rejections
      window.addEventListener('unhandledrejection', function (event) {
        var reason = event.reason || {};
        var msg = typeof reason === 'string' ? reason : (reason.message || 'Unhandled Promise Rejection');
        var stack = reason.stack || '';

        self.captureEvent({
          event_type: 'unhandled_rejection',
          severity: 'ERROR',
          message: 'Unhandled Promise Rejection: ' + msg,
          stack_trace: stack,
          metadata: {
            type: 'unhandled_rejection',
          },
        });
      });

      // 3. Console.error interceptor
      var originalConsoleError = console.error;
      console.error = function () {
        var args = Array.prototype.slice.call(arguments);
        try {
          var formatted = args.map(function (a) {
            if (typeof a === 'object') {
              try { return JSON.stringify(sanitize(a)); } catch (e) { return String(a); }
            }
            return String(a);
          }).join(' ');

          // Prevent infinite recursion if our own logger prints
          if (formatted.indexOf('[LogPilot') === -1) {
            self.captureEvent({
              event_type: 'console_error',
              severity: 'WARNING',
              message: formatted,
            });
          }
        } catch (e) {}
        originalConsoleError.apply(console, args);
      };
    },

    _bindNetworkInterceptors: function () {
      var self = this;

      // 1. Monkeypatch window.fetch
      if (typeof window.fetch === 'function') {
        var originalFetch = window.fetch;
        window.fetch = function () {
          var args = Array.prototype.slice.call(arguments);
          var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : 'unknown');
          var method = (args[1] && args[1].method ? args[1].method : 'GET').toUpperCase();
          var startTime = performance.now();

          // Don't intercept calls to LogPilot ingestion endpoint itself
          if (url.indexOf('/api/v1/websites/ingest') !== -1) {
            return originalFetch.apply(window, args);
          }

          return originalFetch.apply(window, args).then(function (response) {
            var duration = Math.round(performance.now() - startTime);
            if (!response.ok && response.status >= 400) {
              self.captureEvent({
                event_type: 'api_failure',
                severity: response.status >= 500 ? 'CRITICAL' : 'ERROR',
                message: 'HTTP ' + response.status + ' on ' + method + ' ' + url + ' (' + duration + 'ms)',
                url: url,
                metadata: {
                  status: response.status,
                  statusText: response.statusText,
                  method: method,
                  duration_ms: duration,
                },
              });
            }
            return response;
          }).catch(function (error) {
            var duration = Math.round(performance.now() - startTime);
            self.captureEvent({
              event_type: 'api_failure',
              severity: 'CRITICAL',
              message: 'Network Request Failed: ' + method + ' ' + url + ' (' + (error.message || 'Connection Refused') + ')',
              url: url,
              metadata: {
                error: error.message,
                method: method,
                duration_ms: duration,
              },
            });
            throw error;
          });
        };
      }

      // 2. Monkeypatch XMLHttpRequest
      if (typeof window.XMLHttpRequest === 'function') {
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
          this._logpilot_method = method;
          this._logpilot_url = url;
          this._logpilot_start = performance.now();
          return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function () {
          var xhr = this;
          if (xhr._logpilot_url && xhr._logpilot_url.indexOf('/api/v1/websites/ingest') === -1) {
            xhr.addEventListener('load', function () {
              if (xhr.status >= 400) {
                var duration = Math.round(performance.now() - xhr._logpilot_start);
                self.captureEvent({
                  event_type: 'api_failure',
                  severity: xhr.status >= 500 ? 'CRITICAL' : 'ERROR',
                  message: 'XHR ' + xhr.status + ' on ' + xhr._logpilot_method + ' ' + xhr._logpilot_url + ' (' + duration + 'ms)',
                  url: xhr._logpilot_url,
                  metadata: {
                    status: xhr.status,
                    method: xhr._logpilot_method,
                    duration_ms: duration,
                  },
                });
              }
            });
            xhr.addEventListener('error', function () {
              var duration = Math.round(performance.now() - xhr._logpilot_start);
              self.captureEvent({
                event_type: 'api_failure',
                severity: 'CRITICAL',
                message: 'XHR Network Error on ' + xhr._logpilot_method + ' ' + xhr._logpilot_url,
                url: xhr._logpilot_url,
                metadata: {
                  method: xhr._logpilot_method,
                  duration_ms: duration,
                },
              });
            });
          }
          return originalSend.apply(this, arguments);
        };
      }
    },

    _bindPerformanceCollector: function () {
      var self = this;
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('load', function () {
          setTimeout(function () {
            try {
              if (window.performance && window.performance.timing) {
                var t = window.performance.timing;
                var navStart = t.navigationStart;
                var ttfb = t.responseStart > navStart ? t.responseStart - navStart : 0;
                var domLoad = t.domContentLoadedEventEnd > navStart ? t.domContentLoadedEventEnd - navStart : 0;
                var totalLoad = t.loadEventEnd > navStart ? t.loadEventEnd - navStart : 0;

                self.captureEvent({
                  event_type: 'web_vital',
                  severity: 'INFO',
                  message: 'Navigation Performance Metrics [TTFB: ' + ttfb + 'ms, DOM: ' + domLoad + 'ms, Load: ' + totalLoad + 'ms]',
                  metadata: {
                    ttfb_ms: ttfb,
                    dom_ready_ms: domLoad,
                    total_load_ms: totalLoad,
                  },
                });
              }
            } catch (e) {}
          }, 500);
        });
      }
    },
  };

  // Auto-initialize if loaded via standard script tag
  if (typeof window !== 'undefined') {
    root.LogPilot = LogPilot;
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      LogPilot.init();
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        LogPilot.init();
      });
    }
  }

})(typeof window !== 'undefined' ? window : this);
