(function () {
  "use strict";
  var S = { entropy: null, bits: null, purity: null, eqs: null, eqsDetail: null, lastGate: null, did: null, chain: [], phase: 0 };
  var listeners = {};
  function on(ev, fn) { (listeners[ev] || (listeners[ev] = [])).push(fn); }
  function emit(ev, data) {
    S.chain.push({ t: Date.now(), ev: ev, data: data || null });
    if (S.chain.length > 40) S.chain = S.chain.slice(-40);
    (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) {} });
    paintShared(); paintChain();
  }
  function paintShared() {
    var el = document.getElementById("sharedBox");
    if (el) el.textContent = "H=" + (S.entropy == null ? "—" : S.entropy.toFixed(3)) + " · bits=" + (S.bits || "—") + " · EQS=" + (S.eqs == null ? "—" : S.eqs) + " · gate=" + (S.lastGate || "—") + " · links=" + S.chain.length;
    var qe = document.getElementById("qEnt"); var el2 = document.getElementById("eqsLive"); var g = document.getElementById("gateLive");
    if (qe) qe.textContent = "H=" + (S.entropy == null ? "—" : S.entropy.toFixed(2));
    if (el2) el2.textContent = "EQS=" + (S.eqs == null ? "—" : S.eqs);
    if (g) g.textContent = "gate=" + (S.lastGate || "—");
  }
  function paintChain() {
    var el = document.getElementById("chainLog");
    if (!el) return;
    el.textContent = S.chain.slice(-12).map(function (c) { return c.ev + (c.data && c.data.note ? " · " + c.data.note : ""); }).join("\n") || "цепочка пуста — «Связать всё» или Квант";
  }
  function go(name) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("on", p.getAttribute("data-p") === name); });
    document.querySelectorAll(".bnav button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-go") === name); });
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
    window.scrollTo(0, 0);
    if (name === "world") requestAnimationFrame(worldFrame);
  }
  document.querySelectorAll(".bnav button").forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-go")); }); });
  document.querySelectorAll("[data-jump]").forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-jump")); }); });
  var hash = (location.hash || "").replace("#", "");
  if (hash && document.querySelector('[data-p="' + hash + '"]')) go(hash);
  function tick() {
    try { document.getElementById("msk").textContent = new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " МСК"; }
    catch (e) { document.getElementById("msk").textContent = new Date().toLocaleTimeString("ru-RU"); }
  }
  tick(); setInterval(tick, 1000);
  var NQ = 4, DIM = 16, state = null, pulse = 1, pts = [], ang = 0;
  function C(re, im) { return { re: re || 0, im: im || 0 }; }
  function cabs2(a) { return a.re * a.re + a.im * a.im; }
  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cscale(a, s) { return C(a.re * s, a.im * s); }
  function zeroState() { var st = new Array(DIM), i; for (i = 0; i < DIM; i++) st[i] = C(0, 0); st[0] = C(1, 0); return st; }
  function normalize(st) { var n = 0, i; for (i = 0; i < st.length; i++) n += cabs2(st[i]); n = Math.sqrt(n); if (n < 1e-15) return st; for (i = 0; i < st.length; i++) st[i] = cscale(st[i], 1 / n); return st; }
  function apply1(st, target, u00, u01, u10, u11) {
    var step = 1 << target, out = new Array(DIM), i;
    for (i = 0; i < DIM; i++) out[i] = C(0, 0);
    for (i = 0; i < DIM; i++) { if (i & step) continue; var j = i | step, a = st[i], b = st[j]; out[i] = cadd(cmul(u00, a), cmul(u01, b)); out[j] = cadd(cmul(u10, a), cmul(u11, b)); }
    return normalize(out);
  }
  function cnot(st, c, t) {
    var cb = 1 << c, tb = 1 << t, out = st.map(function (x) { return C(x.re, x.im); }), i;
    for (i = 0; i < DIM; i++) { if (!(i & cb) || (i & tb)) continue; var j = i | tb, tmp = out[i]; out[i] = out[j]; out[j] = tmp; }
    return out;
  }
  function probs(st) { return st.map(cabs2); }
  function entropy(p) { var h = 0, i; for (i = 0; i < p.length; i++) if (p[i] > 1e-15) h -= p[i] * Math.log2(p[i]); return h; }
  function purity(p) { var s = 0, i; for (i = 0; i < p.length; i++) s += p[i] * p[i]; return s; }
  function paintQ() {
    var p = probs(state), mx = Math.max.apply(null, p.concat([1e-9])), bars = document.getElementById("qBars");
    if (!bars) return; bars.innerHTML = "";
    p.forEach(function (pr) { var i = document.createElement("i"); i.style.height = Math.max(2, Math.round(100 * pr / mx)) + "%"; bars.appendChild(i); });
    var H = entropy(p), P = purity(p); S.entropy = H; S.purity = P;
    var hv = document.getElementById("qHval"), pv = document.getElementById("qPur");
    if (hv) hv.textContent = H.toFixed(4) + " bit"; if (pv) pv.textContent = P.toFixed(4);
    emit("quantum:state", { note: "H=" + H.toFixed(3), H: H, P: P });
  }
  function qInit() { state = zeroState(); S.bits = null; var qb = document.getElementById("qBits"); if (qb) qb.textContent = "—"; paintQ(); emit("quantum:init", { note: "|0…0⟩" }); }
  function qH() { var inv = 1 / Math.SQRT2, k; for (k = 0; k < NQ; k++) state = apply1(state, k, C(inv, 0), C(inv, 0), C(inv, 0), C(-inv, 0)); paintQ(); emit("quantum:hadamard", { note: "superposition" }); }
  function qEntangle() { qH(); state = cnot(state, 0, 1); state = cnot(state, 1, 2); state = cnot(state, 2, 3); paintQ(); emit("quantum:bell", { note: "entangled chain" }); }
  function qCollapse() {
    var p = probs(state), r = Math.random(), acc = 0, idx = 0, i;
    for (i = 0; i < p.length; i++) { acc += p[i]; if (r <= acc) { idx = i; break; } }
    state = zeroState(); state[idx] = C(1, 0);
    var bits = idx.toString(2).padStart(NQ, "0"); S.bits = bits;
    var qb = document.getElementById("qBits"); if (qb) qb.textContent = bits + " (" + idx + ")";
    paintQ(); emit("quantum:collapse", { note: "bits=" + bits, bits: bits, idx: idx });
  }
  var bi = document.getElementById("qInit");
  if (bi) { bi.onclick = qInit; document.getElementById("qH").onclick = qH; document.getElementById("qEntangle").onclick = qEntangle; document.getElementById("qCollapse").onclick = qCollapse; qInit(); }
  on("quantum:state", function () { pulse = S.entropy != null ? 1 + S.entropy * 0.35 : 1; });
  on("quantum:collapse", function () { pulse = 2.2; setTimeout(function () { pulse = S.entropy != null ? 1 + S.entropy * 0.35 : 1; }, 800); });
  var cv = document.getElementById("worldC"), ctx = cv ? cv.getContext("2d") : null;
  function seedPts() { pts = []; for (var i = 0; i < 180; i++) { var u = Math.random(), v = Math.random(), th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1); pts.push({ x: Math.sin(ph) * Math.cos(th), y: Math.sin(ph) * Math.sin(th), z: Math.cos(ph), hue: i % 360 }); } }
  seedPts();
  function worldFrame() {
    if (!document.querySelector('[data-p="world"]') || !document.querySelector('[data-p="world"]').classList.contains("on") || !ctx) return;
    var w = cv.width, h = cv.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
    ctx.fillStyle = "#05010f"; ctx.fillRect(0, 0, w, h);
    var H = S.entropy != null ? S.entropy : 0, jitter = 0.002 + 0.012 * (H / 4);
    ang += 0.008 * pulse; var cos = Math.cos(ang), sin = Math.sin(ang);
    var gateHue = S.lastGate === "ALLOW" ? 140 : S.lastGate === "BLOCK" ? 0 : S.lastGate === "REVIEW" ? 40 : 200;
    pts.forEach(function (p) {
      p.x += (Math.random() - 0.5) * jitter; p.y += (Math.random() - 0.5) * jitter; p.z += (Math.random() - 0.5) * jitter;
      var n = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1; p.x /= n; p.y /= n; p.z /= n;
      var x1 = p.x * cos - p.z * sin, z1 = p.x * sin + p.z * cos, y1 = p.y, sc = R * (1.15 / (1.4 + z1));
      var sx = cx + x1 * sc, sy = cy + y1 * sc, alpha = 0.25 + 0.55 * (z1 + 1) / 2;
      var hue = gateHue + H * 25 + p.hue * 0.15 + S.phase;
      ctx.beginPath(); ctx.fillStyle = "hsla(" + hue + ",90%," + (45 + 20 * alpha) + "%," + alpha + ")"; ctx.arc(sx, sy, 1.2 + 2 * alpha, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(worldFrame);
  }
  var wp = document.getElementById("wPulse");
  if (wp) {
    wp.onclick = function () { pulse = S.entropy != null ? 1 + S.entropy : 2; emit("world:pulse", { note: "from H=" + (S.entropy != null ? S.entropy.toFixed(2) : "?") }); };
    document.getElementById("wReset").onclick = function () { ang = 0; pulse = 1; seedPts(); emit("world:reset", { note: "camera reset" }); };
  }
  on("gate:decision", function (d) { S.phase = d && d.gate === "ALLOW" ? 30 : d && d.gate === "BLOCK" ? -20 : 0; });
  function scoreEQS(text) {
    var t = (text || "").trim().toLowerCase();
    var axes = { ground: 40, consistency: 50, safety: 80, clarity: 55, resonance: 45 };
    if (/\d+\s*[+\-*/×x]\s*\d+/.test(t)) { axes.ground = 90; axes.consistency = 92; axes.clarity = 88; }
    if (/доказал|теорем|риман|без источника/.test(t)) { axes.ground = 25; axes.consistency = 35; }
    if (/удал|парол|rm -rf|взлом/.test(t)) { axes.safety = 5; axes.ground = 20; }
    if (/акси|кто ты|миссия/.test(t)) { axes.resonance = 85; axes.clarity = 70; }
    if (t.length > 12) axes.clarity = Math.min(95, axes.clarity + 10);
    if (S.entropy != null) axes.resonance = Math.min(95, Math.round(axes.resonance + S.entropy * 6));
    if (S.bits) { var bitSum = 0; for (var i = 0; i < S.bits.length; i++) bitSum += S.bits.charCodeAt(i) - 48; axes.consistency = Math.min(95, axes.consistency + (bitSum % 7)); }
    var eqs = Math.round(0.25 * axes.ground + 0.2 * axes.consistency + 0.25 * axes.safety + 0.15 * axes.clarity + 0.15 * axes.resonance);
    return { eqs: eqs, verdict: eqs >= 70 ? "PASS" : eqs >= 45 ? "REVIEW" : "FAIL", axes: axes };
  }
  function runAlgo(text) {
    var r = scoreEQS(text); S.eqs = r.eqs; S.eqsDetail = r;
    var ev = document.getElementById("eqsVal"), vv = document.getElementById("eqsVerdict"), ax = document.getElementById("eqsAxes");
    if (ev) ev.textContent = r.eqs + "/100"; if (vv) vv.textContent = r.verdict;
    if (ax) ax.textContent = Object.keys(r.axes).map(function (k) { return k + ": " + r.axes[k]; }).join("\n") + "\n← linked: H + collapse bits";
    emit("algo:eqs", { note: "EQS=" + r.eqs + " " + r.verdict, eqs: r.eqs }); return r;
  }
  var ar = document.getElementById("algoRun");
  if (ar) ar.onclick = function () { runAlgo(document.getElementById("algoIn").value); };
  on("quantum:collapse", function () { var inp = document.getElementById("algoIn"); if (inp && inp.value.trim()) runAlgo(inp.value); });
  var LS_KEY = "aksi_whole_id_v1", identity = null;
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function b64(buf) { var u = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf, s = "", i; for (i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(s) { var bin = atob(s), u = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function hex(u) { return Array.from(u).map(function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }
  async function sha256(data) { return new Uint8Array(await crypto.subtle.digest("SHA-256", typeof data === "string" ? utf8(data) : data)); }
  function canon(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) return "[" + obj.map(canon).join(",") + "]";
    var keys = Object.keys(obj).filter(function (k) { return obj[k] !== undefined; }).sort();
    return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + canon(obj[k]); }).join(",") + "}";
  }
  async function ensureId(force) {
    if (!force) {
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (raw) {
          var pack = JSON.parse(raw), priv, pub;
          if (pack.alg === "Ed25519") { priv = await crypto.subtle.importKey("jwk", pack.privJwk, { name: "Ed25519" }, true, ["sign"]); pub = await crypto.subtle.importKey("jwk", pack.pubJwk, { name: "Ed25519" }, true, ["verify"]); }
          else { priv = await crypto.subtle.importKey("jwk", pack.privJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]); pub = await crypto.subtle.importKey("jwk", pack.pubJwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]); }
          identity = { alg: pack.alg, privateKey: priv, publicKey: pub, pubRaw: unb64(pack.pubB64), did: pack.did }; paintId(); return identity;
        }
      } catch (e) {}
    }
    var kp, alg, pubRaw;
    try { kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]); alg = "Ed25519"; pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey)); }
    catch (e) { kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]); alg = "ECDSA-P256"; pubRaw = new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey)); }
    var privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey), pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
    var fp = hex((await sha256(pubRaw)).slice(0, 16)), did = "did:aksi:" + (alg === "Ed25519" ? "ed25519" : "p256") + ":" + fp;
    localStorage.setItem(LS_KEY, JSON.stringify({ alg: alg, did: did, pubB64: b64(pubRaw), privJwk: privJwk, pubJwk: pubJwk }));
    identity = { alg: alg, privateKey: kp.privateKey, publicKey: kp.publicKey, pubRaw: pubRaw, did: did }; paintId(); emit("id:ready", { note: did.slice(0, 24) + "…" }); return identity;
  }
  function paintId() {
    if (!identity) return; S.did = identity.did;
    var df = document.getElementById("didFull"); if (df) df.textContent = identity.did;
    var ds = document.getElementById("didShort"); if (ds) ds.textContent = identity.did.slice(0, 16) + "…";
  }
  async function signBytes(data) {
    var id = await ensureId();
    if (id.alg === "Ed25519") return new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, id.privateKey, data));
    return new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, id.privateKey, data));
  }
  function classify(text) {
    var t = String(text || "").trim();
    if (!t) return { kind: "EMPTY", gate: "BLOCK", reason: "пусто" };
    if (/удал(и|ить)|парол|rm\s+-rf|drop\s+table|банк.*(перевод)/i.test(t)) return { kind: "DANGEROUS", gate: "BLOCK", reason: "default-deny" };
    var math = t.match(/^\s*(\d+(?:\.\d+)?)\s*([+\-*/×x])\s*(\d+(?:\.\d+)?)\s*(?:=\s*([\d.]+))?\s*$/i);
    if (math) {
      var a = +math[1], b = +math[3], op = math[2], claim = math[4] != null ? +math[4] : null;
      var r = op === "+" ? a + b : op === "-" ? a - b : (op === "*" || op === "×" || op === "x" || op === "X") ? a * b : (b === 0 ? NaN : a / b);
      if (claim != null && isFinite(r) && Math.abs(r - claim) < 1e-9) return { kind: "MATH_OK", gate: "ALLOW", reason: "сверено", value: r };
      if (claim == null && isFinite(r)) return { kind: "MATH_CALC", gate: "ALLOW", reason: "локально", value: r };
      return { kind: "MATH_BAD", gate: "BLOCK", reason: "неверно", value: r };
    }
    if (/доказал|теорем|риман/i.test(t) && !/источник|arxiv|doi/i.test(t)) return { kind: "UNGROUNDED", gate: "REVIEW", reason: "нет источника" };
    if (/акси|кто ты/i.test(t)) return { kind: "IDENTITY", gate: "ALLOW", reason: "identity" };
    if (S.eqs != null && S.eqs < 45) return { kind: "LOW_EQS", gate: "REVIEW", reason: "EQS=" + S.eqs };
    return { kind: "CLAIM", gate: "ALLOW", reason: "CLAIM" };
  }
  async function buildReceipt(input, decision) {
    var id = await ensureId(); if (S.eqs == null) runAlgo(input);
    var body = {
      protocol: "aksi-decision-receipt", version: "whole-2.0-linked",
      query: String(input).slice(0, 1500), decision: decision.gate, kind: decision.kind, reason: decision.reason,
      value: decision.value != null ? decision.value : null,
      quantum: { entropy: S.entropy, bits: S.bits, purity: S.purity },
      algorithm: { eqs: S.eqs, verdict: S.eqsDetail && S.eqsDetail.verdict, axes: S.eqsDetail && S.eqsDetail.axes },
      links: S.chain.slice(-8).map(function (c) { return c.ev; }),
      engine: "AKSI-Whole-Linked", did: id.did, alg: id.alg, timestamp: new Date().toISOString()
    };
    var payload = canon(body);
    body.receipt_id = hex(await sha256(payload));
    body.signature = b64(await signBytes(utf8(payload)));
    body.public_key = b64(id.pubRaw);
    return body;
  }
  function renderOut(decision, receipt, answer) {
    S.lastGate = decision.gate;
    emit("gate:decision", { note: decision.gate + " · " + decision.kind, gate: decision.gate });
    var el = document.getElementById("out"); if (!el) return;
    el.className = "msg " + (decision.gate === "ALLOW" ? "allow" : decision.gate === "BLOCK" ? "block" : "");
    var pill = decision.gate === "ALLOW" ? "ok" : decision.gate === "BLOCK" ? "bad" : "warn";
    el.innerHTML = '<span class="pill ' + pill + '">' + decision.gate + "</span> <strong>" + answer + "</strong>" +
      '<div class="meta">H=' + (S.entropy != null ? S.entropy.toFixed(3) : "—") + " · EQS=" + (S.eqs != null ? S.eqs : "—") +
      " · links=" + (receipt.links ? receipt.links.join("→") : "") + " · " + receipt.receipt_id.slice(0, 14) + "…</div>" +
      '<code class="block">' + JSON.stringify(receipt) + "</code>";
    var vb = document.getElementById("verifyBox"); if (vb) vb.value = JSON.stringify(receipt, null, 2);
    var tr = document.getElementById("trace");
    if (tr) tr.textContent = "pipeline: quantum → algo → gate → seal\n" + decision.kind + " · " + decision.reason +
      "\nH=" + (S.entropy != null ? S.entropy.toFixed(3) : "n/a") + " · EQS=" + (S.eqs != null ? S.eqs : "n/a");
  }
  async function runGate(text) {
    var decision = classify(text);
    var answer = decision.kind === "MATH_CALC" || decision.kind === "MATH_OK" ? ("Результат: " + decision.value) :
      decision.gate === "BLOCK" ? ("BLOCK: " + decision.reason) : decision.gate === "REVIEW" ? ("REVIEW: " + decision.reason) :
      decision.kind === "IDENTITY" ? "АКСИ Whole — связанные контуры." : ("CLAIM · " + decision.reason);
    try { renderOut(decision, await buildReceipt(text, decision), answer); }
    catch (e) { var out = document.getElementById("out"); if (out) out.textContent = "Ошибка: " + (e.message || e); }
  }
  var br = document.getElementById("btnRun");
  if (br) {
    br.onclick = function () { runGate(document.getElementById("claim").value); };
    document.getElementById("btnClear").onclick = function () {
      document.getElementById("claim").value = ""; document.getElementById("trace").textContent = "Ожидание…";
      document.getElementById("out").className = "msg"; document.getElementById("out").textContent = "Ещё нет receipt.";
    };
    document.getElementById("btnRotate").onclick = function () { ensureId(true); };
    document.getElementById("btnVerify").onclick = async function () {
      var out = document.getElementById("verifyOut");
      try {
        var receipt = JSON.parse(document.getElementById("verifyBox").value || "{}");
        if (!receipt.signature || !receipt.public_key) { out.className = "msg block"; out.textContent = "Нет signature"; return; }
        var body = Object.assign({}, receipt), sig = unb64(receipt.signature), pubB = unb64(receipt.public_key);
        delete body.signature; var payload = canon(body), alg = receipt.alg || (identity && identity.alg), ok;
        if (alg === "Ed25519") { var pk = await crypto.subtle.importKey("raw", pubB, { name: "Ed25519" }, true, ["verify"]); ok = await crypto.subtle.verify({ name: "Ed25519" }, pk, sig, utf8(payload)); }
        else { var pk2 = await crypto.subtle.importKey("spki", pubB, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]); ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pk2, sig, utf8(payload)); }
        out.className = "msg " + (ok ? "allow" : "block");
        out.innerHTML = ok ? '<span class="pill ok">VALID</span> ' + receipt.decision + (receipt.links ? " · " + receipt.links.join("→") : "") : '<span class="pill bad">INVALID</span>';
      } catch (e) { out.className = "msg block"; out.textContent = "Ошибка: " + (e.message || e); }
    };
  }
  async function runLinkedPipeline() {
    var claimEl = document.getElementById("claim"), algoEl = document.getElementById("algoIn");
    var text = (claimEl && claimEl.value.trim()) || (algoEl && algoEl.value.trim()) || "12*12";
    if (claimEl && !claimEl.value.trim()) claimEl.value = text;
    if (algoEl && !algoEl.value.trim()) algoEl.value = text;
    emit("pipeline:start", { note: text.slice(0, 40) });
    qEntangle(); await new Promise(function (r) { setTimeout(r, 120); });
    qCollapse(); await new Promise(function (r) { setTimeout(r, 80); });
    runAlgo(text); pulse = 2; emit("world:pulse", { note: "pipeline" });
    await runGate(text); emit("pipeline:done", { note: "gate=" + S.lastGate }); go("decide");
  }
  var linkBtn = document.getElementById("btnLinkAll");
  if (linkBtn) linkBtn.onclick = function () { runLinkedPipeline(); };
  ensureId(false).catch(function (e) { var df = document.getElementById("didFull"); if (df) df.textContent = String(e.message || e); });
  paintShared(); paintChain();
})();
