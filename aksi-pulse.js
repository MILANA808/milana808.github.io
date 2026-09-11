/**
 * AKSI Pulse Organism v2 — answers about the question, not generic fluff
 * Priority: local knowledge → Wikipedia/DDG → honest gap
 * © AKSI · aksilove@internet.ru
 */
(function () {
  "use strict";
  var VER = "2.0.0-organism";

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
    var h = fnv1a(query + "|" + answer + "|" + JSON.stringify(meta || {}));
    return {
      kind: "aksi-organism-seal",
      hash: h,
      chain: fnv1a(h + "|" + Date.now()),
      t: Date.now(),
      version: VER
    };
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var SEED = [
    {
      k: ["кто ты", "что ты такое", "представься", "привет", "здравствуй"],
      a: "Я АКСИ — локальный ИИ-организм в браузере.\n\nУ меня есть:\n• встроенное знание;\n• поиск Wikipedia;\n• выбор одного ответа из кандидатов;\n• печать следа (seal).\n\nЯ не облачный GPT. Если факта нет — скажу прямо.\nКонтакт: aksilove@internet.ru"
    },
    {
      k: ["формула aksi", "формула акс", "aksi =", "формул"],
      a: "AKSI = (A × I × S) × (1 + 0.4√n)\n\nA — agency\nI — integrity\nS — structure / sovereignty\nn — число sealed-записей\n\nИнженерная формула продукта, не физический закон."
    },
    {
      k: ["квантовый компьютер", "квантовые компьютеры", "кубит", "quantum computing"],
      a: "Квантовый компьютер использует кубиты вместо обычных битов.\n\nКубит может быть в суперпозиции 0 и 1. За счёт суперпозиции, интерференции и запутанности некоторые алгоритмы (Шора, Гровера) теоретически быстрее классических.\n\nСейчас есть прототипы и облачные процессоры; универсальный отказоустойчивый компьютер большой мощности ещё не создан.\n\nОбычный бит — строго 0 или 1; кубит — вероятностная комбинация до измерения."
    },
    {
      k: ["искусственный интеллект", "что такое ии", "нейросеть", "машинное обучение"],
      a: "Искусственный интеллект — системы для задач восприятия, вывода, обучения и генерации.\n\nСовременные продукты чаще крупные нейросети, обученные на данных: они предсказывают следующий сигнал, а не «думают» как человек.\n\nАКСИ — локальный контур с явным решением (знание → кандидаты → выбор → след), не скрытая облачная модель."
    },
    {
      k: ["блокчейн", "bitcoin", "биткоин", "криптовалют"],
      a: "Блокчейн — распределённый журнал, блоки связаны хешами. Менять прошлое без пересчёта цепочки крайне сложно.\n\nБиткоин (2009) — криптовалюта без банка через сеть и консенсус.\n\nБлокчейн фиксирует согласованную историю по правилам протокола, а не «абсолютную истину»."
    },
    {
      k: ["теория относительности", "эйнштейн", "e=mc"],
      a: "Специальная теория относительности (1905): скорость света постоянна; пространство и время связаны.\n\nСледствия: замедление времени, E = mc².\n\nОбщая теория (1915): гравитация — искривление пространства-времени массой и энергией."
    },
    {
      k: ["фотосинтез"],
      a: "Фотосинтез — растения, водоросли и некоторые бактерии превращают свет, воду и CO₂ в сахара и выделяют кислород.\n\nУпрощённо: 6CO₂ + 6H₂O + свет → C₆H₁₂O₆ + 6O₂.\nИдёт в хлоропластах с хлорофиллом."
    },
    {
      k: ["днк", "ген", "хромосом"],
      a: "ДНК хранит генетическую информацию — двойная спираль из нуклеотидов A, T, G, C.\n\nГен — участок ДНК, кодирующий белок или РНК. Хромосомы — упакованная ДНК."
    },
    {
      k: ["коллапс", "суперпозиция агент", "как работает коллапс"],
      a: "В АКСИ коллапс — механизм выбора ответа, не физический квантовый компьютер:\n\n1) кандидаты из знания/веба/памяти;\n2) веса по релевантности;\n3) выбор одного;\n4) seal-след.\n\nРешение наблюдаемо."
    },
    {
      k: ["офлайн", "без интернета", "автономн"],
      a: "Offline-first: базовые ответы из встроенного знания и памяти браузера.\nWikipedia дополняет, но не обязательна."
    },
    {
      k: ["миссия", "зачем акс", "польза"],
      a: "Миссия — ответ в браузере с прозрачным контуром: что искали, какие кандидаты, что выбрали, какой seal.\n\naksilove@internet.ru"
    }
  ];

  function seedMatch(q) {
    var nq = norm(q);
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < SEED.length; i++) {
      var s = 0;
      for (var j = 0; j < SEED[i].k.length; j++) {
        var k = norm(SEED[i].k[j]);
        if (nq.indexOf(k) !== -1) s += 10 + k.length;
        else {
          var parts = k.split(" ");
          var hit = 0;
          for (var p = 0; p < parts.length; p++) {
            if (parts[p].length > 2 && nq.indexOf(parts[p]) !== -1) hit++;
          }
          if (hit === parts.length && parts.length > 0) s += 6 + k.length;
        }
      }
      if (s > bestScore) {
        bestScore = s;
        best = SEED[i];
      }
    }
    if (bestScore >= 6)
      return { text: best.a, conf: Math.min(0.98, 0.75 + bestScore / 40), source: "знание" };
    return null;
  }

  function memSave(fact) {
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_org_mem") || "[]");
      mem.push({ t: Date.now(), text: String(fact).slice(0, 500) });
      localStorage.setItem("aksi_org_mem", JSON.stringify(mem.slice(-400)));
    } catch (e) {}
  }

  function memSearch(q) {
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_org_mem") || "[]");
      var nq = norm(q);
      var words = nq.split(" ").filter(function (w) {
        return w.length > 3;
      });
      var hits = [];
      for (var i = mem.length - 1; i >= 0 && hits.length < 3; i--) {
        var t = norm(mem[i].text);
        var ok = false;
        for (var w = 0; w < words.length; w++) {
          if (t.indexOf(words[w]) !== -1) {
            ok = true;
            break;
          }
        }
        if (ok) hits.push(mem[i].text);
      }
      if (hits.length)
        return { text: "Из вашей памяти:\n• " + hits.join("\n• "), conf: 0.72, source: "память" };
    } catch (e) {}
    return null;
  }

  function withTimeout(p, ms) {
    return Promise.race([
      p,
      new Promise(function (resolve) {
        setTimeout(function () {
          resolve(null);
        }, ms);
      })
    ]);
  }

  async function fetchWiki(q) {
    var topic = String(q)
      .replace(/^(что такое|кто такой|кто такая|who is|what is)\s+/i, "")
      .replace(/\?+$/, "")
      .trim();
    if (!topic) topic = q;

    try {
      var url1 =
        "https://ru.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(topic.replace(/\s+/g, "_"));
      var r1 = await withTimeout(
        fetch(url1, { mode: "cors" }).then(function (r) {
          if (!r.ok) throw new Error("x");
          return r.json();
        }),
        4000
      );
      if (r1 && r1.extract && r1.type !== "disambiguation") {
        return {
          title: r1.title,
          text: r1.extract,
          url: (r1.content_urls && r1.content_urls.desktop && r1.content_urls.desktop.page) || "",
          conf: 0.9,
          source: "wikipedia"
        };
      }
    } catch (e) {}

    try {
      var sUrl =
        "https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        encodeURIComponent(topic) +
        "&srlimit=1&format=json&origin=*";
      var s = await withTimeout(
        fetch(sUrl, { mode: "cors" }).then(function (r) {
          return r.json();
        }),
        4000
      );
      var hit = s && s.query && s.query.search && s.query.search[0];
      if (hit && hit.title) {
        var url2 =
          "https://ru.wikipedia.org/api/rest_v1/page/summary/" +
          encodeURIComponent(hit.title.replace(/ /g, "_"));
        var r2 = await withTimeout(
          fetch(url2, { mode: "cors" }).then(function (r) {
            if (!r.ok) throw new Error("x");
            return r.json();
          }),
          4000
        );
        if (r2 && r2.extract) {
          return {
            title: r2.title,
            text: r2.extract,
            url: (r2.content_urls && r2.content_urls.desktop && r2.content_urls.desktop.page) || "",
            conf: 0.88,
            source: "wikipedia"
          };
        }
      }
    } catch (e) {}

    try {
      var urlE =
        "https://en.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(topic.replace(/\s+/g, "_"));
      var re = await withTimeout(
        fetch(urlE, { mode: "cors" }).then(function (r) {
          if (!r.ok) throw new Error("x");
          return r.json();
        }),
        4000
      );
      if (re && re.extract) {
        return {
          title: re.title,
          text: re.extract,
          url: (re.content_urls && re.content_urls.desktop && re.content_urls.desktop.page) || "",
          conf: 0.82,
          source: "wikipedia-en"
        };
      }
    } catch (e) {}

    return null;
  }

  async function fetchDdg(q) {
    try {
      var url =
        "https://api.duckduckgo.com/?q=" +
        encodeURIComponent(q) +
        "&format=json&no_html=1&skip_disambig=1";
      var d = await withTimeout(
        fetch(url, { mode: "cors" }).then(function (r) {
          return r.json();
        }),
        3500
      );
      if (d && d.AbstractText) {
        return {
          title: d.Heading || "DuckDuckGo",
          text: d.AbstractText,
          url: d.AbstractURL || "",
          conf: 0.8,
          source: "ddg"
        };
      }
    } catch (e) {}
    return null;
  }

  function composeFromFact(q, fact) {
    var body = String(fact.text || "").trim();
    if (!body) return null;
    var lead = body.length > 900 ? body.slice(0, 897) + "…" : body;
    var out = lead;
    if (fact.url) out += "\n\n→ " + fact.url;
    out += "\n\n(Источник: " + (fact.source || "web") + (fact.title ? " · " + fact.title : "") + ")";
    return out;
  }

  function normalizeAmps(weights) {
    var sum = 0;
    for (var i = 0; i < weights.length; i++) sum += Math.max(0.001, weights[i]);
    return weights.map(function (w) {
      return Math.max(0.001, w) / sum;
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

  function $(id) {
    try {
      return document.getElementById(id);
    } catch (e) {
      return null;
    }
  }

  function setPipe(step) {
    try {
      document.querySelectorAll("#pipe div").forEach(function (el) {
        el.classList.toggle("on", Number(el.getAttribute("data-s")) <= step);
      });
    } catch (e) {}
  }

  async function think(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "" };

    if (/^запомни\s*[:：]/i.test(query)) {
      var fact = query.replace(/^запомни\s*[:：]\s*/i, "");
      memSave(fact);
      return {
        ok: true,
        answer: "Запомнила: «" + fact.slice(0, 240) + "».",
        source: "organism:memory-write",
        probability: 1,
        seal: seal(query, fact, { kind: "learn" }),
        version: VER
      };
    }

    setPipe(1);
    var cands = [];

    function push(text, source, conf) {
      text = String(text || "").trim();
      if (!text || text.length < 8) return;
      for (var i = 0; i < cands.length; i++) {
        if (cands[i].text.slice(0, 60) === text.slice(0, 60)) return;
      }
      cands.push({ text: text, source: source, conf: conf });
    }

    var seed = seedMatch(query);
    if (seed) push(seed.text, seed.source, seed.conf);

    var mem = memSearch(query);
    if (mem) push(mem.text, mem.source, mem.conf);

    var useWeb = opts.web !== false;
    if (useWeb) {
      var wiki = await fetchWiki(query);
      if (wiki) {
        var composed = composeFromFact(query, wiki);
        if (composed) push(composed, wiki.source, wiki.conf);
      }
      if (!wiki) {
        var ddg = await fetchDdg(query);
        if (ddg) {
          var c2 = composeFromFact(query, ddg);
          if (c2) push(c2, ddg.source, ddg.conf);
        }
      }
    }

    setPipe(2);

    if (!cands.length) {
      push(
        "По запросу «" +
          query +
          "» нет надёжного факта ни во встроенном знании, ни из веба.\n\n" +
          "• переформулируйте короче («что такое X»);\n" +
          "• проверьте сеть / галочку «Веб-факты»;\n" +
          "• или «запомни: …»\n\n" +
          "Лучше честный пробел, чем убедительный бред.\naksilove@internet.ru",
        "честный-пробел",
        0.3
      );
    }

    var weights = cands.map(function (c) {
      var w = c.conf;
      if (c.source === "знание") w += 0.25;
      if (String(c.source).indexOf("wikipedia") === 0) w += 0.2;
      if (c.source === "ddg") w += 0.12;
      if (c.source === "память") w += 0.1;
      if (c.source === "честный-пробел") w *= 0.5;
      return w;
    });
    var amps = normalizeAmps(weights);

    setPipe(3);
    var maxI = 0;
    for (var i = 1; i < amps.length; i++) if (amps[i] > amps[maxI]) maxI = i;
    var idx = amps[maxI] >= 0.34 ? maxI : collapse(amps);
    var chosen = cands[idx];

    setPipe(4);
    var s = seal(query, chosen.text, { src: chosen.source, p: amps[idx] });

    return {
      ok: true,
      answer: chosen.text,
      source: "organism:" + chosen.source,
      probability: +amps[idx].toFixed(4),
      superposition: cands.map(function (c, i) {
        return {
          source: c.source,
          probability: +amps[i].toFixed(4),
          preview: c.text.slice(0, 120),
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
    if ($("out")) $("out").textContent = "Думаю по существу…";
    if ($("meta")) $("meta").textContent = "";
    if ($("supCard")) $("supCard").hidden = true;
    if ($("trailCard")) $("trailCard").hidden = true;
    try {
      var web = true;
      if ($("useWeb") && $("useWeb").checked === false) web = false;
      var r = await think(q, { web: web });
      if ($("out")) $("out").textContent = r.answer || "—";
      if ($("meta"))
        $("meta").textContent =
          (r.source || "") + " · P=" + ((r.probability || 0) * 100).toFixed(0) + "% · " + (r.version || "");
      if (r.superposition && $("sup") && $("supCard")) {
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
              (s.selected ? " ← выбор" : "") +
              "<br>" +
              String(s.preview).replace(/</g, "<") +
              "</li>"
            );
          })
          .join("");
      }
      if (r.seal && $("trail") && $("trailCard")) {
        $("trailCard").hidden = false;
        $("trail").textContent =
          "seal " + r.seal.hash + " · " + new Date(r.seal.t).toISOString() + " · аудит, не «истина»";
      }
    } catch (e) {
      if ($("out")) $("out").textContent = "Сбой: " + (e.message || e);
    } finally {
      if ($("go")) $("go").disabled = false;
    }
  }

  function boot() {
    if (!$("go")) return;
    $("go").onclick = function () {
      ask();
    };
    if ($("q"))
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
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
  if (typeof window !== "undefined") {
    window.AKSI_PULSE = { version: VER, ask: think, think: think, seal: seal };
    window.AKSI_ORGANISM = window.AKSI_PULSE;
  }
})();
