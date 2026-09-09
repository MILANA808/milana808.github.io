/**
 * AKSI Reality Layer v0.2 — same as /aksi-reality.js
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "0.2.0-reality";
  var CAP_KEY = "aksi_reality_capabilities_v1";
  var EVENT_KEY = "aksi_reality_events_v1";
  var DEFAULTS = { geolocation: false, camera: false, microphone: false, network: false };
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function id() { return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fnv(s) {
    var h = 2166136261 >>> 0; s = String(s || "");
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ("00000000" + h.toString(16)).slice(-8);
  }
  function caps() { return Object.assign({}, DEFAULTS, load(CAP_KEY, {})); }
  function setCapability(name, enabled) {
    if (!(name in DEFAULTS)) throw new Error("Unknown capability: " + name);
    var c = caps(); c[name] = !!enabled; save(CAP_KEY, c); return c;
  }
  function listEvents() { return load(EVENT_KEY, []); }
  function record(event) {
    var all = listEvents(); all.push(event); save(EVENT_KEY, all.slice(-200)); return event;
  }
  function baseEvent(kind, source, observation, confidence, evidence) {
    var event = {
      schema: "aksi-reality-event-1", id: id(), version: VERSION, kind: kind, source: source,
      ts: new Date().toISOString(), observation: observation,
      confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
      evidence: evidence || [], policy: "observe-only",
      authorization: { capability: source, granted: !!caps()[source] },
      action: null, result: null, parent_event: null, cryptographic_seal: null
    };
    event.cryptographic_seal = { kind: "fnv", fnv: fnv(JSON.stringify({ id: event.id, kind: event.kind, source: event.source, observation: event.observation, ts: event.ts })), t: Date.now() };
    return record(event);
  }
  async function location() {
    if (!caps().geolocation) throw new Error("Geolocation capability is OFF");
    if (!G.navigator || !navigator.geolocation) throw new Error("Geolocation unavailable");
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(function (p) {
        resolve(baseEvent("observation", "geolocation", {
          latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy_m: p.coords.accuracy
        }, p.coords.accuracy ? Math.max(0, Math.min(1, 1 / (1 + p.coords.accuracy / 50))) : 0.5, ["browser-geolocation", "user-permission"]));
      }, function (err) { reject(new Error(err.message || "geolocation failed")); },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 });
    });
  }
  async function requestMedia(kind) {
    if (!caps()[kind]) throw new Error(kind + " capability is OFF");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Media API unavailable");
    var constraints = kind === "camera" ? { video: true, audio: false } : { video: false, audio: true };
    var stream = await navigator.mediaDevices.getUserMedia(constraints);
    var event = baseEvent("capability-grant", kind, { tracks: stream.getTracks().map(function (t) { return t.kind; }) }, 1, ["browser-media-permission"]);
    stream.getTracks().forEach(function (t) { t.stop(); });
    return event;
  }
  async function networkProbe() {
    if (!caps().network) throw new Error("Network capability is OFF");
    var online = typeof navigator !== "undefined" ? !!navigator.onLine : false;
    var t0 = Date.now(), ok = false;
    try { var res = await fetch("/", { method: "HEAD", cache: "no-store" }); ok = !!res; } catch (e) { ok = false; }
    return baseEvent("observation", "network", { online: online, head_ok: ok, rtt_ms: Date.now() - t0 }, online ? 0.8 : 0.3, ["navigator.onLine", "fetch-head"]);
  }
  function worldState() {
    return { schema: "aksi-world-state-1", ts: new Date().toISOString(), capabilities: caps(), event_count: listEvents().length, observe_only: true, last_events: listEvents().slice(-5) };
  }
  function status() {
    return { version: VERSION, capabilities: caps(), events: listEvents().length, observe_only: true, autonomous_actions: false };
  }
  function enrichDecision(decision) {
    decision = decision || {};
    var ev = listEvents().slice(-3);
    decision.reality = {
      observe_only: true, event_count: listEvents().length, capabilities: caps(),
      recent: ev.map(function (e) { return { id: e.id, kind: e.kind, source: e.source, confidence: e.confidence, seal: e.cryptographic_seal }; })
    };
    return decision;
  }
  G.AKSI_REALITY = {
    version: VERSION, status: status, capabilities: caps, setCapability: setCapability, listEvents: listEvents,
    worldState: worldState, observeLocation: location, requestMedia: requestMedia, networkProbe: networkProbe, enrichDecision: enrichDecision
  };
})(typeof window !== "undefined" ? window : globalThis);
