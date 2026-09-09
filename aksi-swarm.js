/**
 * AKSI Swarm v1 — browser P2P thought-snapshot exchange
 * Manual SDP only (no signaling server). WebRTC DataChannel.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-swarm";
  var pc = null;
  var channel = null;
  var onMessage = null;
  var onLog = null;

  function log(m) {
    try { if (onLog) onLog(String(m)); } catch (e) {}
    try { console.log("[AKSI Swarm]", m); } catch (e) {}
  }

  function snapshotFromText(text) {
    text = String(text || "").trim();
    var dim = 32;
    var v = new Float32Array(dim);
    var toks = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(function (t) { return t.length > 1; });
    if (!toks.length) toks = ["∅"];
    for (var i = 0; i < toks.length; i++) {
      var h = 2166136261;
      for (var j = 0; j < toks[i].length; j++) {
        h ^= toks[i].charCodeAt(j);
        h = Math.imul(h, 16777619);
      }
      var idx = (h >>> 0) % dim;
      v[idx] += 1;
      v[(idx + 3) % dim] += 0.25;
    }
    var norm = 0;
    for (var k = 0; k < dim; k++) norm += v[k] * v[k];
    norm = Math.sqrt(norm) || 1;
    for (k = 0; k < dim; k++) v[k] /= norm;
    return { kind: "aksi-thought-snap", v: VER, text: text.slice(0, 500), emb: Array.from(v), t: Date.now() };
  }

  function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function ensurePC() {
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = function (e) { if (!e.candidate) log("ICE gathering complete"); };
    pc.onconnectionstatechange = function () { log("connection: " + pc.connectionState); };
    pc.ondatachannel = function (e) { channel = e.channel; bindChannel(channel); log("incoming datachannel"); };
    return pc;
  }

  function bindChannel(ch) {
    ch.onopen = function () { log("channel open"); };
    ch.onclose = function () { log("channel closed"); };
    ch.onmessage = function (ev) {
      var data = ev.data;
      try {
        var obj = JSON.parse(data);
        if (onMessage) onMessage(obj);
        log("recv snap: " + (obj.text || "").slice(0, 80));
      } catch (e) {
        if (onMessage) onMessage({ text: String(data), raw: true });
      }
    };
  }

  async function createOffer() {
    ensurePC();
    channel = pc.createDataChannel("aksi-swarm");
    bindChannel(channel);
    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIce();
    return JSON.stringify(pc.localDescription);
  }

  async function acceptOffer(offerSDP) {
    ensurePC();
    var desc = typeof offerSDP === "string" ? JSON.parse(offerSDP) : offerSDP;
    await pc.setRemoteDescription(desc);
    var answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitIce();
    return JSON.stringify(pc.localDescription);
  }

  async function acceptAnswer(answerSDP) {
    ensurePC();
    var desc = typeof answerSDP === "string" ? JSON.parse(answerSDP) : answerSDP;
    await pc.setRemoteDescription(desc);
    log("answer applied");
    return { ok: true };
  }

  function waitIce() {
    return new Promise(function (resolve) {
      if (pc.iceGatheringState === "complete") return resolve();
      var t = setTimeout(resolve, 2500);
      pc.onicegatheringstatechange = function () {
        if (pc.iceGatheringState === "complete") { clearTimeout(t); resolve(); }
      };
    });
  }

  function sendThought(text) {
    var snap = snapshotFromText(text);
    if (!channel || channel.readyState !== "open") {
      return { ok: false, error: "channel not open", snap: snap };
    }
    channel.send(JSON.stringify(snap));
    return { ok: true, snap: snap };
  }

  function status() {
    return { version: VER, connection: pc ? pc.connectionState : "none", channel: channel ? channel.readyState : "none", ice: pc ? pc.iceGatheringState : "none" };
  }

  function reset() {
    try { if (channel) channel.close(); } catch (e) {}
    try { if (pc) pc.close(); } catch (e) {}
    pc = null; channel = null; log("reset");
  }

  G.AKSI_SWARM = {
    version: VER,
    createOffer: createOffer,
    acceptOffer: acceptOffer,
    acceptAnswer: acceptAnswer,
    sendThought: sendThought,
    snapshot: snapshotFromText,
    cosine: cosine,
    status: status,
    reset: reset,
    onMessage: function (fn) { onMessage = fn; },
    onLog: function (fn) { onLog = fn; }
  };
})(typeof window !== "undefined" ? window : globalThis);
