/**
 * AKSI P2P SDP — manual signaling + embedding exchange
 * Offer → copy SDP → peer Answer → exchange embeddings JSON.
 */
(function (G) {
  "use strict";
  var pc = null;
  var channel = null;
  var logFn = function () {};

  function setLog(fn) { logFn = typeof fn === "function" ? fn : function () {}; }
  function log(msg) { try { logFn(String(msg)); } catch (e) {} }

  function embeddingFromText(text) {
    var dim = 64, vec = new Array(dim).fill(0);
    var s = String(text || "").toLowerCase();
    for (var i = 0; i < s.length; i++) {
      var h = (s.charCodeAt(i) * 31 + i * 17) % dim;
      vec[h] += 1;
    }
    var n = Math.sqrt(vec.reduce(function (a, b) { return a + b * b; }, 0)) || 1;
    return vec.map(function (x) { return Math.round((x / n) * 1000) / 1000; });
  }

  function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
    }
    return dot / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1));
  }

  function ensurePC() {
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.oniceconnectionstatechange = function () { log("ice: " + pc.iceConnectionState); };
    pc.onconnectionstatechange = function () { log("pc: " + pc.connectionState); };
    return pc;
  }

  function bindChannel(ch) {
    channel = ch;
    ch.onopen = function () { log("channel open"); };
    ch.onclose = function () { log("channel close"); };
    ch.onmessage = function (ev) {
      try {
        var data = JSON.parse(ev.data);
        if (data.type === "embedding" && G.AKSI_P2P_ON_EMBED) G.AKSI_P2P_ON_EMBED(data);
        log("msg type=" + (data.type || "?"));
      } catch (e) { log("msg raw"); }
    };
  }

  async function createOffer() {
    var p = ensurePC();
    bindChannel(p.createDataChannel("aksi"));
    var offer = await p.createOffer();
    await p.setLocalDescription(offer);
    await waitIce();
    var sdp = JSON.stringify(p.localDescription);
    log("offer ready · " + sdp.length + " chars");
    return sdp;
  }

  function waitIce() {
    return new Promise(function (resolve) {
      if (!pc) return resolve();
      if (pc.iceGatheringState === "complete") return resolve();
      var t = setTimeout(resolve, 2500);
      pc.onicegatheringstatechange = function () {
        if (pc.iceGatheringState === "complete") { clearTimeout(t); resolve(); }
      };
    });
  }

  async function acceptRemote(sdpJson) {
    var p = ensurePC();
    var desc = typeof sdpJson === "string" ? JSON.parse(sdpJson) : sdpJson;
    if (desc.type === "offer") {
      p.ondatachannel = function (ev) { bindChannel(ev.channel); };
      await p.setRemoteDescription(desc);
      var answer = await p.createAnswer();
      await p.setLocalDescription(answer);
      await waitIce();
      var out = JSON.stringify(p.localDescription);
      log("answer ready · " + out.length + " chars");
      return out;
    }
    await p.setRemoteDescription(desc);
    log("remote answer set");
    return null;
  }

  function sendEmbedding(text, meta) {
    var msg = {
      type: "embedding",
      vec: embeddingFromText(text),
      textHash: String(text || "").length,
      meta: meta || {},
      ts: Date.now()
    };
    var raw = JSON.stringify(msg);
    if (channel && channel.readyState === "open") {
      channel.send(raw);
      log("sent embedding dim=" + msg.vec.length);
    } else {
      log("channel not open — copy embedding JSON manually");
    }
    return msg;
  }

  function reset() {
    try { if (channel) channel.close(); } catch (e) {}
    try { if (pc) pc.close(); } catch (e2) {}
    pc = null; channel = null;
    log("reset");
  }

  var sdpAPI = {
    createOffer: createOffer,
    acceptRemote: acceptRemote,
    sendEmbedding: sendEmbedding,
    embeddingFromText: embeddingFromText,
    cosine: cosine,
    reset: reset,
    setLog: setLog,
    status: function () {
      return {
        pc: pc ? pc.connectionState : "none",
        channel: channel ? channel.readyState : "none",
        mode: "sdp-manual"
      };
    }
  };
  G.AKSI_P2P = sdpAPI;
})(typeof window !== "undefined" ? window : globalThis);
