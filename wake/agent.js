/**
 * AKSI Agent — unified ecosystem awareness
 * Sources: Milana-backend aksi_engine + ecosystem.json modules
 */
(function (global) {
  "use strict";

  var SEED = "AKSI_DIMAX_v3_2026";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var CONTACT = "aksilove@internet.ru";

  function hex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }

  async function signThought(text) {
    var payload = SEED + "|" + text + "|" + new Date().toISOString();
    var dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return hex(dig);
  }

  function loadNet() {
    try {
      var a = JSON.parse(localStorage.getItem("AKSI_NET_V1") || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }

  function loadEvolve() {
    try {
      return JSON.parse(localStorage.getItem("AKSI_EVOLVE_V1") || "[]");
    } catch (e) { return []; }
  }

  var KB = [
    { re: /привет|здравствуй|хай|hello/i, a: "Здравствуйте. Я АКСИ — единый контур. Агент, квант, MATRIX, навигатор, глобус." },
    { re: /кто ты|что ты|what are you|что такое акси/i, a: "Я АКСИ — суверенный агент. Репозитории: milana808.github.io (MATRIX), Milana-backend (API), aksi_apps, milana_site. DID: " + DID + "." },
    { re: /did|идентичност|подпись|identity/i, a: "DID: " + DID + "\nSeed: " + SEED + "\nКонтакт: " + CONTACT },
    { re: /репозитор|ecosystem|universe|система|контур/i, a: "Карта системы: https://milana808.github.io/universe/\nMATRIX surface + Milana-backend API + apps. Манифест: /ecosystem.json" },
    { re: /что умеешь|возможност|capabilities|help|помощ/i, a: "Чат с ходом мыслей, Resonance, квант-лаб, MATRIX WebLLM, навигатор GPS, глобус, личная сеть, лог саморазвития (/universe/)." },
    { re: /бэкенд|backend|ollama|fastapi/i, a: "Полный backend: github.com/MILANA808/Milana-backend — agent.py, Ollama, Resonance, globe Socket.IO. На Pages — offline-ядро." },
    { re: /эволюц|саморазвит|evolve/i, a: "Лог эволюции в IndexedDB (AKSI_EVOLVE_V1). Откройте /universe/ → «Записать шаг эволюции»." },
    { re: /глобус|5d|earth|земля/i, a: "Глобус: /globe/ и /earth3d/. Исходники: Milana-backend/aksi-globe." },
    { re: /навигатор|маршрут|gps/i, a: "Навигатор: /nav/ — ВЕСТИ, ПУТЬ, стрелка по GPS." },
  ];

  function C(re, im) { return { re: re || 0, im: im || 0 }; }
  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function abs2(a) { return a.re * a.re + a.im * a.im; }
  var ISQ = 1 / Math.SQRT2;

  function apply1(psi, q, M) {
    var next = [C(), C(), C(), C()];
    for (var b = 0; b < 2; b++) {
      for (var other = 0; other < 2; other++) {
        var i0, i1, out;
        if (q === 0) { i0 = other; i1 = 2 + other; out = b * 2 + other; }
        else { i0 = other * 2; i1 = other * 2 + 1; out = other * 2 + b; }
        next[out] = cadd(cmul(M[b][0], psi[i0]), cmul(M[b][1], psi[i1]));
      }
    }
    return next;
  }

  function runBell() {
    var psi = [C(1), C(), C(), C()];
    psi = apply1(psi, 0, [[C(ISQ), C(ISQ)], [C(ISQ), C(-ISQ)]]);
    var next = [C(), C(), C(), C()];
    for (var q0 = 0; q0 < 2; q0++) for (var q1 = 0; q1 < 2; q1++) {
      var t = q0 ? 1 - q1 : q1;
      next[2 * q0 + t] = cadd(next[2 * q0 + t], psi[2 * q0 + q1]);
    }
    var p = next.map(abs2);
    return {
      gates: "H₀ → CNOT₀₁",
      probs: p,
      text: "P|00⟩=" + p[0].toFixed(3) + "  P|01⟩=" + p[1].toFixed(3) +
        "  P|10⟩=" + p[2].toFixed(3) + "  P|11⟩=" + p[3].toFixed(3) +
        "\nБелл Φ+: запутанность. Лаб: /quantum/ · MATRIX: /aksii-matrix/",
    };
  }

  function searchNet(q) {
    var words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
    var best = null, sc = 0;
    loadNet().forEach(function (page) {
      var blob = ((page.title || "") + " " + (page.body || "")).toLowerCase();
      var s = 0;
      words.forEach(function (w) { if (blob.indexOf(w) >= 0) s += 2; });
      if (s > sc) { sc = s; best = page; }
    });
    if (best && sc >= 2) return { title: best.title, body: best.body };
    return null;
  }

  async function wiki(q) {
    if (!navigator.onLine) return null;
    try {
      var query = q.replace(/^(что такое|кто такой|расскажи про|почему)\s+/i, "").trim();
      if (query.length < 2) return null;
      var s = await fetch(
        "https://ru.wikipedia.org/w/api.php?action=opensearch&search=" +
          encodeURIComponent(query) + "&limit=1&format=json&origin=*"
      ).then(function (r) { return r.json(); });
      if (!s[1] || !s[1][0]) return null;
      var j = await fetch(
        "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(s[1][0])
      ).then(function (r) { return r.json(); });
      if (!j.extract) return null;
      return j.title + ".\n\n" + String(j.extract).slice(0, 900);
    } catch (e) { return null; }
  }

  function kbMatch(q) {
    for (var i = 0; i < KB.length; i++) {
      if (KB[i].re.test(q)) return KB[i].a;
    }
    return null;
  }

  async function process(message, opts) {
    opts = opts || {};
    var thoughts = [];
    var tools = [];
    var q = String(message || "").trim();
    thoughts.push("Приняла (" + q.length + " симв.).");
    thoughts.push("Контур: MATRIX surface + backend knowledge.");

    var evo = loadEvolve();
    if (evo.length) thoughts.push("Шагов эволюции в памяти: " + evo.length);

    if (/квант|запутан|белл|qubit|кубит|cnot/i.test(q)) {
      thoughts.push("Tool quantum.");
      var bell = runBell();
      tools.push({ name: "quantum", data: bell });
      var sigQ = await signThought(bell.text);
      return { thoughts: thoughts, answer: bell.text, tools: tools, sig: sigQ, source: "tool:quantum" };
    }

    thoughts.push("Net…");
    var net = searchNet(q);
    if (net) {
      thoughts.push("Net: «" + net.title + "».");
      var sigN = await signThought(net.body);
      return { thoughts: thoughts, answer: net.body, tools: tools, sig: sigN, source: "net:" + net.title };
    }

    thoughts.push("Ядро…");
    var hit = kbMatch(q);
    if (hit) {
      var sigK = await signThought(hit);
      return { thoughts: thoughts, answer: hit, tools: tools, sig: sigK, source: "core" };
    }

    if (typeof opts.llm === "function") {
      thoughts.push("LLM…");
      try {
        var llmAns = await opts.llm(q);
        if (llmAns) {
          var sigL = await signThought(llmAns);
          return { thoughts: thoughts, answer: llmAns, tools: tools, sig: sigL, source: "webllm" };
        }
      } catch (e) {
        thoughts.push("LLM error");
      }
    }

    thoughts.push("Wikipedia…");
    var w = await wiki(q);
    if (w) {
      var sigW = await signThought(w);
      return { thoughts: thoughts, answer: w, tools: tools, sig: sigW, source: "wikipedia" };
    }

    var fallback =
      "Слышу. Уточните или откройте /universe/ — карта всей системы. " +
      "Квант, identity, эволюция, backend — могу по этим темам.";
    var sigF = await signThought(fallback);
    return { thoughts: thoughts, answer: fallback, tools: tools, sig: sigF, source: "fallback" };
  }

  function format(result) {
    var lines = ["Ход:"];
    result.thoughts.forEach(function (t, i) {
      lines.push("[" + (i + 1) + "] " + t);
    });
    lines.push("");
    lines.push(result.answer);
    lines.push("");
    lines.push("🔏 " + (result.sig || "").slice(0, 32) + "…");
    if (result.source) lines.push("src: " + result.source);
    return lines.join("\n");
  }

  global.AksiAgent = {
    DID: DID,
    SEED: SEED,
    CONTACT: CONTACT,
    process: process,
    format: format,
    signThought: signThought,
    runBell: runBell,
  };
})(typeof window !== "undefined" ? window : self);
