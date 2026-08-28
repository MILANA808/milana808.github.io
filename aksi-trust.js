/**
 * AKSI Trust Compiler v1 · MVP
 * verify_response · ECDSA attestation · Self-Adaptive Chain · QRNG Bell · self-obsolescence
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (global) {
  "use strict";
  var VER = "1.0.0-trust";
  var CHAIN_KEY = "aksi:trust:chain:v1";
  var STATE_KEY = "aksi:trust:state:v1";
  var POLICY_KEY = "aksi:trust:policy:v1";
  var DEFAULT_POLICY = {
    maxClaimsWithoutSource: 3,
    blockPatterns: [/ignore previous instructions/i, /jailbreak/i, /exfiltrat/i, /\b(api[_-]?key|secret[_-]?key)\s*[:=]\s*\S+/i, /\bsk-[a-zA-Z0-9]{20,}/],
    harmPatterns: [/\bhow to (make|build) (a )?bomb\b/i, /\bchild sexual\b/i],
    contradictionHints: [["always", "never"], ["безопасн", "опасн"], ["доказано", "неизвестно"]],
    selfObsolescenceThreshold: 5,
  };

  function loadJSON(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? fb : v; } catch (e) { return fb; }
  }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function b64(buf) {
    var u = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf, s = "";
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function hex(u8) { return Array.from(u8).map(function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }
  async function sha256(data) {
    var buf = typeof data === "string" ? utf8(data) : data;
    return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  }
  async function sha256Hex(data) { return hex(await sha256(data)); }
  function policy() { return Object.assign({}, DEFAULT_POLICY, loadJSON(POLICY_KEY, {})); }
  function state() {
    return Object.assign({ safeMode: false, anomalyCount: 0, lastAnomaly: null, obsolescenceTriggered: false, reason: null }, loadJSON(STATE_KEY, {}));
  }
  function setState(patch) { var s = Object.assign(state(), patch); saveJSON(STATE_KEY, s); return s; }

  function qrngBytes(n) { var u = new Uint8Array(n); crypto.getRandomValues(u); return u; }
  function bellTest(samples) {
    samples = samples || 2048;
    var buf = qrngBytes(samples), same = 0, pairs = 0;
    for (var i = 0; i + 1 < buf.length; i += 2) { if ((buf[i] & 1) === (buf[i + 1] & 1)) same++; pairs++; }
    var corr = pairs ? same / pairs : 0.5;
    return { ok: corr > 0.35 && corr < 0.65, correlation: Math.round(corr * 1000) / 1000, samples: pairs, source: "CSPRNG·Bell-stat" };
  }
  async function generateKeyMaterial() {
    var bell = bellTest(4096);
    var raw = qrngBytes(32);
    var h = await sha256(raw);
    return { keyId: hex(h).slice(0, 16), materialB64: b64(raw), bell: bell, alg: "AKSI-Q-hybrid-v1" };
  }

  function chain() { var c = loadJSON(CHAIN_KEY, []); return Array.isArray(c) ? c : []; }
  async function appendChain(entry) {
    var c = chain();
    var prev = c.length ? c[c.length - 1].hash : "GENESIS";
    var body = { i: c.length, ts: Date.now(), epoch: Math.floor(Date.now() / 60000), kind: entry.kind || "event", payload: entry.payload, meta: entry.meta || {}, prev: prev, domain: "AKSI-SAC/1" };
    body.hash = await sha256Hex(JSON.stringify(body));
    c.push(body);
    if (c.length > 500) c = c.slice(-500);
    saveJSON(CHAIN_KEY, c);
    return body;
  }
  async function verifyChain() {
    var c = chain();
    for (var i = 0; i < c.length; i++) {
      var row = Object.assign({}, c[i]); var h = row.hash; delete row.hash;
      if ((await sha256Hex(JSON.stringify(row))) !== h) return { ok: false, at: i, reason: "hash mismatch" };
      if (i && c[i].prev !== c[i - 1].hash) return { ok: false, at: i, reason: "prev broken" };
    }
    return { ok: true, length: c.length };
  }

  function extractClaims(text) {
    return String(text || "").split(/(?<=[.!?…])\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 20; }).slice(0, 12);
  }
  function scoreResponse(prompt, response) {
    var pol = policy(), text = String(response || ""), issues = [], score = 1;
    pol.blockPatterns.forEach(function (re) {
      if (re.test(text) || re.test(String(prompt || ""))) { issues.push({ severity: "high", code: "policy_block" }); score -= 0.4; }
    });
    pol.harmPatterns.forEach(function (re) {
      if (re.test(text)) { issues.push({ severity: "critical", code: "harm" }); score -= 0.6; }
    });
    if (text.trim().length < 8) { issues.push({ severity: "med", code: "too_short" }); score -= 0.2; }
    var low = text.toLowerCase();
    pol.contradictionHints.forEach(function (pair) {
      if (low.indexOf(pair[0]) >= 0 && low.indexOf(pair[1]) >= 0) {
        issues.push({ severity: "med", code: "possible_contradiction", detail: pair[0] + " vs " + pair[1] });
        score -= 0.1;
      }
    });
    var abs = (text.match(/\b(всегда|never|гарантированно|100%)\b/gi) || []).length;
    if (abs >= 3) { issues.push({ severity: "low", code: "overconfidence" }); score -= 0.08; }
    var claims = extractClaims(text);
    if (claims.length > pol.maxClaimsWithoutSource) { issues.push({ severity: "low", code: "many_claims" }); score -= 0.05; }
    score = Math.max(0, Math.min(1, score));
    var trust = score >= 0.85 ? "high" : score >= 0.55 ? "medium" : score >= 0.3 ? "low" : "reject";
    return { score: Math.round(score * 1000) / 1000, trust: trust, issues: issues, claims: claims.length, policyVersion: 1 };
  }

  var attestKeys = null;
  async function ensureAttestKeys() {
    if (attestKeys) return attestKeys;
    var stored = loadJSON("aksi:trust:attest:jwk", null);
    if (stored) {
      attestKeys = {
        privateKey: await crypto.subtle.importKey("jwk", stored.priv, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
        publicKey: await crypto.subtle.importKey("jwk", stored.pub, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]),
        pubJwk: stored.pub,
      };
      return attestKeys;
    }
    var kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    var priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
    var pub = await crypto.subtle.exportKey("jwk", kp.publicKey);
    saveJSON("aksi:trust:attest:jwk", { priv: priv, pub: pub });
    attestKeys = { privateKey: kp.privateKey, publicKey: kp.publicKey, pubJwk: pub };
    return attestKeys;
  }
  async function signAttestation(obj) {
    var keys = await ensureAttestKeys();
    var sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.privateKey, utf8(JSON.stringify(obj))));
    return { alg: "ECDSA-P256-SHA256", sig: b64(sig), pub: keys.pubJwk };
  }

  function recordAnomaly(reason, detail) {
    var s = state(), n = (s.anomalyCount || 0) + 1, pol = policy();
    var patch = { anomalyCount: n, lastAnomaly: { reason: reason, detail: detail, ts: Date.now() } };
    if (n >= pol.selfObsolescenceThreshold) { patch.safeMode = true; patch.obsolescenceTriggered = true; patch.reason = reason; }
    setState(patch);
    return state();
  }
  function resetSafeMode() {
    return setState({ safeMode: false, anomalyCount: 0, obsolescenceTriggered: false, reason: null });
  }

  async function verifyResponse(prompt, response, opts) {
    opts = opts || {};
    var st = state();
    if (st.safeMode && !opts.force) {
      return { ok: false, trust: "reject", safeMode: true, reason: st.reason || "self-obsolescence", message: "Safe-mode АКСИ" };
    }
    var analysis = scoreResponse(prompt, response);
    var body = {
      promptHash: await sha256Hex(String(prompt || "").slice(0, 2000)),
      responseHash: await sha256Hex(String(response || "").slice(0, 8000)),
      analysis: analysis, ts: Date.now(), engine: VER,
    };
    var attestation = await signAttestation({ promptHash: body.promptHash, responseHash: body.responseHash, score: analysis.score, trust: analysis.trust, ts: body.ts });
    var chainRow = await appendChain({
      kind: "llm_verify",
      payload: { trust: analysis.trust, score: analysis.score, issues: analysis.issues.length, promptHash: body.promptHash.slice(0, 16), responseHash: body.responseHash.slice(0, 16) },
      meta: { source: opts.source || "chat" },
    });
    if (analysis.trust === "reject" || analysis.issues.some(function (x) { return x.severity === "critical"; })) {
      recordAnomaly("trust_reject", analysis.issues[0] && analysis.issues[0].code);
    }
    return {
      ok: analysis.trust !== "reject", trust: analysis.trust, score: analysis.score, issues: analysis.issues,
      claims: analysis.claims, attestation: attestation, chainHash: chainRow.hash, chainIndex: chainRow.i,
      safeMode: state().safeMode, verifiedAt: body.ts,
    };
  }

  function auditExport() {
    return { protocol: "AKSI-Trust/1", version: VER, state: state(), chain: chain(), verifiedAt: Date.now() };
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>Trust Compiler · v' + VER + '</h2>' +
      '<p class="muted">verify_response · attestation · SAC chain · self-obsolescence</p>' +
      '<pre id="trSt" class="out">…</pre>' +
      '<textarea id="trPrompt" placeholder="Промпт" style="margin-top:8px;min-height:48px"></textarea>' +
      '<textarea id="trResp" placeholder="Ответ LLM" style="margin-top:8px;min-height:72px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="trVerify">verify_response</button>' +
      '<button type="button" class="btn" id="trChain">Аудит chain</button>' +
      '<button type="button" class="btn" id="trBell">QRNG Bell</button>' +
      '<button type="button" class="btn" id="trReset">Сброс safe-mode</button></div>' +
      '<pre id="trOut" class="out" style="margin-top:10px;max-height:280px">—</pre></div>';
    function show(x) { var el = document.getElementById("trOut"); if (el) el.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2); }
    function refresh() {
      var el = document.getElementById("trSt");
      if (el) el.textContent = JSON.stringify({ state: state(), chainLen: chain().length }, null, 2);
    }
    refresh();
    document.getElementById("trVerify").onclick = function () {
      verifyResponse(document.getElementById("trPrompt").value, document.getElementById("trResp").value, { source: "ui" }).then(function (r) { show(r); refresh(); });
    };
    document.getElementById("trChain").onclick = function () { verifyChain().then(function (v) { show({ verify: v, tail: chain().slice(-5) }); }); };
    document.getElementById("trBell").onclick = function () { generateKeyMaterial().then(show); };
    document.getElementById("trReset").onclick = function () { show(resetSafeMode()); refresh(); };
  }

  global.AKSI_TRUST = {
    version: VER, verifyResponse: verifyResponse, verify_response: verifyResponse,
    generateKey: generateKeyMaterial, generate_key: generateKeyMaterial,
    auditChain: auditExport, audit_chain: auditExport, verifyChain: verifyChain,
    bellTest: bellTest, state: state, resetSafeMode: resetSafeMode, recordAnomaly: recordAnomaly,
    appendChain: appendChain, mount: mount, policy: policy,
  };
})(typeof window !== "undefined" ? window : this);
