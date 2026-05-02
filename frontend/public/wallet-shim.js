// Wallet-extension compatibility shim. Runs before any extension or
// page code touches window.ethereum / window.solana / etc., so that:
//   1. Extensions that try to redefine an already-defined wallet
//      provider don't crash with "Cannot redefine property".
//   2. We can suppress noisy unhandled errors that come exclusively
//      from extension stacks — without masking real RPC errors from
//      the dApp itself.
//
// This file is loaded as an external script from /wallet-shim.js so
// the page CSP can keep `script-src 'self'` (no `'unsafe-inline'`).
// Loaded synchronously in <head> via app/layout.tsx so it runs before
// most extension content scripts get a chance to inject providers.
(function () {
  // Make window.ethereum writable/configurable so wallet extensions don't crash.
  try {
    var _eth = window.ethereum;
    try {
      delete window.ethereum;
    } catch (_e) {}
    Object.defineProperty(window, "ethereum", {
      get: function () {
        return _eth;
      },
      set: function (v) {
        _eth = v;
      },
      configurable: true,
      enumerable: true,
    });
  } catch (_e) {
    // If we can't make it configurable, fall through to error suppression.
  }

  // Pre-define common wallet globals as configurable so the same
  // "Cannot redefine property" issue doesn't trip on non-EVM wallets.
  ["solana", "phantom", "keplr", "tronLink", "unisat", "tonkeeper"].forEach(
    function (k) {
      try {
        var d = Object.getOwnPropertyDescriptor(window, k);
        if (!d || d.configurable) return;
        var v = window[k];
        try {
          delete window[k];
        } catch (_e) {}
        Object.defineProperty(window, k, {
          get: function () {
            return v;
          },
          set: function (nv) {
            v = nv;
          },
          configurable: true,
          enumerable: true,
        });
      } catch (_e) {}
    },
  );

  // Suppress unhandled errors that bubble up from wallet browser
  // extensions. The check is anchored on extension origins so that
  // real RPC failures from dApp code still surface.
  function _isExtStack(stack) {
    return (
      stack.indexOf("chrome-extension://") !== -1 ||
      stack.indexOf("moz-extension://") !== -1 ||
      stack.indexOf("safari-extension://") !== -1 ||
      stack.indexOf("safari-web-extension://") !== -1 ||
      stack.indexOf("inapp.js") !== -1 ||
      stack.indexOf("evmAsk.js") !== -1
    );
  }
  function _isExtErr(msg, stack) {
    if (_isExtStack(stack)) return true;
    return (
      msg.indexOf("Cannot redefine property: ethereum") !== -1 ||
      msg.indexOf("Cannot redefine property: 'ethereum'") !== -1
    );
  }

  // Capture phase listeners — highest priority so we can stop
  // propagation before Next.js's dev overlay subscribes.
  window.addEventListener(
    "unhandledrejection",
    function (e) {
      var msg = (e.reason && (e.reason.message || String(e.reason))) || "";
      var stack = (e.reason && e.reason.stack) || "";
      if (_isExtErr(msg, stack)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  window.addEventListener(
    "error",
    function (e) {
      var stack = (e.error && e.error.stack) || "";
      var msg = (e.error && e.error.message) || e.message || "";
      if (_isExtErr(msg, stack)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return true;
      }
    },
    true,
  );

  // Override window.onerror / onunhandledrejection used by Next.js dev overlay.
  var _origOnErr = window.onerror;
  window.onerror = function (msg, src, line, col, err) {
    var m = (err && err.message) || msg || "";
    var s = (err && err.stack) || src || "";
    if (_isExtErr(String(m), String(s))) return true;
    return _origOnErr ? _origOnErr.apply(this, arguments) : false;
  };
  var _origOnRej = window.onunhandledrejection;
  window.onunhandledrejection = function (e) {
    var msg = (e.reason && (e.reason.message || String(e.reason))) || "";
    var stack = (e.reason && e.reason.stack) || "";
    if (_isExtErr(msg, stack)) {
      e.preventDefault();
      return;
    }
    if (_origOnRej) return _origOnRej.apply(this, arguments);
  };
})();
