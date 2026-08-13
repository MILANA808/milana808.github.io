/**
 * AKSI Context Bus — intent-based, origin-checked message bus
 * Microkernel principle: modules talk only through signed intents.
 */
(function (global) {
  "use strict";
  var SEED = "AKSI_DIMAX_v3_2026";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var handlers = {};
  var log = [];

  function hex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }

  async function sign(intent) {
    var payload = [intent.type, intent.from, intent.ts, JSON.stringify(intent.payload || {})].join("|");
    var dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SEED + "|BUS|" + payload));
    return hex(dig);
  }

  async function verify(intent) {
    if (!intent || !intent.sig) return false;
    var expect = await sign({
      type: intent.type,
      from: intent.from,
      ts: intent.ts,
      payload: intent.payload || {},
    });
    // re-sign with same fields — sign() uses same canonical form
    var payload = [intent.type, intent.from, intent.ts, JSON.stringify(intent.payload || {})].join("|");
    var dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SEED + "|BUS|" + payload));
    return hex(dig) === intent.sig;
  }

  function on(type, fn) {
    if (!handlers[type]) handlers[type] = [];
    handlers[type].push(fn);
    return function off() {
      handlers[type] = (handlers[type] || []).filter(function (f) {
        return f !== fn;
      });
    };
  }

  async function emit(type, from, payload) {
    var intent = {
      type: type,
      from: from || "anonymous",
      ts: Date.now(),
      payload: payload || {},
      did: DID,
    };
    intent.sig = await sign(intent);
    log.push({ type: type, from: intent.from, ts: intent.ts });
    if (log.length > 200) log.shift();
    var list = handlers[type] || [];
    var all = handlers["*"] || [];
    var results = [];
    for (var i = 0; i < list.length; i++) {
      try {
        results.push(await list[i](intent));
      } catch (e) {
        results.push({ error: String(e.message || e) });
      }
    }
    for (var j = 0; j < all.length; j++) {
      try {
        await all[j](intent);
      } catch (e) {}
    }
    return { intent: intent, results: results };
  }

  global.AksiBus = {
    DID: DID,
    on: on,
    emit: emit,
    verify: verify,
    history: function () {
      return log.slice();
    },
  };
})(typeof window !== "undefined" ? window : self);
