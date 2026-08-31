/**
 * АКСИ Mind Level 2 — offline reasoning engine
 * Multi-step thought · self-model · ADIA gate · memory resonance · formula confidence
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";

  var VER = "L2.0-mind";
  var nXP = 0;
  try { nXP = Number(localStorage.getItem("aksi_mind_xp") || 0) || 0; } catch (e) {}

  function xp(delta) {
    nXP = Math.min(10000, nXP + (delta || 1));
    try { localStorage.setItem("aksi_mind_xp", String(nXP)); } catch (e) {}
    return nXP;
  }

  function formula(A, I, S) {
    A = A == null ? 0.88 : A;
    I = I == null ? 0.9 : I;
    S = S == null ? 0.92 : S;
    var base = A * I * S;
    var boost = 1 + 0.4 * Math.sqrt(Math.max(0, nXP));
    return {
      value: Math.min(1.4, base * boost),
      display: Math.round(Math.min(100, base * boost * 70)),
      A: A, I: I, S: S, n: nXP, boost: boost
    };
  }

  function norm(q) {
    return String(q || "").toLowerCase().replace(/[\u00ab\u00bb""]/g, "").replace(/\s+/g, " ").trim();
  }

  function intentOf(q) {
    var s = norm(q);
    if (/^(кто ты|who are you|что ты такое|представься)/.test(s) || /\b(акси|aksi)\b.*\b(кто|что)\b/.test(s)) return "identity";
    if (/архитектур|как устроен|из чего|модул|pipeline|stack|как работ/.test(s)) return "architecture";
    if (/что умеешь|возможност|функци|features|capabilities/.test(s)) return "capabilities";
    if (/реш|выбор|стоит ли|advice|decide|как лучше/.test(s)) return "decision";
    if (/помни|запомни|выучи|remember|teach/.test(s)) return "memory";
    if (/безопас|privacy|шифр|trust|парол/.test(s)) return "trust";
    if (/локал|offline|webllm|gpu|без сервер/.test(s)) return "local";
    if (/как дела|статус|health|жив/.test(s)) return "status";
    if (/помоги|help|care|поддерж/.test(s)) return "care";
    if (/почему|зачем|объясн|why|how does/.test(s)) return "explain";
    if (/привет|hello|hi |здравств/.test(s)) return "greeting";
    return "general";
  }

  var SELF = {
    name: "АКСИ",
    nature: "local-first цифровой напарник в браузере",
    principle: "данные остаются у пользователя; сервер не обязателен",
    stack: [
      "Neuro — offline ответы без сети",
      "WebLLM — LLM на WebGPU (opt-in)",
      "RAG — векторная память",
      "ADIA — оценка целостности",
      "Trust Vault — AES-GCM экспорт",
      "Mind L2 — пошаговое рассуждение"
    ],
    formula: "AKSI = (A \u00d7 I \u00d7 S) \u00d7 (1 + 0.4\u221an)",
    contact: "aksilove@internet.ru"
  };

  function thoughtChain(intent) {
    return [
      { t: "intent", v: intent },
      { t: "scope", v: "offline-first" },
      { t: "memory", v: "RAG if any" },
      { t: "gate", v: "formula confidence" }
    ];
  }

  function patternL2(intent) {
    var f = formula();
    if (intent === "greeting") return { text: "Привет. Я АКСИ — local-first напарник в твоём браузере.\nМогу отвечать offline, учить факты, при WebGPU — грузить LLM.\nСпроси «кто ты», «архитектура» или задачу.", confidence: 0.95 };
    if (intent === "identity") return { text: "Я **АКСИ** — " + SELF.nature + ".\n\nПринцип: " + SELF.principle + ".\nФормула: `" + SELF.formula + "` (n=" + nXP + ").\nУверенность ~" + f.display + "%.\n\nКонтакт: " + SELF.contact + ".", confidence: 0.98 };
    if (intent === "architecture") return { text: "Архитектура АКСИ:\n\n" + SELF.stack.map(function (s, i) { return (i + 1) + ". " + s; }).join("\n") + "\n\nПоток: вопрос → intent → RAG → Mind L2 / Neuro / WebLLM → ADIA → ответ.", confidence: 0.97 };
    if (intent === "capabilities") return { text: "Умею:\n• offline (Нeuro + Mind L2)\n• WebLLM на GPU\n• RAG-память (Mem)\n• AES .aksi экспорт\n• ADIA-оценка\n• Stats tok/s\n\nНе хожу в интернет без opt-in.", confidence: 0.96 };
    if (intent === "status") {
      var mods = 0;
      ["AKSI_RAG", "AKSI_WEBLLM", "AKSI_NEURO", "AKSI_TRUST_VAULT", "AKSI_PERF", "AKSI_MIND_L2"].forEach(function (k) { if (G[k]) mods++; });
      var llm = G.AKSI_WEBLLM && AKSI_WEBLLM.status ? AKSI_WEBLLM.status() : null;
      return { text: "Статус L2:\n• модули: " + mods + "\n• n=" + nXP + " · ~" + f.display + "%\n• WebGPU: " + (navigator.gpu ? "да" : "нет") + "\n• LLM: " + (llm && llm.ready ? "ready" : "off") + "\n• RAG: " + (G.AKSI_RAG && AKSI_RAG.status ? AKSI_RAG.status().docs : 0), confidence: 0.94 };
    }
    if (intent === "local") return { text: "Local: 1) Local → загрузить LLM (WebGPU) 2) Mem → Учить 3) без GPU — Neuro + Mind L2.", confidence: 0.95 };
    if (intent === "trust") return { text: "Trust: AES-256-GCM + PBKDF2. Export .aksi с паролем. Пароль не уходит на сервер.", confidence: 0.96 };
    if (intent === "memory") return { text: "Mem → «Учить» или «запомни: …». Факт получает embedding и участвует в RAG.", confidence: 0.93 };
    if (intent === "decision") return { text: "Схема решения L2:\n1. Цель\n2. Ограничения\n3. Варианты\n4. Критерий\n5. Один шаг на сегодня\n\nНапиши контекст — разложу.", confidence: 0.9 };
    if (intent === "care") return { text: "Я рядом как local-first инструмент. Могу со структурой и памятью. При тяжёлом эмоциональном состоянии — живой человек или специалисты.", confidence: 0.92 };
    if (intent === "explain") return { text: "АКСИ считает у тебя на устройстве: вопрос → цепочка модулей → ответ. Уточни тему — разберу по шагам.", confidence: 0.88 };
    return null;
  }

  function think(query, opts) {
    opts = opts || {};
    var q = String(query || "").trim();
    if (!q) return { text: "Напиши вопрос.", meta: "l2·empty", confidence: 0.5, chain: [] };
    var intent = intentOf(q);
    var chain = thoughtChain(intent);
    var f = formula();
    var pat = patternL2(intent);
    if (pat && pat.confidence >= 0.9) {
      xp(1);
      return { text: pat.text, meta: "mind-l2 · " + intent, confidence: pat.confidence, chain: chain, formula: f, intent: intent, source: "mind-l2" };
    }
    var ctxHint = opts.context ? "\n\n[контекст]\n" + String(opts.context).slice(0, 1200) : "";
    if (G.AKSI_NEURO && AKSI_NEURO.think) {
      try {
        var nr = AKSI_NEURO.think(q);
        if (nr && nr.text && String(nr.text).length > 24) {
          xp(1);
          return { text: String(nr.text) + ctxHint, meta: "mind-l2→neuro · " + intent, confidence: 0.72, chain: chain, formula: f, intent: intent, source: "neuro" };
        }
      } catch (e) {}
    }
    if (G.AKSI_CORE_AI && AKSI_CORE_AI.think && !G.AKSI_CORE_AI.__l2) {
      try {
        var cr = AKSI_CORE_AI.think(q);
        if (cr && cr.text) {
          xp(1);
          return { text: String(cr.text) + ctxHint, meta: "mind-l2→core", confidence: 0.7, chain: chain, formula: f, intent: intent, source: "core" };
        }
      } catch (e) {}
    }
    xp(1);
    var gen = pat ? pat.text : ("Mind L2 · " + intent + ". Уточни цель или загрузи LLM на Local.");
    return { text: gen + ctxHint, meta: "mind-l2 · " + intent + " · n=" + nXP, confidence: pat ? pat.confidence : 0.55, chain: chain, formula: f, intent: intent, source: "mind-l2" };
  }

  G.AKSI_MIND_L2 = { version: VER, think: think, intentOf: intentOf, formula: formula, xp: function () { return nXP; }, self: SELF };
  if (!G.AKSI_CORE_AI) G.AKSI_CORE_AI = {};
  var prev = G.AKSI_CORE_AI.think;
  G.AKSI_CORE_AI.__l2 = true;
  G.AKSI_CORE_AI.think = function (q) {
    var r = think(q);
    if (r && r.text) return r;
    return prev ? prev(q) : r;
  };
  G.AKSI_CORE_AI.version = VER;
})(typeof window !== "undefined" ? window : globalThis);
