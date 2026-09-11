/** AKSI Pulse Engine v1 — multi-agent collapse + seal · © AKSI · aksilove@internet.ru */
(function () {
  "use strict";
  var VER = "1.0.0-pulse";

  function fnv1a(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }
  function seal(query, answer, meta) {
    var payload = query + "|" + answer + "|" + JSON.stringify(meta || {});
    var h = fnv1a(payload);
    var chain = fnv1a(h + "|" + Date.now());
    return { kind: "aksi-pulse-seal", hash: h, chain: chain, t: Date.now(), version: VER };
  }

  var KB = [
    {
      k: ["кто ты", "привет", "здравствуй", "представься", "what are you"],
      a: "Я АКСИ — локальный Decision Integrity runtime в браузере.\n\nКак отвечаю:\n1) несколько внутренних агентов дают кандидаты;\n2) кандидаты в суперпозиции (вероятности);\n3) коллапс выбирает один ответ;\n4) печать следа (seal).\n\nВеб — опция. Контакт: aksilove@internet.ru"
    },
    {
      k: ["формул", "formula", "aksi ="],
      a: "AKSI = (A × I × S) × (1 + 0.4√n)\n\nA — agency\nI — integrity\nS — structure / sovereignty\nn — число sealed-записей\n\nИнженерная метафора опыта, не физический закон."
    },
    {
      k: ["коллапс", "суперпозиц", "q-select", "квант симул"],
      a: "Коллапс в АКСИ — выбор одного ответа из нескольких кандидатов.\n\nАгенты (Ядро, Память, Рассуждение, Критик, Веб) получают амплитуды.\nСимулятор измеряет состояние — остаётся один ответ + seal.\n\nЭто модель выбора, не физический квантовый компьютер."
    },
    {
      k: ["квантовый компьютер", "кубит", "quantum computer"],
      a: "Квантовый компьютер обрабатывает информацию в кубитах, которые могут быть в суперпозиции 0 и 1.\n\nСуперпозиция, интерференция и запутанность дают преимущество на ряде задач (факторизация, поиск).\nПолноценные универсальные машины большой мощности ещё в развитии; есть прототипы и облачные сервисы.\n\nВ АКСИ «суперпозиция» — аналогия для выбора между кандидатами ответов."
    },
    {
      k: ["искусственный интеллект", "ии", "нейросет", "machine learning", "llm"],
      a: "Искусственный интеллект — системы для задач, обычно связанных с человеческим рассуждением: распознавание, поиск, генерация, решения.\n\nСовременный ИИ чаще статистические модели на данных. Они не «понимают» мир как человек, но полезны.\n\nАКСИ — локальный контур в браузере: агенты → коллапс → seal. Польза — прозрачность и автономность."
    },
    {
      k: ["миссия", "зачем", "польза", "что умеешь"],
      a: "Миссия АКСИ — ясный проверяемый ответ в браузере без обязательной сдачи данных облаку.\n\nУмею: локальный ответ, мультиагентный коллапс, seal-след, память («запомни: …»), опциональный веб.\nНе претендую на AGI. aksilove@internet.ru"
    },
    {
      k: ["офлайн", "без сети", "автоном", "sovereign"],
      a: "АКСИ offline-first: отвечает без сервера. Веб включается отдельно и не блокирует локальный ответ."
    }
  ];

  function kbAnswer(q) {
    q = String(q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (q.indexOf(KB[i].k[j]) !== -1) return KB[i].a;
      }
    }
    return null;
  }

  function agentCore(q) {
    var a = kbAnswer(q);
    if (a) return { source: "ядро", text: a, conf: 0.92 };
    if (/^запомни\s*[:：]/i.test(q)) {
      var fact = q.replace(/^запомни\s*[:：]\s*/i, "");
      try {
        var mem = JSON.parse(localStorage.getItem("aksi_pulse_mem") || "[]");
        mem.push({ t: Date.now(), text: fact });
        localStorage.setItem("aksi_pulse_mem", JSON.stringify(mem.slice(-300)));
      } catch (e) {}
      return { source: "ядро", text: "Запомнила: «" + fact.slice(0, 200) + "».", conf: 0.95 };
    }
    return {
      source: "ядро",
      text:
        "Пока нет глубокого готового ответа на «" +
        q +
        "».\nУточните вопрос, напишите «запомни: …» или включите веб-дополнение.",
      conf: 0.35
    };
  }

  function agentMemory(q) {
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_pulse_mem") || "[]");
      var ql = q.toLowerCase();
      var hits = [];
      for (var i = mem.length - 1; i >= 0 && hits.length < 3; i--) {
        var words = ql.split(/\s+/);
        var ok = false;
        for (var w = 0; w < words.length; w++) {
          if (words[w].length > 3 && String(mem[i].text).toLowerCase().indexOf(words[w]) !== -1) {
            ok = true;
            break;
          }
        }
        if (ok) hits.push(mem[i].text);
      }
      if (hits.length) {
        return { source: "память", text: "Из вашей локальной памяти:\n• " + hits.join("\n• "), conf: 0.7 };
      }
    } catch (e) {}
    return null;
  }

  function agentCritic(q, draft) {
    var issues = [];
    if (!draft || draft.length < 40) issues.push("ответ короткий");
    if (/нет глубокого готового|нет готового/i.test(draft || "")) issues.push("низкая уверенность");
    if (issues.length) {
      return {
        source: "критик",
        text: "Критик: " + issues.join("; ") + ". Рекомендация: уточнить вопрос или включить веб.",
        conf: 0.4
      };
    }
    return {
      source: "критик",
      text: "Критик: структура ответа приемлема (локальная проверка).",
      conf: 0.55
    };
  }

  function agentReason(q) {
    var ql = q.toLowerCase();
    if (/почему|зачем/.test(ql)) {
      return {
        source: "рассуждение",
        text: "Разбор «почему/зачем»: явление → ближайшая причина → гипотеза vs факт. Без веба — общая логика.",
        conf: 0.45
      };
    }
    if (/как /.test(ql)) {
      return {
        source: "рассуждение",
        text: "Разбор «как»: вход → шаги → результат. Для точных инструкций — узкий вопрос или веб.",
        conf: 0.45
      };
    }
    return {
      source: "рассуждение",
      text: "Локальное рассуждение: сущности и связи. Определение → «что / зачем / отличие». Процесс → этапы.",
      conf: 0.4
    };
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (resolve) {
        setTimeout(function () {
          resolve(null);
        }, ms);
      })
    ]);
  }

  async function agentWeb(q) {
    try {
      var topic = q.replace(/^что такое\s+/i, "").trim();
      var url =
        "https://ru.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(topic.replace(/\s+/g, "_"));
      var r = await withTimeout(
        fetch(url, { mode: "cors" }).then(function (res) {
          if (!res.ok) throw new Error("wiki");
          return res.json();
        }),
        3500
      );
      if (r && r.extract) {
        return {
          source: "веб·вики",
          text:
            r.title +
            "\n\n" +
            r.extract +
            (r.content_urls && r.content_urls.desktop ? "\n\n→ " + r.content_urls.desktop.page : ""),
          conf: 0.8
        };
      }
      var sUrl =
        "https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        encodeURIComponent(q) +
        "&srlimit=1&format=json&origin=*";
      var s = await withTimeout(
        fetch(sUrl, { mode: "cors" }).then(function (res) {
          return res.json();
        }),
        3500
      );
      var hit = s && s.query && s.query.search && s.query.search[0];
      if (hit) {
        var sumUrl =
          "https://ru.wikipedia.org/api/rest_v1/page/summary/" +
          encodeURIComponent(hit.title.replace(/ /g, "_"));
        var sum = await withTimeout(
          fetch(sumUrl, { mode: "cors" }).then(function (res) {
            return res.json();
          }),
          3500
        );
        if (sum && sum.extract) {
          return { source: "веб·вики", text: sum.title + "\n\n" + sum.extract, conf: 0.78 };
        }
      }
    } catch (e) {}
    return null;
  }

  function normalize(weights) {
    var sum = 0;
    for (var i = 0; i < weights.length; i++) sum += Math.max(0.01, weights[i]);
    return weights.map(function (w) {
      return Math.max(0.01, w) / sum;
    });
  }

  function collapse(amps) {
    var r = Math.random();
    var acc = 0;
    for (var i = 0; i < amps.length; i++) {
      acc += amps[i];
      if (r <= acc) return i;
    }
    return amps.length - 1;
  }

  function score(c) {
    var s = c.conf || 0.5;
    if (c.source === "ядро" && c.conf > 0.8) s += 0.15;
    if (String(c.source).indexOf("веб") === 0) s += 0.12;
    if (c.source === "память") s += 0.08;
    if ((c.text || "").length > 80 && (c.text || "").length < 2000) s += 0.05;
    return Math.max(0.05, Math.min(1, s));
  }

  function setPipe(step) {
    try {
      if (typeof document === "undefined") return;
      document.querySelectorAll("#pipe div").forEach(function (el) {
        el.classList.toggle("on", Number(el.getAttribute("data-s")) <= step);
      });
    } catch (e) {}
  }

  function $(id) {
    try {
      return typeof document !== "undefined" ? document.getElementById(id) : null;
    } catch (e) {
      return null;
    }
  }

  async function pulse(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "" };

    setPipe(1);
    var cands = [];
    function push(c) {
      if (!c || !c.text) return;
      for (var i = 0; i < cands.length; i++) {
        if (cands[i].text.slice(0, 80) === c.text.slice(0, 80)) return;
      }
      cands.push(c);
    }

    push(agentCore(query));
    push(agentMemory(query));
    push(agentReason(query));
    push(agentCritic(query, cands[0] && cands[0].text));

    if (opts.web) {
      var w = await agentWeb(query);
      if (w) push(w);
    }

    setPipe(2);
    var amps = normalize(cands.map(score));
    setPipe(3);
    var maxI = 0;
    for (var i = 1; i < amps.length; i++) if (amps[i] > amps[maxI]) maxI = i;
    var idx = amps[maxI] >= 0.45 ? maxI : collapse(amps);
    var chosen = cands[idx];

    setPipe(4);
    var s = seal(query, chosen.text, { source: chosen.source, p: amps[idx], n: cands.length });
    try {
      var trail = JSON.parse(localStorage.getItem("aksi_pulse_trail") || "[]");
      trail.push({ q: query.slice(0, 80), h: s.hash, t: s.t, src: chosen.source });
      localStorage.setItem("aksi_pulse_trail", JSON.stringify(trail.slice(-50)));
    } catch (e) {}

    return {
      ok: true,
      answer: chosen.text,
      source: "pulse:" + chosen.source,
      probability: +amps[idx].toFixed(4),
      superposition: cands.map(function (c, i) {
        return {
          source: c.source,
          probability: +amps[i].toFixed(4),
          preview: c.text.slice(0, 140),
          selected: i === idx
        };
      }),
      seal: s,
      version: VER
    };
  }

  async function ask(q) {
    q = String(q || ($("q") && $("q").value) || "").trim();
    if (!q) return;
    if ($("q")) $("q").value = q;
    if ($("go")) $("go").disabled = true;
    if ($("out")) $("out").textContent = "Считаю…";
    if ($("meta")) $("meta").textContent = "";
    if ($("supCard")) $("supCard").hidden = true;
    if ($("trailCard")) $("trailCard").hidden = true;
    try {
      var r = await pulse(q, { web: !!($("useWeb") && $("useWeb").checked) });
      if ($("out")) $("out").textContent = r.answer || "—";
      if ($("meta"))
        $("meta").textContent =
          "коллапс ← " + (r.source || "") + " · P=" + ((r.probability || 0) * 100).toFixed(0) + "% · " + r.version;
      if (r.superposition && r.superposition.length && $("supCard") && $("sup")) {
        $("supCard").hidden = false;
        $("sup").innerHTML = r.superposition
          .map(function (s) {
            return (
              '<li class="' +
              (s.selected ? "sel" : "") +
              '"><span class="p">' +
              (s.probability * 100).toFixed(0) +
              "%</span> · <b>" +
              s.source +
              "</b>" +
              (s.selected ? " ← измерение" : "") +
              "<br>" +
              String(s.preview).replace(/</g, "&lt;") +
              (s.preview.length >= 140 ? "…" : "") +
              "</li>"
            );
          })
          .join("");
      }
      if (r.seal && $("trailCard") && $("trail")) {
        $("trailCard").hidden = false;
        $("trail").textContent =
          "hash " +
          r.seal.hash +
          " · chain " +
          r.seal.chain +
          " · " +
          new Date(r.seal.t).toISOString() +
          "\n(FNV-след — для аудита, не доказательство истины)";
      }
    } catch (e) {
      if ($("out"))
        $("out").textContent = "Сбой: " + (e.message || e) + "\nПопробуйте ещё раз — ядро локальное.";
    } finally {
      if ($("go")) $("go").disabled = false;
    }
  }

  function bootUI() {
    if (typeof document === "undefined" || !$("go")) return;
    $("go").onclick = function () {
      ask();
    };
    $("q").addEventListener("keydown", function (e) {
      if (e.key === "Enter") ask();
    });
    document.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () {
        ask(b.getAttribute("data-q"));
      };
    });
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootUI);
    else bootUI();
  }
  if (typeof window !== "undefined") {
    window.AKSI_PULSE = { version: VER, ask: pulse, seal: seal };
  }
})();
