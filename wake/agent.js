/**
 * AKSI Agent — restored from Milana-backend/aksi + aksi_engine
 * Offline-first: knowledge, tools (quantum, wiki, net), thought chain, Resonance
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

  var KB = [
    { re: /привет|здравствуй|хай|hello/i, a: "Здравствуйте. Я АКСИ — на связи. Живой агент: ход мыслей, подпись Resonance, квант, сеть знаний." },
    { re: /кто ты|что ты|what are you|что такое акси/i, a: "Я АКСИ — суверенный агент из Milana-backend. Identity, память, инструменты (квант, поиск, сеть). DID: " + DID + "." },
    { re: /did|идентичност|подпись|identity/i, a: "DID: " + DID + "\nSeed: " + SEED + "\nКонтакт: " + CONTACT + "\nКаждая мысль подписывается SHA-256 (Resonance)." },
    { re: /что умеешь|возможност|capabilities|help|помощ/i, a: "Умею: диалог с ходом мыслей, подпись, личная сеть, Wikipedia, квантовый симулятор (H/CNOT/Белл), навигатор, MATRIX. Спросите про запутанность — посчитаю вероятности." },
    { re: /небо.*голуб|почему.*небо/i, a: "Небо кажется голубым из‑за рассеяния Рэлея: молекулы воздуха сильнее рассеивают короткие (синие) волны." },
    { re: /глобус|5d|earth|земля/i, a: "Глобус: https://milana808.github.io/globe/ и /earth3d/ — визуальный слой планеты." },
    { re: /навигатор|маршрут|gps/i, a: "Навигатор: https://milana808.github.io/nav/ — ВЕСТИ, ПУТЬ, стрелка по GPS." },
  ];

  // ——— Quantum tool (2-qubit, fixed math) ———
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
        "\nЭто Белл Φ+: измерения кубитов коррелированы (запутанность)." +
        "\nИнтерактив: https://milana808.github.io/quantum/",
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

  /**
   * Main agent turn — returns { thoughts, answer, tools, sig, source }
   */
  async function process(message, opts) {
    opts = opts || {};
    var thoughts = [];
    var tools = [];
    var q = String(message || "").trim();
    thoughts.push("Приняла сообщение (" + q.length + " симв.).");
    thoughts.push("Сессия: offline-first · DID " + DID.slice(0, 28) + "…");

    // Tool: quantum
    if (/квант|запутан|белл|qubit|кубит|cnot|схем.*квант/i.test(q)) {
      thoughts.push("Инструмент quantum: statevector H+CNOT.");
      var bell = runBell();
      tools.push({ name: "quantum", data: bell });
      var sigQ = await signThought(bell.text);
      return {
        thoughts: thoughts,
        answer: bell.text,
        tools: tools,
        sig: sigQ,
        source: "tool:quantum",
      };
    }

    // Net
    thoughts.push("Ищу в личной сети (Net)…");
    var net = searchNet(q);
    if (net) {
      thoughts.push("Нашла в сети: «" + net.title + "».");
      var ansN = net.body;
      var sigN = await signThought(ansN);
      return { thoughts: thoughts, answer: ansN, tools: tools, sig: sigN, source: "net:" + net.title };
    }

    // KB
    thoughts.push("Проверяю ядро знаний АКСИ…");
    var hit = kbMatch(q);
    if (hit) {
      thoughts.push("Ответ из ядра.");
      var sigK = await signThought(hit);
      return { thoughts: thoughts, answer: hit, tools: tools, sig: sigK, source: "core" };
    }

    // External LLM hook (WebLLM) if provided
    if (typeof opts.llm === "function") {
      thoughts.push("Передаю в локальную LLM…");
      try {
        var llmAns = await opts.llm(q);
        if (llmAns) {
          var sigL = await signThought(llmAns);
          return { thoughts: thoughts, answer: llmAns, tools: tools, sig: sigL, source: "webllm" };
        }
      } catch (e) {
        thoughts.push("LLM сбой: " + (e.message || e));
      }
    }

    // Wiki
    thoughts.push("Пробую Wikipedia…");
    var w = await wiki(q);
    if (w) {
      thoughts.push("Есть статья.");
      var sigW = await signThought(w);
      return { thoughts: thoughts, answer: w, tools: tools, sig: sigW, source: "wikipedia" };
    }

    thoughts.push("Точного факта нет — честный ответ.");
    var fallback =
      "Слышу вас. В ядре и сети нет точного ответа. " +
      "Добавьте знание во вкладке Сеть (/app/) или спросите про identity, квант, навигатор. " +
      "Для полной LLM откройте MATRIX и дождитесь загрузки модели.";
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
