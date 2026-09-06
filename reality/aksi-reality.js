/**
 * AKSI Reality Layer v0.1
 * Turns browser/device observations into explicit, auditable RealityEvents.
 * No autonomous external actions. Capabilities are opt-in and revocable.
 * © AKSI
 */
(function (G) {
  "use strict";
  var VERSION = "0.1.0-reality";
  var CAP_KEY = "aksi_reality_capabilities_v1";
  var EVENT_KEY = "aksi_reality_events_v1";
  var DEFAULTS = { geolocation: false, camera: false, microphone: false, network: false };

  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function id() { return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
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
    return record({
      schema: "aksi-reality-event-1",
      id: id(), version: VERSION, kind: kind, source: source,
      ts: new Date().toISOString(), observation: observation,
      confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
      evidence: evidence || [], policy: "observe-only",
      authorization: { capability: source, granted: !!caps()[source] },
      action: null, result: null, parent_event: null, cryptographic_seal: null
    });
  }
  async function location() {
    if (!caps().geolocation) throw new Error("Geolocation capability is OFF");
    if (!G.navigator || !navigator.geolocation) throw new Error("Geolocation unavailable");
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(function (p) {
        resolve(baseEvent("observation", "geolocation", {
          latitude: p.coords.latitude, longitude: p.coords.longitude,
          accuracy_m: p.coords.accuracy
        }, p.coords.accuracy ? Math.max(0, Math.min(1, 1 / (1 + p.coords.accuracy / 50))) : 0.5,
        ["browser-geolocation", "user-permission"]));
      }, reject, { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 });
    });
  }
  async function requestMedia(kind) {
    var c = caps();
    if (!c[kind]) throw new Error(kind + " capability is OFF");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Media API unavailable");
    var constraints = kind === "camera" ? { video: true, audio: false } : { video: false, audio: true };
    var stream = await navigator.mediaDevices.getUserMedia(constraints);
    var event = baseEvent("capability-grant", kind, { tracks: stream.getTracks().map(function (t) { return t.kind; }) }, 1, ["browser-media-permission"]);
    stream.getTracks().forEach(function (t) { t.stop(); });
    return event;
  }
  function worldState() {
    return { schema: "aksi-world-state-1", ts: new Date().toISOString(), capabilities: caps(), event_count: listEvents().length, observe_only: true };
  }
  function status() { return { version: VERSION, capabilities: caps(), events: listEvents().length, observe_only: true, autonomous_actions: false }; }

  G.AKSI_REALITY = { version: VERSION, status: status, capabilities: caps, setCapability: setCapability, listEvents: listEvents, worldState: worldState, observeLocation: location, requestMedia: requestMedia };
})(typeof window !== "undefined" ? window : globalThis);
