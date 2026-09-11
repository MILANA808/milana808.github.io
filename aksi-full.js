/** AKSI Full System v9.0 · generation-first · aksilove@internet.ru */
(function () {
  "use strict";
  var VER = "9.0.0";
  var history = [];
  var lastSup = [];
  var genMode = true;

  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function status(m) { var e = $("status"); if (e) e.textContent = m || ""; }
  function setPipe(n) {
    try {
      document.querySelectorAll("#pipe div").forEach(function (el) {
        el.classList.toggle("on", Number(el.getAttribute("data-s")) <= n);
      });
    } catch (e) {}
  }
  function fnv1a(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ("00000000" + h.toString(16)).slice(-8);
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
  }

  var SEED = [
    { k: ["кто ты", "что ты", "представься", "привет", "здравствуй"],
      a: "Я АКСИ — локальный ИИ в браузере.\n\nОсновной режим: генерация следующего токена (Кора WebLLM / WASM).\nВеб — только контекст, не замена модели.\n\nВключите «Режим LLM» и дождитесь загрузки коры.\naksilove@internet.ru" },
    { k: ["вопрос нашего времени", "мировой вопрос", "главн проблем", "проблема ии"],
      a: "Вопрос нашего времени: как получить пользу от сильных моделей без потери контроля над данными и решением.\n\nАКСИ отвечает локальной генерацией (next-token) + явным seal, а не только поиском." },
    { k: ["искусственный интеллект", "что такое ии", "llm", "языков модель", "chatgpt", "gpt"],
      a: "ИИ / LLM предсказывают следующий токен по контексту. Облачные чаты сильны, но забирают данные.\nАКСИ считает токены локально в браузере (WebGPU Qwen или WASM fallback)." },
    { k: ["нейронн сеть", "нейронная сеть", "нейронные сети"],
      a: "Нейронная сеть — слои узлов и веса, обучение на данных. LLM — крупные сети, обученные предсказывать следующий токен." },
    { k: ["квантовый компьютер", "квантовые компьютер", "кубит"],
      a: "Квантовый компьютер работает с кубитами в суперпозиции. В АКСИ «коллапс» — выбор среди кандидатов ответа, не физический QC." },
    { k: ["гравитац", "тяготен"],
      a: "Гравитация — притяжение масс. Ньютон: F ∝ m1·m2/r². ОТО: искривление пространства-времени." },
    { k: ["фотосинтез"],
      a: "Фотосинтез: свет + CO₂ + H₂O → органика + O₂. Хлоропласты, хлорофилл; световая и темновая фазы." },
    { k: ["блокчейн", "биткоин", "bitcoin"],
      a: "Блокчейн — цепочка блоков с хешами. Биткоин (2009) — децентрализованная криптовалюта." },
    { k: ["миссия", "зачем", "польза", "что умеешь"],
      a: "Миссия АКСИ — полезная генерация в браузере с контролем: next-token кора + факты + seal.\naksilove@internet.ru" }
  ];

  function seedMatch(q) {
    var nq = norm(q), best = null, score = 0;
    for (var i = 0; i < SEED.length; i++) {
      var s = 0;
      for (var j = 0; j < SEED[i].k.length; j++) {
        var k = norm(SEED[i].k[j]);
        if (k && nq.indexOf(k) !== -1) s += 10 + k.length;
      }
      if (s > score) { score = s; best = SEED[i]; }
    }
    if (score >= 6) return { text: best.a, conf: Math.min(0.97, 0.82 + score / 40), source: "ядро" };
    return null;
  }

  function memAll() { try { return JSON.parse(localStorage.getItem("aksi_full_mem") || "[]"); } catch (e) { return []; } }
  function memWrite(a) { try { localStorage.setItem("aksi_full_mem", JSON.stringify(a.slice(-400))); } catch (e) {} }
  function memAdd(t) { var a = memAll(); a.push({ t: Date.now(), text: String(t).slice(0, 500) }); memWrite(a); }
  function memSearch(q) {
    var words = norm(q).split(" ").filter(function (w) { return w.length > 3; });
    var hits = [], list = memAll();
    for (var i = list.length - 1; i >= 0 && hits.length < 3; i--) {
      var t = norm(list[i].text);
      for (var w = 0; w < words.length; w++) if (t.indexOf(words[w]) !== -1) { hits.push(list[i].text); break; }
    }
    return hits.length ? hits.join("\n") : "";
  }
  function sealsAll() { try { return JSON.parse(localStorage.getItem("aksi_full_seals") || "[]"); } catch (e) { return []; } }
  function sealPush(q, a, src, p) {
    var h = fnv1a(q + "|" + a + "|" + src + "|" + p);
    var list = sealsAll();
    list.push({ t: Date.now(), q: String(q).slice(0, 100), h: h, src: src, p: p });
    try { localStorage.setItem("aksi_full_seals", JSON.stringify(list.slice(-50))); } catch (e) {}
    return h;
  }

  function withTimeout(p, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(null); } }, ms);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } })
       .catch(function () { if (!done) { done = true; clearTimeout(t); resolve(null); } });
    });
  }
  function stripTopic(q) {
    return String(q).replace(/^(что такое|кто такой|кто такая|what is|who is|расскажи про|расскажи о|объясни|почему|как работает|подробно)\s+/i, "").replace(/\?+$/g, "").trim() || q;
  }
  async function fetchWiki(q) {
    var topic = stripTopic(q);
    try {
      var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(topic.replace(/\s+/g, "_"));
      var r = await withTimeout(fetch(url, { mode: "cors" }).then(function (res) {
        if (!res.ok) throw new Error("x"); return res.json();
      }), 2500);
      if (r && r.extract && r.type !== "disambiguation")
        return { title: r.title, text: r.extract, url: (r.content_urls && r.content_urls.desktop && r.content_urls.desktop.page) || "", source: "wikipedia" };
    } catch (e) {}
    try {
      var sUrl = "https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(topic) + "&srlimit=1&format=json&origin=*";
      var s = await withTimeout(fetch(sUrl, { mode: "cors" }).then(function (res) { return res.json(); }), 2500);
      var hit = s && s.query && s.query.search && s.query.search[0];
      if (!hit) return null;
      var url2 = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(hit.title.replace(/ /g, "_"));
      var r2 = await withTimeout(fetch(url2, { mode: "cors" }).then(function (res) {
        if (!res.ok) throw new Error("x"); return res.json();
      }), 2500);
      if (r2 && r2.extract)
        return { title: r2.title, text: r2.extract, url: (r2.content_urls && r2.content_urls.desktop && r2.content_urls.desktop.page) || "", source: "wikipedia" };
    } catch (e) {}
    return null;
  }

  function cortexReady() {
    try {
      if (window.AKSI_WEBLLM && AKSI_WEBLLM.ready) return !!AKSI_WEBLLM.ready();
      return !!(window.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status().ready);
    } catch (e) { return false; }
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  async function ensureCortex() {
    status("Загрузка модели (next-token)… первый раз может занять несколько минут");
    if (!window.AKSI_WEBLLM) await loadScript("/aksi-webllm.js?v=9");
    if (!window.AKSI_WEBLLM) throw new Error("aksi-webllm.js не загрузился");
    if (cortexReady()) {
      status("Кора готова — генерация токенов");
      return true;
    }
    if (AKSI_WEBLLM.autoLoad) {
      await AKSI_WEBLLM.autoLoad(function (info) {
        if (typeof info === "string") status(info);
        else if (info) {
          var p = info.progress != null ? Math.round(Number(info.progress)) : null;
          var m = info.message || info.text || info.progress_text || "";
          status((p != null ? p + "% · " : "") + (m || "загрузка модели…"));
        }
      });
    } else if (AKSI_WEBLLM.load) {
      await AKSI_WEBLLM.load(null, function () {});
    }
    var ok = cortexReady();
    status(ok ? "Кора готова — можно генерировать" : "Модель не поднялась (нужен Chrome + WebGPU или WASM)");
    updateCortexBtn();
    return ok;
  }

  function updateCortexBtn() {
    var btn = $("cortexBtn");
    if (!btn) return;
    if (cortexReady()) {
      btn.textContent = "LLM ON";
      btn.style.background = "rgba(110,231,160,.25)";
    } else {
      btn.textContent = "Загрузить LLM";
    }
  }

  async function generateAnswer(query, contextFacts) {
    if (!cortexReady()) return null;
    var ctx = "";
    if (contextFacts && contextFacts.length) {
      ctx = contextFacts.slice(0, 3).map(function (f, i) {
        return (i + 1) + ") " + String(f.text || "").slice(0, 320);
      }).join("\n");
    }
    var mem = memSearch(query);
    if (mem) ctx += (ctx ? "\n" : "") + "Память:\n" + mem.slice(0, 400);
    var hist = history.slice(-3).map(function (t) {
      return "Пользователь: " + t.q + "\nАКСИ: " + String(t.a).slice(0, 200);
    }).join("\n");

    status("Генерация токенов…");
    setPipe(3);
    var prompt =
      (hist ? "Недавний диалог:\n" + hist + "\n\n" : "") +
      (ctx ? "Справка (не копируй дословно, используй как фон):\n" + ctx + "\n\n" : "") +
      "Вопрос пользователя: " + query + "\n\n" +
      "Сгенерируй полный ответ на русском: сначала суть (1–2 предложения), затем пояснение.";

    var r = await AKSI_WEBLLM.complete(prompt, {
      system:
        "Ты АКСИ — локальная языковая модель. Ты генерируешь ответ по токенам, как LLM.\n" +
        "Только русский язык. Пиши связный текст, не список ссылок.\n" +
        "Не говори что ты поисковик. Если фактов мало — рассуждай осторожно и помечай неуверенность.",
      temperature: 0.55,
      max_tokens: 700
    });
    var text = String((r && (r.text || r.answer)) || "").trim();
    if (!text || text.length < 20) return null;
    if (!/[а-яёА-ЯЁ]/.test(text)) return null;
    return {
      text: text,
      conf: 0.97,
      source: "генерация",
      model: (r && r.model) || "",
      backend: (r && r.backend) || ""
    };
  }

  async function fullThink(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "" };

    if (/^запомни\s*[:：]/i.test(query)) {
      var fact = query.replace(/^запомни\s*[:：]\s*/i, "").trim();
      memAdd(fact); renderMem();
      return { ok: true, answer: "Запомнила: «" + fact.slice(0, 220) + "».", source: "память", probability: 1, superposition: [], seal: sealPush(query, fact, "память", 1), version: VER };
    }

    var wantGen = opts.generate !== false && genMode;
    setPipe(1); status(wantGen ? "1 · Готовлю генерацию…" : "1 · Ищу факты…");

    var facts = [];
    var useWeb = opts.web !== false && !!($("useWeb") && $("useWeb").checked);
    if (useWeb) {
      status("1 · Контекст из веба…");
      var w = await fetchWiki(query);
      if (w) facts.push(w);
    }
    var seed = seedMatch(query);
    if (seed) facts.push(seed);

    setPipe(2);

    if (wantGen) {
      if (!cortexReady()) {
        status("Модель не загружена — запускаю загрузку…");
        try {
          var ok = await ensureCortex();
          if (!ok) wantGen = false;
        } catch (e) {
          status("Загрузка модели: " + (e.message || e));
          wantGen = false;
        }
      }
    }

    if (wantGen && cortexReady()) {
      var gen = await generateAnswer(query, facts);
      if (gen) {
        setPipe(5); status("");
        var h = sealPush(query, gen.text, "генерация", gen.conf);
        history.push({ q: query, a: gen.text });
        if (history.length > 12) history = history.slice(-12);
        lastSup = [{ source: "генерация", probability: 1, preview: gen.text.slice(0, 160), selected: true }];
        return {
          ok: true,
          answer: gen.text,
          source: "генерация",
          probability: 1,
          superposition: lastSup,
          seal: h,
          cortex: true,
          model: gen.model,
          backend: gen.backend,
          version: VER
        };
      }
    }

    setPipe(4); status("4 · Запасной путь (без модели)…");
    var answer = seed ? seed.text : null;
    if (!answer && facts[0] && facts[0].text) {
      answer = String(facts[0].text).slice(0, 600) +
        "\n\n— Это контекст из источника, не генерация модели.\nВключите «Режим LLM» и дождитесь загрузки коры для next-token ответа.";
    }
    if (!answer) {
      answer =
        "Чтобы АКСИ генерировала ответ как LLM (следующий токен), нужно:\n\n" +
        "1) Chrome / Edge с WebGPU (или WASM fallback)\n" +
        "2) Нажать «Загрузить LLM» и дождаться 100%\n" +
        "3) Спросить снова\n\n" +
        "Без модели доступны только ядро и веб-контекст — это не генерация.\n" +
        "aksilove@internet.ru";
    }
    setPipe(5); status("");
    var src = seed ? "ядро" : (facts[0] ? "контекст" : "пробел");
    var h2 = sealPush(query, answer, src, 0.4);
    history.push({ q: query, a: answer });
    lastSup = [{ source: src, probability: 0.4, preview: answer.slice(0, 140), selected: true }];
    return {
      ok: true,
      answer: answer,
      source: src,
      probability: 0.4,
      superposition: lastSup,
      seal: h2,
      cortex: cortexReady(),
      version: VER
    };
  }

  function renderSup() {
    var el = $("supList"); if (!el) return;
    if (!lastSup.length) { el.innerHTML = '<li class="meta">Нет данных</li>'; return; }
    el.innerHTML = lastSup.map(function (s) {
      return '<li class="' + (s.selected ? "sel" : "") + '"><span class="p">' + ((s.probability || 0) * 100).toFixed(0) +
        "%</span> · <b>" + s.source + "</b>" + (s.selected ? " ← выбран" : "") + "<br>" +
        String(s.preview || "").replace(/</g, "<") + "</li>";
    }).join("");
  }
  function renderMem() {
    var list = memAll().slice().reverse(), el = $("memList"); if (!el) return;
    if (!list.length) { el.innerHTML = '<li class="meta">Пусто</li>'; return; }
    el.innerHTML = list.slice(0, 40).map(function (m) {
      return "<li>" + String(m.text).replace(/</g, "<") + '<div class="meta">' + new Date(m.t).toLocaleString() + "</div></li>";
    }).join("");
  }
  function renderSeals() {
    var list = sealsAll().slice().reverse(), el = $("sealList"); if (!el) return;
    if (!list.length) { el.innerHTML = '<li class="meta">Пусто</li>'; return; }
    el.innerHTML = list.slice(0, 25).map(function (s) {
      return '<li><span class="trail">' + s.h + "</span> · " + (s.src || "") +
        "<br>" + String(s.q || "").replace(/</g, "<") + '<div class="meta">' + new Date(s.t).toLocaleString() + "</div></li>";
    }).join("");
  }
  function renderSys() {
    var el = $("sysOut"); if (!el) return;
    var st = {};
    try { st = (window.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status()) || {}; } catch (e) {}
    el.textContent =
      "Версия: " + VER +
      "\nРежим: " + (genMode ? "ГЕНЕРАЦИЯ (next-token)" : "только факты") +
      "\nКора: " + (cortexReady() ? "ON · " + (st.model || st.currentModel || "") : "OFF") +
      "\nBackend: " + (st.backend || "—") +
      "\nПамять: " + memAll().length +
      "\nSeal: " + sealsAll().length +
      "\naksilove@internet.ru";
  }

  async function ask(raw) {
    var q = String(raw != null ? raw : ($("q") && $("q").value) || "").trim();
    if (!q) return;
    if ($("q")) $("q").value = q;
    if ($("go")) $("go").disabled = true;
    if ($("out")) $("out").textContent = "…";
    if ($("meta")) $("meta").textContent = "";
    genMode = !($("useGen") && !$("useGen").checked);
    try {
      var r = await fullThink(q, {
        web: !!($("useWeb") && $("useWeb").checked),
        generate: genMode
      });
      if ($("out")) $("out").textContent = r.answer || "—";
      if ($("meta")) {
        var extra = r.model ? (" · " + r.model) : "";
        $("meta").textContent =
          (r.source || "") + " · seal " + (r.seal || "") +
          " · " + (r.cortex ? "LLM" : "без LLM") + extra + " · " + VER;
      }
      lastSup = r.superposition || lastSup;
      renderSup(); renderSeals(); renderSys();
    } catch (e) {
      if ($("out")) $("out").textContent = "Ошибка: " + (e.message || e);
    } finally {
      if ($("go")) $("go").disabled = false;
      if (!cortexReady()) status("");
    }
  }

  function showTab(name) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("on", p.id === "p-" + name); });
    document.querySelectorAll(".tab[data-tab], .bnav button[data-tab]").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-tab") === name);
    });
    if (name === "sup") renderSup();
    if (name === "mem") renderMem();
    if (name === "seal") renderSeals();
    if (name === "sys") renderSys();
  }

  function boot() {
    if (!$("go")) return;
    if ($("ver")) $("ver").textContent = "АКСИ " + VER;
    $("go").onclick = function () { ask(); };
    if ($("q")) $("q").addEventListener("keydown", function (e) { if (e.key === "Enter") ask(); });
    document.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () { ask(b.getAttribute("data-q")); };
    });
    document.querySelectorAll(".tab[data-tab], .bnav button[data-tab]").forEach(function (t) {
      t.onclick = function () { showTab(t.getAttribute("data-tab")); };
    });
    if ($("memSave")) $("memSave").onclick = function () {
      var v = (($("memIn") && $("memIn").value) || "").trim(); if (!v) return;
      ask(/^запомни/i.test(v) ? v : "запомни: " + v);
      if ($("memIn")) $("memIn").value = "";
      showTab("mem");
    };
    if ($("memClear")) $("memClear").onclick = function () {
      if (confirm("Очистить память?")) { memWrite([]); renderMem(); }
    };
    if ($("cortexBtn")) $("cortexBtn").onclick = async function () {
      var btn = $("cortexBtn"); btn.disabled = true;
      try {
        await ensureCortex();
      } catch (e) {
        status("LLM: " + (e.message || e));
      } finally {
        btn.disabled = false;
        updateCortexBtn();
        renderSys();
      }
    };
    if ($("useGen")) {
      $("useGen").checked = true;
      $("useGen").onchange = function () {
        genMode = !!$("useGen").checked;
        renderSys();
      };
    }
    updateCortexBtn();
    renderSys();
    status("Режим LLM: нажмите «Загрузить LLM», затем спрашивайте — ответ будет генерацией токенов");
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
  if (typeof window !== "undefined") {
    window.AKSI = { version: VER, think: fullThink, ask: ask, ensureCortex: ensureCortex };
  }
})();
