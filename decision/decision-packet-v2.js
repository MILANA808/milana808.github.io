/**
 * AKSI DecisionPacket v2
 * Canonical, model-agnostic decision evidence container.
 * Cryptographic signatures prove integrity/authorship, not truth.
 */
(function (G) {
  "use strict";

  var VERSION = "2.0.0";
  var OMIT = { seal: 1, signature: 1 };

  function isPlain(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
  function canonical(x) {
    if (x === null || typeof x === "string" || typeof x === "number" || typeof x === "boolean") return JSON.stringify(x);
    if (Array.isArray(x)) return "[" + x.map(canonical).join(",") + "]";
    return "{" + Object.keys(x).filter(function (k) { return !OMIT[k] && x[k] !== undefined; }).sort().map(function (k) { return JSON.stringify(k) + ":" + canonical(x[k]); }).join(",") + "}";
  }
  function cloneWithoutSeal(packet) {
    var out = {};
    Object.keys(packet || {}).forEach(function (k) { if (!OMIT[k]) out[k] = packet[k]; });
    return out;
  }
  function make(input) {
    input = input || {};
    return {
      schema: "aksi.decision.packet",
      version: VERSION,
      id: input.id,
      created_at: input.created_at || new Date().toISOString(),
      request: input.request || { query: "" },
      candidates: Array.isArray(input.candidates) ? input.candidates : [],
      selected_decision: input.selected_decision || { answer: "", source: "unknown" },
      evaluation: input.evaluation || {},
      uncertainty: input.uncertainty == null ? null : Number(input.uncertainty),
      policy: input.policy || { name: "default", version: "1" },
      gate: input.gate || { ok: false },
      model_identity: input.model_identity || { type: "local-runtime", id: "aksi" },
      reality: input.reality || null,
      parent: input.parent || "genesis",
      trace: Array.isArray(input.trace) ? input.trace : [],
      claims: Array.isArray(input.claims) ? input.claims : [],
      outcome: input.outcome || null
    };
  }
  async function digest(packet) {
    if (!G.AKSI_CRYPTO || !G.AKSI_CRYPTO.sha256) throw new Error("AKSI_CRYPTO required");
    var h = await G.AKSI_CRYPTO.sha256(canonical(cloneWithoutSeal(packet)));
    return G.AKSI_CRYPTO.hex(h);
  }
  async function seal(packet) {
    if (!G.AKSI_CRYPTO || !G.AKSI_CRYPTO.sealJson) throw new Error("AKSI_CRYPTO required");
    var clean = cloneWithoutSeal(packet);
    var signed = await G.AKSI_CRYPTO.sealJson(clean);
    return Object.assign({}, clean, { seal: signed.seal });
  }
  async function verify(packet) {
    try {
      if (!packet || packet.schema !== "aksi.decision.packet") return { ok: false, reason: "invalid schema" };
      if (!packet.seal || !packet.seal.signature) return { ok: false, reason: "missing signature" };
      var expected = await digest(packet);
      var hashOk = expected === packet.seal.hash_sha256;
      if (!G.AKSI_CRYPTO || !G.AKSI_CRYPTO.publicPack) return { ok: false, reason: "crypto unavailable", hash_match: hashOk };
      var pub = await G.AKSI_CRYPTO.publicPack();
      var data = new TextEncoder().encode(canonical(cloneWithoutSeal(packet)));
      var sig = G.AKSI_CRYPTO.b64(packet.seal.signature);
      var key = null, sigOk = false;
      if (packet.seal.alg === "Ed25519" && pub.ed25519) {
        try { key = await crypto.subtle.importKey("raw", G.AKSI_CRYPTO.b64(pub.ed25519), { name: "Ed25519" }, false, ["verify"]); sigOk = await crypto.subtle.verify({ name: "Ed25519" }, key, sig, data); } catch (e) {}
      } else if (pub.ecdsa_p256) {
        try { key = await crypto.subtle.importKey("raw", G.AKSI_CRYPTO.b64(pub.ecdsa_p256), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]); sigOk = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, data); } catch (e2) {}
      }
      return { ok: !!(hashOk && sigOk), hash_match: hashOk, signature_match: !!sigOk, alg: packet.seal.alg, did: packet.seal.did };
    } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
  }
  G.AKSI_DECISION_PACKET = { version: VERSION, canonical: canonical, make: make, digest: digest, seal: seal, verify: verify };
})(typeof window !== "undefined" ? window : globalThis);
