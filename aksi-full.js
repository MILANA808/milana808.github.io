/** AKSI Full System v9.1 · complete generation product · aksilove@internet.ru */
(function () {
  "use strict";
  var VER = "9.1.0";
  var history = [];
  var lastSup = [];
  var genMode = true;
  var loadingModel = false;

  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
  function status(m) { var e = $("status"); if (e) e.textContent = m || ""; }
  function setBar(pct) {
    var b = $("loadBar");
    var f = $("loadFill");
    if (!b || !f) return;
    if (pct == null || pct < 0) { b.style.display = "none"; return; }
    b.style.display = "block";
    f.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }
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
      a: "Я АКСИ — локальный ИИ в браузере.\n\nОсновной режим: генерация следующего токена (WebLLM / WASM).\nВеб — только контекст для модели.\n\nНажмите «Загрузить LLM», дождитесь готовности, затем спрашивайте.\naksilove@internet.ru" },
    { k: ["вопрос нашего времени", "мировой вопрос", "главн проблем", "проблема ии"],
      a: "Вопрос нашего времени: польза сильных моделей без потери контроля над данными и решением.\n\nАКСИ — локальная next-token генерация + seal, а не облачный чёрный ящик." },
    { k: ["искусственный интеллект", "что такое ии", "llm", "языков модель", "chatgpt", "gpt"],
      a: "LLM предсказывает следующий токен по контексту. АКСИ считает токены локально (Qwen через WebGPU или WASM)." },
    { k: ["нейронн сеть", "нейронная сеть", "нейронные сети"],
      a: "Нейронная сеть — слои узлов и веса. LLM — большая сеть, обученная предсказывать следующий токен текста." },
    { k: ["гравитац", "тяготен"],
      a: "Гравитация — притяжение масс. Ньютон: F ∝ m1·m2/r². ОТО: искривление пространства-времени." },
    { k: ["фотосинтез"],
      a: "Фотосинтез: свет + CO₂ + H₂O → органика + O₂. Хлоропласты, хлорофилл." },
    { k: ["блокчейн", "биткоин", "bitcoin"],
      a: "Блокчейн — цепочка блоков с хешами. Биткоин (2009) — децентрализованная криптовалюта." },
    { k: ["миссия", "зачем", "польза", "что умеешь"],
      a: "Миссия — полезная локальная генерация с контролем: next-token + контекст + seal.\naksilove@internet.ru" }
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
      if (window.AKSI_WEBLLM && typeof AKSI_WEBLLM.ready === "function") return !!AKSI_WEBLLM.ready();
      return !!(window.AKSI_WEBLLM && AKSI_WEBLLM.status && AKSI_WEBLLM.status().ready);
    } catch (e) { return false; }
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var base = src.split("?")[0];
      if (document.querySelector('script[src="' + base + '"]') || document.querySelector('script[src^="' + base + '"]')) {
        resolve(); return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Не загрузился " + src)); };
      document.head.appendChild(s);
    });
  }

  function onProgressInfo(info) {
    if (typeof info === "string") { status(info); return; }
    if (!info) return;
    var p = info.progress;
    if (p != null) {
      var n = Number(p);
      if (n <= 1) n = n * 100;
      setBar(n);
      status(Math.round(n) + "% · " + (info.message || info.text || info.progress_text || "загрузка модели…"));
    } else if (info.message || info.text) {
      status(String(info.message || info.text));
    }
  }

  async function ensureCortex() {
    if (cortexReady()) {
      setBar(100);
      status("Модель готова — генерация токенов");
      updateCortexBtn();
      return true;
    }
    if (loadingModel) {
      status("Модель уже загружается…");
      return false;
    }
    loadingModel = true;
    updateCortexBtn();
    try {
      status("Подключаю runtime WebLLM…");
      setBar(2);
      if (!window.AKSI_WEBLLM) await loadScript("/aksi-webllm.js?v=91");
      if (!window.AKSI_WEBLLM) throw new Error("aksi-webllm.js не загрузился");

      status("Скачиваю веса модели (первый раз 2–10 мин)…");
      if (AKSI_WEBLLM.autoLoad) {
        await AKSI_WEBLLM.autoLoad(onProgressInfo);
      } else if (AKSI_WEBLLM.load) {
        await AKSI_WEBLLM.load(null, onProgressInfo);
      }
      var ok = cortexReady();
      setBar(ok ? 100 : -1);
      status(ok ? "Модель готова — спрашивайте" : "Модель не поднялась. Нужен Chrome/Edge + WebGPU или WASM.");
      updateCortexBtn();
      renderSys();
      return ok;
    } catch (e) {
      setBar(-1);
      status("Ошибка загрузки: " + (e.message || e));
      updateCortexBtn();
      throw e;
    } finally {
      loadingModel = false;
      updateCortexBtn();
    }
  }

  function updateCortexBtn() {
    var btn = $("cortexBtn");
    if (!btn) return;
    if (loadingModel) {
      btn.textContent = "Загрузка…";
      btn.disabled = true;
      return;
    }
    btn.disabled = false;
    if (cortexReady()) {
      btn.textContent = "LLM ON ✓";
      btn.style.background = "rgba(110,231,160,.3)";
      btn.style.color = "#ecfdf5";
    } else {
      btn.textContent = "Загрузить LLM";
      btn.style.background = "";
      btn.style.color = "";
    }
  }

  async function generateAnswer(query, contextFacts) {
    if (!cortexReady()) return { error: "модель не готова" };
    var ctx = "";
    if (contextFacts && contextFacts.length) {
      ctx = contextFacts.slice(0, 3).map(function (f, i) {
        return (i + 1) + ") " + String(f.text || "").slice(0, 360);
      }).join("\n");
    }
    var mem = memSearch(query);
    if (mem) ctx += (ctx ? "\n" : "") + "Память пользователя:\n" + mem.slice(0, 400);
    var hist = history.slice(-4).map(function (t) {
      return "Пользователь: " + t.q + "\nАКСИ: " + String(t.a).slice(0, 220);
    }).join("\n");

    status("Генерация токенов…");
    setPipe(3);
    if ($("out")) $("out").textContent = "⏳ Модель пишет…";

    var prompt =
      (hist ? "Диалог:\n" + hist + "\n\n" : "") +
      (ctx ? "Справка (фон, не копируй дословно):\n" + ctx + "\n\n" : "") +
      "Вопрос: " + query + "\n\n" +
      "Ответь полностью по-русски: сначала прямой ответ, затем краткое пояснение.";

    var r;
    try {
      r = await AKSI_WEBLLM.complete(prompt, {
        system:
          "Ты АКСИ — локальная языковая модель. Ты генерируешь текст по токенам.\n" +
          "Только русский. Связные предложения. Не выдавай себя за поисковик.\n" +
          "Не выдумывай точные даты/цифры без справки. Если не уверен — скажи об этом.",
        temperature: 0.6,
        max_tokens: 768
      });
    } catch (e) {
      return { error: String((e && e.message) || e) };
    }

    if (r && r.error && !r.text) return { error: r.error };
    var text = String((r && (r.text || r.answer)) || "").trim();
    if (!text || text.length < 12) return { error: "пустой ответ модели" };
    return {
      text: text,
      conf: 0.98,
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
    setPipe(1);

    var facts = [];
    var useWeb = opts.web !== false && !!($("useWeb") && $("useWeb").checked);
    if (useWeb) {
      status("Собираю контекст…");
      var w = await fetchWiki(query);
      if (w) facts.push(w);
    }
    var seed = seedMatch(query);
    if (seed) facts.push(seed);

    setPipe(2);

    if (wantGen && !cortexReady()) {
      status("Модель нужна для генерации — загружаю…");
      try {
        var okLoad = await ensureCortex();
        if (!okLoad) wantGen = false;
      } catch (e) {
        wantGen = false;
        status("Загрузка не удалась: " + (e.message || e));
      }
    }

    if (wantGen && cortexReady()) {
      var gen = await generateAnswer(query, facts);
      if (gen && gen.text) {
        setPipe(5); status(""); setBar(-1);
        var h = sealPush(query, gen.text, "генерация", 1);
        history.push({ q: query, a: gen.text });
        if (history.length > 16) history = history.slice(-16);
        lastSup = [{ source: "генерация", probability: 1, preview: gen.text.slice(0, 180), selected: true }];
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
      if (gen && gen.error) status("Генерация: " + gen.error);
    }

    setPipe(4);
    var answer = null;
    var src = "пробел";
    if (seed) { answer = seed.text; src = "ядро"; }
    else if (facts[0] && facts[0].text) {
      answer = String(facts[0].text).slice(0, 700) +
        "\n\n— Это справочный контекст, не генерация LLM.\nНажмите «Загрузить LLM» для next-token ответа.";
      src = "контекст";
    } else {
      answer =
        "Для ответа как у LLM нужна локальная модель.\n\n" +
        "1) Chrome или Edge\n" +
        "2) «Загрузить LLM» → дождаться 100%\n" +
        "3) Спросить снова\n\n" +
        "Галочка «Режим LLM» должна быть включена.\naksilove@internet.ru";
    }
    setPipe(5); status(""); setBar(-1);
    var h2 = sealPush(query, answer, src, 0.35);
    history.push({ q: query, a: answer });
    lastSup = [{ source: src, probability: 0.35, preview: answer.slice(0, 140), selected: true }];
    return {
      ok: true,
      answer: answer,
      source: src,
      probability: 0.35,
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
        "%</span> · <b>" + s.source + "</b>" + (s.selected ? " ←" : "") + "<br>" +
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
      "\nРежим: " + (genMode ? "ГЕНЕРАЦИЯ next-token" : "факты") +
      "\nМодель: " + (cortexReady() ? "ON" : "OFF") +
      "\nИмя: " + (st.model || "—") +
      "\nBackend: " + (st.backend || "—") +
      "\nWebGPU: " + (st.webgpu === true ? "да" : st.webgpu === false ? "нет" : "?") +
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
        var be = r.backend ? (" · " + r.backend) : "";
        $("meta").textContent =
          (r.source || "") + " · seal " + (r.seal || "") +
          " · " + (r.source === "генерация" ? "LLM ✓" : "без генерации") + extra + be + " · " + VER;
      }
      lastSup = r.superposition || lastSup;
      renderSup(); renderSeals(); renderSys();
    } catch (e) {
      if ($("out")) $("out").textContent = "Ошибка: " + (e.message || e);
    } finally {
      if ($("go")) $("go").disabled = false;
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
      try { await ensureCortex(); } catch (e) { status("LLM: " + (e.message || e)); }
    };
    if ($("useGen")) {
      $("useGen").checked = true;
      $("useGen").onchange = function () {
        genMode = !!$("useGen").checked;
        renderSys();
      };
    }
    loadScript("/aksi-webllm.js?v=91").catch(function () {});
    window.addEventListener("aksi-webllm-progress", function (ev) {
      try { onProgressInfo(ev.detail); updateCortexBtn(); } catch (e) {}
    });
    updateCortexBtn();
    renderSys();
    status("Нажмите «Загрузить LLM» → дождитесь 100% → задайте вопрос (meta: генерация)");
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
  if (typeof window !== "undefined") {
    window.AKSI = { version: VER, think: fullThink, ask: ask, ensureCortex: ensureCortex };
  }
})();
