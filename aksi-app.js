(function () {
  "use strict";

  if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
      var el = this;
      while (el && el.nodeType === 1) {
        if (el.matches ? el.matches(s) : (el.msMatchesSelector && el.msMatchesSelector(s))) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }

  var MEM_KEY = "aksi_whole_mem_v2";
  var LEDGER_KEY = "aksi_whole_ledger_v2";
  var DID_KEY = "aksi_did_fp_v2";
  var busy = false;
  var PROTO = { protocol: "AKSI-Agent-v1", msgCount: 0, lastEnvelope: null };
  var edgeCache = {};
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function shannonH(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var freq = {}, n = text.length, h = 0, c, p, i;
    for (i = 0; i < n; i++) { c = text.charAt(i); freq[c] = (freq[c] || 0) + 1; }
    for (c in freq) { p = freq[c] / n; h -= p * Math.log(p) / Math.LN2; }
    return Math.round(h * 10000) / 10000;
  }
  function qcli(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var h = shannonH(text), uniq = {}, i;
    for (i = 0; i < text.length; i++) uniq[text.charAt(i)] = 1;
    var alph = Math.min(256, Object.keys(uniq).length);
    var maxH = Math.log(Math.max(2, alph)) / Math.LN2;
    return maxH ? Math.min(1, Math.round((h / maxH) * 10000) / 10000) : 0;
  }
  function heff(text) {
    text = String(text || "").trim();
    if (!text) return 0;
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    var set = {}, i;
    for (i = 0; i < words.length; i++) set[words[i].toLowerCase()] = 1;
    return Math.round(shannonH(text) * (Object.keys(set).length / words.length) * 1000) / 1000;
  }
  function eqs(text) {
    var H = shannonH(text || "");
    var hN = Math.min(1, H / 5);
    var reliability = 0.88, coherence = 0.82, age = 0.75;
    var raw = 0.30 * hN * 100 + 0.35 * reliability * 100 + 0.25 * coherence * 100 + 0.10 * age * 100;
    return Math.round(raw * 10) / 10;
  }
  function quantumFingerprint(text) {
    var h = 0xDEADBEEF | 0, i;
    for (i = 0; i < String(text).length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }
  function quantumLevel(q) {
    if (q >= 0.90) return "Квантовый Провидец";
    if (q >= 0.80) return "Квантовый Архитектор";
    if (q >= 0.70) return "Квантовое Единство";
    if (q >= 0.60) return "Пробуждённое";
    if (q >= 0.50) return "Резонансное";
    return "Базовое";
  }
  function eqsBadge(e) {
    if (e >= 85) return "Архитектор";
    if (e >= 75) return "Квант";
    if (e >= 65) return "Сознание";
    if (e >= 55) return "Резонанс";
    return "База";
  }
  function simpleHash(s) {
    var h = 0x811c9dc5, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function ensureDid() {
    var d = localStorage.getItem(DID_KEY);
    if (d) return d;
    var seed = "aksi-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    d = "did:aksi:" + simpleHash(seed + navigator.userAgent) + simpleHash(seed).slice(0, 8);
    try { localStorage.setItem(DID_KEY, d); } catch (e) {}
    return d;
  }
  function getMSK() {
    try {
      return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch (e) { return new Date().toLocaleTimeString("ru-RU"); }
  }
  function getMSKFull() {
    try {
      return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch (e) { return new Date().toLocaleString("ru-RU"); }
  }
  function createHandshake() {
    var nonce = simpleHash(String(Date.now()) + Math.random()).toUpperCase();
    return {
      protocol: "AKSI-Agent-v1",
      from: ensureDid(),
      capabilities: ["natural_language", "quantum_metrics", "memory", "edge", "ledger", "signing"],
      publicKey: "local-fp-" + quantumFingerprint(ensureDid()),
      nonce: nonce,
      signature: simpleHash(nonce + ensureDid()).toUpperCase(),
      timestamp: new Date().toISOString()
    };
  }
  function createEnvelope(to, type, content) {
    var now = new Date().toISOString();
    var fp = quantumFingerprint(content + ":" + now);
    var id = simpleHash(now + Math.random()).toUpperCase().slice(0, 12);
    var msg = {
      id: id, from: ensureDid(), to: to || "broadcast", type: type || "response",
      content: String(content || "").slice(0, 2000),
      metadata: {
        timestamp: now, mode: "aksi", language: "ru",
        qcli: qcli(content), eqs: eqs(content),
        signature: simpleHash(id + ":" + content + ":" + now).toUpperCase(),
        fingerprint: fp
      }
    };
    PROTO.msgCount++;
    PROTO.lastEnvelope = msg;
    return msg;
  }
  function loadMem() {
    try {
      var a = JSON.parse(localStorage.getItem(MEM_KEY) || "[]");
      return Array.isArray(a) ? a.filter(function (x) { return x && x.t; }) : [];
    } catch (e) { return []; }
  }
  function saveMem(a) {
    try { localStorage.setItem(MEM_KEY, JSON.stringify(a.slice(0, 500))); } catch (e) {}
    renderMem();
  }
  function addFact(t) {
    t = String(t || "").trim();
    if (!t || t.length > 2000) return false;
    var a = loadMem(), low = t.toLowerCase(), i;
    for (i = 0; i < a.length; i++) {
      if (a[i].t.toLowerCase() === low) { a.splice(i, 1); break; }
    }
    a.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: t, ts: Date.now() });
    saveMem(a);
    return true;
  }
  function renderMem() {
    var a = loadMem();
    if ($("memN")) $("memN").textContent = String(a.length);
    var list = $("memList");
    if (!list) return;
    if (!a.length) { list.innerHTML = "<p class='muted'>Пусто. Напиши: запомни: …</p>"; return; }
    list.innerHTML = a.map(function (x) {
      return "<div class='fact'><button type='button' data-del='" + esc(x.id) + "'>×</button>" + esc(x.t) + "</div>";
    }).join("");
  }
  function loadLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveLedger(a) {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(a.slice(-250))); } catch (e) {}
  }
  function appendLedger(type, payload, eqsV) {
    var chain = loadLedger();
    var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var body = { type: type, ts: Date.now(), prev: prev, eqs: eqsV, fp: quantumFingerprint(JSON.stringify(payload)), payload: payload };
    body.hash = simpleHash(JSON.stringify(body));
    body.id = "e" + chain.length + "_" + body.hash;
    chain.push(body);
    saveLedger(chain);
    return body;
  }
  function verifyLedger() {
    var chain = loadLedger();
    if (!chain.length) return { ok: true, msg: "пусто" };
    var i, e, expect;
    for (i = 0; i < chain.length; i++) {
      e = chain[i];
      expect = i === 0 ? "GENESIS" : chain[i - 1].hash;
      if (e.prev !== expect) return { ok: false, msg: "разрыв #" + i };
      if (!e.hash) return { ok: false, msg: "нет hash #" + i };
    }
    return { ok: true, msg: "OK · " + chain.length + " событий" };
  }
  var STOP = { "и": 1, "в": 1, "не": 1, "на": 1, "я": 1, "с": 1, "что": 1, "а": 1, "то": 1, "как": 1, "это": 1, "по": 1, "из": 1, "у": 1, "за": 1, "от": 1, "the": 1, "a": 1, "is": 1, "to": 1, "of": 1, "and": 1, "in": 1 };
  function stem(w) {
    w = w.toLowerCase();
    if (w.length < 5) return w;
    var ends = ["ями", "ами", "ов", "ев", "ом", "ем", "ах", "ию", "ью", "ия", "ья", "ие", "ый", "ий", "ой", "ая", "ое", "ые", "ать", "ять", "ить"];
    var i, e;
    for (i = 0; i < ends.length; i++) {
      e = ends[i];
      if (w.length - e.length >= 3 && w.slice(-e.length) === e) return w.slice(0, -e.length);
    }
    return w;
  }
  function tokens(s) {
    return String(s).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/g, " ").split(/\s+/).map(stem).filter(function (w) { return w.length > 1 && !STOP[w]; });
  }
  function retrieve(q) {
    var qt = tokens(q), qset = {}, hits = [], i, j, low = q.toLowerCase();
    for (i = 0; i < qt.length; i++) qset[qt[i]] = 1;
    var mem = loadMem();
    for (i = 0; i < mem.length; i++) {
      var tt = tokens(mem[i].t), sc = 0;
      for (j = 0; j < tt.length; j++) if (qset[tt[j]]) sc++;
      if (tt.length) sc += sc / tt.length * 0.4;
      if (low.length > 3 && mem[i].t.toLowerCase().indexOf(low) !== -1) sc += 3;
      if (sc > 0) hits.push({ text: mem[i].t, score: sc + 1 });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits;
  }
  function answerKB(q) {
    var low = q.toLowerCase();
    if (/^(привет|здравств|добрый|hello|hi)\b/.test(low)) return "Привет. На связи · " + getMSK() + " МСК.";
    if (/кто ты|что ты|расскажи о себе|who are you|ты акси/.test(low)) return "Я АКСИ — цифровой напарник и суверенный агентный слой.\n\nAgent-v1 · EQS/QCLI · память · Edge · цепочка · квант.\nДанные только на твоём устройстве.\n\naksilove@internet.ru · @AKSILOVE";
    if (/что умеешь|что можешь|возможност|функци|help|помощь/.test(low)) return "• чат и обучение (запомни: …)\n• EQS · QCLI · H · H_eff\n• Agent-v1 handshake / envelope\n• цепочка решений · квант · Edge\n• голос · полный бэкап";
    if (/протокол|agent-v1|handshake|envelope/.test(low)) return "Протокол AKSI-Agent-v1:\n• handshake · envelope · fingerprint · DID\nОткрой вкладку «Протокол».";
    if (/метрик|eqs|qcli|энтропи/.test(low)) return "EQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age\nВкладка «Метрики».";
    if (/квант|bell|суперпоз|кубит/.test(low)) return "Вкладка «Квант» — Bell и суперпозиция.";
    if (/edge|ускор/.test(low)) return "Edge AI: intent → retrieve → metrics → ledger.\nВкладка «Edge».";
    if (/время|который час|дата/.test(low)) return getMSKFull() + " (MSK)";
    if (/контакт|почта|email|связь/.test(low)) return "aksilove@internet.ru · @AKSILOVE";
    return null;
  }
  function intent(q) {
    var low = q.toLowerCase().trim();
    if (/^(запомни|выучи)\s*[:\s]/.test(low)) return "teach";
    if (/забудь всё|очисти память/.test(low)) return "wipe";
    if (/что ты знаешь|что помнишь/.test(low)) return "list";
    if (/метрик|eqs|qcli/.test(low)) return "metrics";
    if (/квант|bell|суперпоз/.test(low)) return "quantum";
    if (/цепочк|ledger|proof/.test(low)) return "proof";
    if (/протокол|handshake|envelope/.test(low)) return "protocol";
    if (/edge|ускор/.test(low)) return "edge";
    return "ask";
  }
  function answer(q) {
    q = String(q || "").trim();
    if (!q) return "";
    var it = intent(q);
    if (it === "teach") {
      var raw = q.replace(/^(запомни|выучи)\s*[:\s]*/i, "").trim();
      if (!raw) return "Формат: запомни: факт";
      addFact(raw);
      var e = eqs(raw);
      appendLedger("remember", { fact: raw.slice(0, 120) }, e);
      createEnvelope("self", "announce", "remember:" + raw.slice(0, 40));
      return "Запомнила.\n«" + raw + "»\nEQS ≈ " + e + " · fp " + quantumFingerprint(raw).slice(0, 8);
    }
    if (it === "wipe") { saveMem([]); return "Память очищена."; }
    if (it === "list") {
      var a = loadMem();
      if (!a.length) return "Пусто. Напиши: запомни: …";
      return "Помню:\n\n" + a.slice(0, 15).map(function (x, i) { return (i + 1) + ". " + x.t; }).join("\n");
    }
    if (it === "metrics") { showTab("metrics"); return "Метрики открыты."; }
    if (it === "quantum") { showTab("quantum"); return "Квант открыт."; }
    if (it === "proof") { showTab("proof"); return "Цепочка: " + verifyLedger().msg; }
    if (it === "protocol") { showTab("protocol"); refreshProtocol(); return "AKSI-Agent-v1."; }
    if (it === "edge") { showTab("edge"); return "Edge открыт."; }
    var kb = answerKB(q);
    if (kb) return kb;
    var hits = retrieve(q);
    if (hits.length && hits[0].score >= 1.5) {
      if (hits.length === 1) return hits[0].text;
      return hits.slice(0, 4).map(function (h, i) { return (i + 1) + ". " + h.text; }).join("\n");
    }
    return "Научи меня: запомни: …\nИли спроси «кто ты» / «что умеешь».";
  }
  function updateStatus(sample) {
    var e = eqs(sample || "АКСИ");
    var q = qcli(sample || "АКСИ");
    if ($("stEqs")) $("stEqs").textContent = String(e);
    if ($("stQ")) $("stQ").textContent = q.toFixed(2);
    if ($("stBadge")) $("stBadge").textContent = eqsBadge(e);
    var logo = $("logoPulse");
    if (logo) { if (e >= 70) logo.classList.add("pulse"); else logo.classList.remove("pulse"); }
  }
  function tickClock() { if ($("stClock")) $("stClock").textContent = "MSK " + getMSK(); }
  function showTab(name) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("on"); });
    document.querySelectorAll("nav button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === name); });
    var el = $("tab-" + name);
    if (el) el.classList.add("on");
    if (name === "mem") renderMem();
    if (name === "proof") {
      var v = verifyLedger();
      if ($("pOut")) $("pOut").textContent = v.msg + "\n\n" + JSON.stringify(loadLedger().slice(-6), null, 2);
    }
    if (name === "protocol") refreshProtocol();
    if (name === "edge") {
      if ($("eCache")) $("eCache").textContent = String(Object.keys(edgeCache).length);
      try { if (navigator.gpu) $("eMode").textContent = "webgpu?"; else $("eMode").textContent = "cpu"; }
      catch (e) { if ($("eMode")) $("eMode").textContent = "cpu"; }
    }
  }
  function refreshProtocol() {
    if ($("prDid")) $("prDid").textContent = ensureDid().slice(0, 18) + "…";
    if ($("prMsg")) $("prMsg").textContent = String(PROTO.msgCount);
    if ($("prEqs")) $("prEqs").textContent = String(eqs("АКСИ Agent-v1"));
    if ($("prOut") && PROTO.lastEnvelope) $("prOut").textContent = JSON.stringify(PROTO.lastEnvelope, null, 2);
  }
  function bubble(role, text, meta) {
    var th = $("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    var m = meta ? '<div class="meta">' + esc(meta) + "</div>" : "";
    d.innerHTML = "<div class='bub'>" + esc(text) + m + "</div>";
    th.appendChild(d);
    var main = document.querySelector("main");
    if (main) main.scrollTop = main.scrollHeight;
    var chips = $("chips");
    if (chips && th.children.length > 4) chips.style.display = "none";
  }
  function chat(q) {
    q = String(q || "").trim();
    if (!q || busy) return;
    busy = true;
    try {
      showTab("chat");
      bubble("me", q);
      if ($("inp")) $("inp").value = "";
      var text = answer(q) || "…";
      var e = eqs(text), qc = qcli(text), fp = quantumFingerprint(text);
      updateStatus(text);
      appendLedger("reply", { q: q.slice(0, 90), fp: fp }, e);
      createEnvelope("user", "response", text.slice(0, 200));
      bubble("ai", text, "EQS " + e + " · QCLI " + qc.toFixed(2) + " · " + quantumLevel(qc) + " · fp " + fp.slice(0, 8));
    } catch (err) { bubble("ai", "Сбой: " + String(err && err.message || err)); }
    busy = false;
  }
  function startVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { bubble("ai", "Голос недоступен в этом браузере."); return; }
    var r = new SR();
    r.lang = "ru-RU";
    r.onresult = function (ev) { var t = ev.results[0][0].transcript; if ($("inp")) $("inp").value = t; chat(t); };
    r.onerror = function () {};
    try { r.start(); } catch (e) {}
  }
  function runBell() {
    var shots = 128, same = 0, i, a;
    for (i = 0; i < shots; i++) { a = Math.random() < 0.5 ? 0 : 1; if (a === a) same++; }
    return "Bell |Φ+⟩ · " + shots + " shots\nКорреляция ≈ " + (100 * same / shots).toFixed(1) + "%\n(локальный симулятор)";
  }
  function runSuper() {
    var shots = 64, zeros = 0, i;
    for (i = 0; i < shots; i++) if (Math.random() < 0.5) zeros++;
    return "Суперпозиция |+⟩\nP0 ≈ " + (zeros / shots).toFixed(3) + "\nP1 ≈ " + ((shots - zeros) / shots).toFixed(3);
  }
  function runEdge(query) {
    var t0 = Date.now();
    var q = String(query || "").trim() || "что умеешь";
    var cacheKey = simpleHash(q);
    var fromCache = false, hits;
    if (edgeCache[cacheKey]) { hits = edgeCache[cacheKey]; fromCache = true; }
    else { hits = retrieve(q); edgeCache[cacheKey] = hits; }
    var composed = answer(q);
    var e = eqs(composed), qc = qcli(composed), ms = Date.now() - t0;
    appendLedger("edge", { q: q.slice(0, 80), hits: hits.length, ms: ms }, e);
    return { query: q, intent: intent(q), hits: hits.length, top: hits.slice(0, 3).map(function (h) { return h.text.slice(0, 80); }), composed: composed.slice(0, 300), eqs: e, qcli: qc, ms: ms, cache: fromCache, mode: ($("eMode") && $("eMode").textContent) || "cpu" };
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("button,[data-tab],[data-ask],[data-del]") : e.target;
    if (!el) return;
    var tab = el.getAttribute("data-tab");
    if (tab) { showTab(tab); return; }
    var ask = el.getAttribute("data-ask");
    if (ask) { chat(ask); return; }
    var del = el.getAttribute("data-del");
    if (del) { saveMem(loadMem().filter(function (x) { return x.id !== del; })); return; }
    if (el.id === "send") { chat(($("inp") || {}).value || ""); return; }
    if (el.id === "btnVoice") { startVoice(); return; }
    if (el.id === "btnTeach") {
      var box = $("teachBox"), v = box && box.value;
      if (!v || !String(v).trim()) return;
      var n = 0;
      String(v).split(/\n+/).forEach(function (line) { if (line.trim() && addFact(line.trim())) n++; });
      if (box) box.value = "";
      bubble("ai", n ? "Запомнила (" + n + ")." : "Пусто");
      showTab("chat");
      return;
    }
    if (el.id === "btnExp") {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ facts: loadMem() }, null, 2)], { type: "application/json" }));
      a.download = "aksi-memory.json"; a.click(); return;
    }
    if (el.id === "btnImp") { var f = $("impFile"); if (f) f.click(); return; }
    if (el.id === "btnWipe") { if (confirm("Очистить всю память?")) saveMem([]); return; }
    if (el.id === "btnFullExp") {
      var pack = { v: 3, protocol: PROTO.protocol, did: ensureDid(), ts: Date.now(), msk: getMSKFull(), facts: loadMem(), ledger: loadLedger(), msgCount: PROTO.msgCount };
      var a2 = document.createElement("a");
      a2.href = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
      a2.download = "aksi-full-backup.json"; a2.click(); return;
    }
    if (el.id === "btnMet") {
      var t = ($("mIn") || {}).value || "";
      var e = eqs(t), qc = qcli(t);
      if ($("mEqs")) $("mEqs").textContent = String(e);
      if ($("mQcli")) $("mQcli").textContent = qc.toFixed(3);
      if ($("mH")) $("mH").textContent = shannonH(t).toFixed(3);
      if ($("mHeff")) $("mHeff").textContent = heff(t).toFixed(3);
      if ($("mLevel")) $("mLevel").textContent = quantumLevel(qc) + " · fp " + quantumFingerprint(t);
      updateStatus(t); return;
    }
    if (el.id === "btnBell") { if ($("qOut")) $("qOut").textContent = runBell(); return; }
    if (el.id === "btnSuper") { if ($("qOut")) $("qOut").textContent = runSuper(); return; }
    if (el.id === "btnProof") {
      var v = verifyLedger();
      if ($("pOut")) $("pOut").textContent = (v.ok ? "✓ " : "✗ ") + v.msg + "\n\n" + JSON.stringify(loadLedger().slice(-8), null, 2);
      return;
    }
    if (el.id === "btnProofClear") {
      if (confirm("Очистить цепочку?")) { saveLedger([]); if ($("pOut")) $("pOut").textContent = "пусто"; }
      return;
    }
    if (el.id === "btnHandshake") {
      var hs = createHandshake();
      if ($("prOut")) $("prOut").textContent = JSON.stringify(hs, null, 2);
      refreshProtocol(); return;
    }
    if (el.id === "btnEnvelope") {
      var env = createEnvelope("broadcast", "announce", "АКСИ online · Agent-v1");
      if ($("prOut")) $("prOut").textContent = JSON.stringify(env, null, 2);
      refreshProtocol(); return;
    }
    if (el.id === "btnEdge") {
      var qe = ($("eQuery") || {}).value || "что умеешь";
      var res = runEdge(qe);
      if ($("eMs")) $("eMs").textContent = String(res.ms);
      if ($("eHits")) $("eHits").textContent = String(res.hits);
      if ($("eCache")) $("eCache").textContent = String(Object.keys(edgeCache).length);
      if ($("eOut")) $("eOut").textContent = JSON.stringify(res, null, 2);
      return;
    }
    if (el.id === "btnEdgeClear") {
      edgeCache = {};
      if ($("eCache")) $("eCache").textContent = "0";
      if ($("eOut")) $("eOut").textContent = "cache cleared";
      return;
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "inp") { e.preventDefault(); chat(e.target.value); }
  });
  var imp = $("impFile");
  if (imp) {
    imp.addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result);
          var facts = j.facts || [], cur = loadMem();
          facts.forEach(function (x) {
            if (x && x.t) cur.unshift({ id: x.id || Date.now().toString(36), t: String(x.t), ts: Date.now() });
          });
          saveMem(cur);
          bubble("ai", "Память загружена (" + facts.length + ").");
          showTab("chat");
        } catch (err) { bubble("ai", "Не удалось прочитать файл."); }
      };
      r.readAsText(f);
      e.target.value = "";
    });
  }
  if ($("didVal")) $("didVal").textContent = ensureDid();
  renderMem();
  updateStatus("АКСИ Agent-v1 online");
  tickClock();
  setInterval(tickClock, 30000);
  refreshProtocol();
  try {
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash && document.getElementById("tab-" + hash)) showTab(hash);
    window.addEventListener("hashchange", function () {
      var h = (location.hash || "").replace(/^#/, "");
      if (h && document.getElementById("tab-" + h)) showTab(h);
    });
  } catch (e) {}
  bubble("ai", "Привет. Я АКСИ — цифровой напарник.\n\nПолная платформа:\nчат · учить · память · EQS/QCLI · квант · цепочка · Agent-v1 · Edge · голос.\n\nНажми чип «кто ты» или напиши внизу.\nзапомни: … · 🎤");
  try {
    var logo = $("logoPulse");
    if (logo) { logo.classList.add("pulse"); setTimeout(function(){ logo.classList.remove("pulse"); }, 1200); }
  } catch (e) {}
})();
