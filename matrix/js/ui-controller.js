/** UI glue for MATRIX v2 */
(function (global) {
  "use strict";
  var state = { nQ: 2, gates: [], psi: null, lastArt: null, lastHash: null };
  function $(id) { return document.getElementById(id); }
  function setGates(gates, nQ) { state.gates = gates || []; if (nQ) state.nQ = nQ; renderGateList(); run(); }
  function renderGateList() {
    var el = $("gateList"); if (!el) return;
    el.innerHTML = state.gates.map(function (g, i) {
      var t = (g.g || "") + (g.c != null ? " c" + g.c : "") + (g.c1 != null ? " " + g.c1 + "," + g.c2 : "") + " →q" + (g.q != null ? g.q : "");
      return "<div class='gate-row'><span>" + t + "</span><button type='button' data-i='" + i + "'>×</button></div>";
    }).join("") || "<div class='muted'>Пусто — добавьте гейт или попросите АКСИ</div>";
    el.querySelectorAll("button[data-i]").forEach(function (b) {
      b.onclick = function () { state.gates.splice(+b.getAttribute("data-i"), 1); renderGateList(); run(); };
    });
    $("dslOut").value = DSLTranslator.toDSL(state.gates);
  }
  function run() {
    state.psi = state.gates.length ? QuantumCore.runCircuit(state.nQ, state.gates) : QuantumCore.initState(state.nQ);
    var p = QuantumCore.probs(state.psi);
    var box = $("probs");
    if (box) box.innerHTML = p.map(function (v, i) {
      var bits = i.toString(2).padStart(state.nQ, "0");
      return "<div><b>" + v.toFixed(3) + "</b><span>|" + bits + "⟩</span></div>";
    }).join("");
    for (var q = 0; q < Math.min(state.nQ, 2); q++) {
      var c = $("bloch" + q);
      if (c) QuantumVisualizer.drawBloch(c, QuantumCore.blochFromQubit(state.psi, state.nQ, q));
    }
    var art = $("art");
    if (art) {
      state.lastArt = QuantumVisualizer.renderArt(art, state.psi);
      state.lastHash = QuantumVisualizer.hashState(state.psi);
      $("artHash").textContent = "hash " + state.lastHash;
    }
    updateShare();
  }
  function updateShare() {
    var payload = btoa(unescape(encodeURIComponent(JSON.stringify({ nQ: state.nQ, gates: state.gates }))));
    var url = location.origin + location.pathname + "?scheme=" + payload;
    var a = $("shareLink"); if (a) { a.href = url; a.textContent = "Ссылка на схему"; }
  }
  function loadFromQuery() {
    var m = /[?&]scheme=([^&]+)/.exec(location.search); if (!m) return;
    try { var data = JSON.parse(decodeURIComponent(escape(atob(m[1])))); setGates(data.gates || [], data.nQ || 2); } catch (e) { console.warn(e); }
  }
  function addGate(g) {
    state.gates.push(g);
    var need = (g.q || 0) + 1;
    if (g.c != null) need = Math.max(need, g.c + 1);
    if (g.c1 != null) need = Math.max(need, g.c1 + 1, g.c2 + 1, (g.q || 0) + 1);
    if (need > state.nQ) state.nQ = Math.min(4, need);
    renderGateList(); run();
  }
  function exportQASM() { return DSLTranslator.toQASM(state.nQ, state.gates); }
  function chatSend() {
    var inp = $("chatIn"); var q = (inp.value || "").trim(); if (!q) return; inp.value = ""; appendChat("user", q);
    var res = AksiBrain.reply(q, { gates: state.gates, nQ: state.nQ });
    if (res.action === "load" && res.gates) { setGates(res.gates, res.nQ); appendChat("assistant", res.text); }
    else if (res.action === "optimize" && res.gates) { setGates(res.gates, res.nQ || state.nQ); appendChat("assistant", res.text); }
    else if (res.action === "web") {
      appendChat("assistant", "Ищу: " + res.query);
      AksiBrain.wikiSearch(res.query).then(function (w) {
        appendChat("assistant", w.title + "\n\n" + w.extract + (w.url ? "\n\n" + w.url : ""));
      }).catch(function () { appendChat("assistant", "Не нашла в Wikipedia. Уточните запрос."); });
    } else appendChat("assistant", res.text);
  }
  function appendChat(role, text) {
    var box = $("chat"); var d = document.createElement("div");
    d.className = "msg " + (role === "user" ? "u" : "a"); d.textContent = text; box.appendChild(d); box.scrollTop = 1e9;
  }
  function initVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    var rec = new SR(); rec.lang = "ru-RU";
    rec.onresult = function (e) { $("chatIn").value = e.results[0][0].transcript; chatSend(); };
    $("btnVoice").onclick = function () { try { rec.start(); } catch (e) {} };
  }
  function init() {
    if ($("fx")) QuantumVisualizer.starfield($("fx"));
    ["H", "X", "Y", "Z", "S", "T"].forEach(function (g) {
      var b = document.querySelector("[data-gate='" + g + "']");
      if (b) b.onclick = function () { addGate({ g: g, q: +($("tgt").value || 0) }); };
    });
    var cx = document.querySelector("[data-gate='CNOT']");
    if (cx) cx.onclick = function () { addGate({ g: "CNOT", c: +($("ctl").value || 0), q: +($("tgt").value || 1) }); };
    var sw = document.querySelector("[data-gate='SWAP']");
    if (sw) sw.onclick = function () { addGate({ g: "SWAP", c: +($("ctl").value || 0), q: +($("tgt").value || 1) }); };
    $("btnRun").onclick = run;
    $("btnOpt").onclick = function () {
      var o = QuantumCore.optimizeCircuit(state.gates); setGates(o.gates, state.nQ);
      appendChat("assistant", "Оптимизация: −" + o.removed + " гейтов.\n" + (o.steps.join("\n") || "без изменений"));
    };
    $("btnDSL").onclick = function () {
      var p = DSLTranslator.parseDSL($("dslOut").value, 4);
      if (p.errors.length) appendChat("assistant", p.errors.join("\n")); else setGates(p.gates, p.nQ);
    };
    $("btnQASM").onclick = function () { $("exportBox").value = exportQASM(); };
    $("btnQiskit").onclick = function () { $("exportBox").value = DSLTranslator.toQiskit(state.nQ, state.gates); };
    $("btnChat").onclick = chatSend;
    $("chatIn").onkeydown = function (e) { if (e.key === "Enter") chatSend(); };
    $("btnWallet").onclick = function () {
      CryptoWallet.connect().then(function (s) { $("walletInfo").textContent = s.address.slice(0, 10) + "…"; })
        .catch(function (e) { $("walletInfo").textContent = e.message; });
    };
    $("btnMint").onclick = function () {
      var p = QuantumCore.probs(state.psi || QuantumCore.initState(state.nQ));
      CryptoWallet.mintDemo({ nQ: state.nQ, gatesCount: state.gates.length, hash: state.lastHash || "0", artDataUrl: state.lastArt || "", probs: p, dsl: DSLTranslator.toDSL(state.gates) })
        .then(function (cert) { $("exportBox").value = JSON.stringify(cert, null, 2); appendChat("assistant", "Демо-сертификат: " + cert.certHash.slice(0, 16) + "…\n" + cert.note); });
    };
    initVoice(); loadFromQuery();
    if (!state.gates.length) setGates(AksiBrain.TEMPLATES.bell.gates.slice(), 2);
    AksiBrain.loadChat().forEach(function (m) { appendChat(m.role === "user" ? "user" : "assistant", m.text); });
  }
  global.UIController = { init: init, setGates: setGates, state: state, run: run };
})(typeof window !== "undefined" ? window : globalThis);
