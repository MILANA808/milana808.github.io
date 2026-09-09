/**
 * AKSI Reality Layer v0.3.1 — tamper-evident observe-only evidence.
 * Browser observations are opt-in; this layer never executes autonomous actions.
 * SHA-256 seals are integrity evidence, not proof that an observation is true.
 */
(function (G) {
  "use strict";
  var VERSION = "0.3.1-reality";
  var CAP_KEY = "aksi_reality_capabilities_v1";
  var EVENT_KEY = "aksi_reality_events_v2";
  var DEFAULTS = { geolocation: false, camera: false, microphone: false, network: false };
  function load(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function id() { return G.crypto && G.crypto.randomUUID ? "r-" + G.crypto.randomUUID() : "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10); }
  function caps() { return Object.assign({}, DEFAULTS, load(CAP_KEY, {})); }
  function setCapability(name, enabled) { if (!(name in DEFAULTS)) throw new Error("Unknown capability: " + name); var c = caps(); c[name] = !!enabled; save(CAP_KEY, c); return c; }
  function listEvents() { return load(EVENT_KEY, []); }
  function canonical(v) { if (v === null || typeof v !== "object") return JSON.stringify(v); if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]"; return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + canonical(v[k]); }).join(",") + "}"; }
  async function sha256(text) { if (!G.crypto || !G.crypto.subtle || !G.TextEncoder) throw new Error("Web Crypto SHA-256 unavailable"); var d = await G.crypto.subtle.digest("SHA-256", new G.TextEncoder().encode(String(text))); return Array.prototype.map.call(new Uint8Array(d), function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
  async function record(event) { var all = listEvents(); all.push(event); save(EVENT_KEY, all.slice(-200)); return event; }
  async function baseEvent(kind, source, observation, confidence, evidence) {
    var all = listEvents(), prev = all.length ? all[all.length - 1].cryptographic_seal : null;
    var event = { schema: "aksi-reality-event-2", id: id(), version: VERSION, kind: kind, source: source, ts: new Date().toISOString(), observation: observation, confidence: Math.max(0, Math.min(1, Number(confidence) || 0)), evidence: Array.isArray(evidence) ? evidence.slice() : [], policy: "observe-only", authorization: { capability: source, granted: !!caps()[source] }, action: null, result: null, parent_event: all.length ? all[all.length - 1].id : null, cryptographic_seal: null };
    var payload = { schema: event.schema, id: event.id, version: event.version, kind: event.kind, source: event.source, ts: event.ts, observation: event.observation, confidence: event.confidence, evidence: event.evidence, policy: event.policy, authorization: event.authorization, action: event.action, result: event.result, parent_event: event.parent_event, previous_seal: prev };
    event.cryptographic_seal = { algorithm: "SHA-256", hash: await sha256(canonical(payload)), previous: prev, t: Date.now() };
    return record(event);
  }
  async function verifyEvents() {
    var all = listEvents(), previous = null, checked = 0;
    for (var i = 0; i < all.length; i++) {
      var e = all[i], seal = e && e.cryptographic_seal;
      if (!e || !seal || seal.algorithm !== "SHA-256" || seal.previous !== previous) return { ok: false, checked: checked, index: i, reason: "chain/link mismatch" };
      var payload = { schema: e.schema, id: e.id, version: e.version, kind: e.kind, source: e.source, ts: e.ts, observation: e.observation, confidence: e.confidence, evidence: e.evidence, policy: e.policy, authorization: e.authorization, action: e.action, result: e.result, parent_event: e.parent_event, previous_seal: seal.previous };
      if (await sha256(canonical(payload)) !== seal.hash) return { ok: false, checked: checked, index: i, reason: "hash mismatch" };
      previous = seal.hash; checked++;
    }
    return { ok: true, checked: checked };
  }
  async function location() { if (!caps().geolocation) throw new Error("Geolocation capability is OFF"); if (!G.navigator || !G.navigator.geolocation) throw new Error("Geolocation unavailable"); return new Promise(function (resolve, reject) { G.navigator.geolocation.getCurrentPosition(async function (p) { try { resolve(await baseEvent("observation", "geolocation", { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy_m: p.coords.accuracy }, p.coords.accuracy ? Math.max(0, Math.min(1, 1 / (1 + p.coords.accuracy / 50))) : 0.5, ["browser-geolocation", "user-permission"])); } catch (e) { reject(e); } }, function (err) { reject(new Error(err.message || "geolocation failed")); }, { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }); }); }
  async function requestMedia(kind) { var c = caps(); if (!c[kind]) throw new Error(kind + " capability is OFF"); if (!G.navigator || !G.navigator.mediaDevices || !G.navigator.mediaDevices.getUserMedia) throw new Error("Media API unavailable"); var constraints = kind === "camera" ? { video: true, audio: false } : { video: false, audio: true }; var stream = await G.navigator.mediaDevices.getUserMedia(constraints); try { return await baseEvent("capability-grant", kind, { tracks: stream.getTracks().map(function (t) { return t.kind; }) }, 1, ["browser-media-permission"]); } finally { stream.getTracks().forEach(function (t) { t.stop(); }); } }
  async function networkProbe() { if (!caps().network) throw new Error("Network capability is OFF"); var online = typeof G.navigator !== "undefined" ? !!G.navigator.onLine : false, t0 = Date.now(), ok = false; try { ok = !!(await fetch("/", { method: "HEAD", cache: "no-store", signal: G.AbortSignal && G.AbortSignal.timeout ? G.AbortSignal.timeout(5000) : undefined })); } catch (e) { ok = false; } return baseEvent("observation", "network", { online: online, head_ok: ok, rtt_ms: Date.now() - t0 }, online ? 0.8 : 0.3, ["navigator.onLine", "fetch-head"]); }
  function worldState() { return { schema: "aksi-world-state-2", ts: new Date().toISOString(), capabilities: caps(), event_count: listEvents().length, observe_only: true, last_events: listEvents().slice(-5) }; }
  function status() { return { version: VERSION, capabilities: caps(), events: listEvents().length, observe_only: true, autonomous_actions: false }; }
  function enrichDecision(decision) { decision = decision || {}; decision.reality = { observe_only: true, event_count: listEvents().length, capabilities: caps(), recent: listEvents().slice(-3).map(function (e) { return { id: e.id, kind: e.kind, source: e.source, confidence: e.confidence, seal: e.cryptographic_seal }; }) }; return decision; }
  G.AKSI_REALITY = { version: VERSION, status: status, capabilities: caps, setCapability: setCapability, listEvents: listEvents, verifyEvents: verifyEvents, worldState: worldState, observeLocation: location, requestMedia: requestMedia, networkProbe: networkProbe, enrichDecision: enrichDecision };
})(typeof window !== "undefined" ? window : globalThis);
