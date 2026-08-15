(function () {
  "use strict";
  const DID = "did:aksi:ed25519:sovereign-2026";
  const SEED = "AKSI_DIMAX_v3_2026";
  const CONTACT = "aksilove@internet.ru";
  const HIST = "AKSI_APP_CHAT_V1";
  const NOTES = "AKSI_PRO_NOTES_V1";

  const KB = [
    { k: ["кто ты", "что такое акси", "aksi", "акси"], a: "АКСИ — суверенный агентный продукт: чат, Studio (VFS), статус модулей, Lab, Kernel. DID системы, Apache-2.0, без личных данных в публичном коде." },
    { k: ["studio", "студи", "vfs"], a: "Studio: агент создаёт HTML во внутренней файловой системе браузера → превью → экспорт. Команды: «создай страницу X», «автосбор», «синк»." },
    { k: ["pulse", "пульс", "статус", "health"], a: "Статус/Pulse: параллельный HTTP-скан модулей, score, подпись отчёта. Расширенный режим: /pulse/" },
    { k: ["kernel", "ядро", "эволюц"], a: "Kernel: observe → propose → critique → human confirm. Песочница знаний, не автодеплой продакшена." },
    { k: ["lab", "крипто", "bloch", "агент"], a: "Lab: мультиагенты, Web Crypto (ECDSA/AES), Bloch, 2-qubit. Полный экран: /lab/" },
    { k: ["лиценз", "license", "apache"], a: "Лицензия: Apache License 2.0 — /LICENSE и /NOTICE. Подходит для открытого и коммерческого использования с атрибуцией." },
    { k: ["контакт", "email", "связ"], a: "Контакт: " + CONTACT },
    { k: ["did", "идентич"], a: "Публичный DID: " + DID + ". Это идентичность программного контура, не паспорт." },
    { k: ["квант", "кубит", "bell", "запутан"], a: "Квант: statevector, H+CNOT, Bell ≈ 0.5/0.5. /quantum/ и виджеты в Studio genome." },
    { k: ["оффер", "пилот", "сделк", "пакет"], a: "Коммерческий пакет и due diligence: /offer/" },
    { k: ["архитектур", "как устроен", "стек"], a: "Слои: (1) UI product shell app.js (2) Studio VFS (3) Lab/quantum client (4) optional Milana-backend+Ollama. Публичный хост — GitHub Pages." },
    { k: ["программист", "как расти", "карьера", "топ"], a: "Топ-уровень = годы: системы, отладка, дизайн API, продакшен. В Pro — трек практики на этом репозитории: читать модули, чинить, добавлять тесты, пилот заказчику. Сайт не выдаёт титул — выдаёт полигон." },
    { k: ["горяч", "shortcut", "клавиш"], a: "Клавиши: 1 обзор · 2 чат · 3 studio · 4 статус · 5 lab · 6 pro · / фокус в чат · S статус-скан." },
    { k: ["помощ", "help", "умеешь", "команд"], a: "Разделы: Обзор, Чат, Studio, Статус, Lab, Pro.\nВ чате: вопросы по продукту, «snippet html», «checklist».\nStudio: создание страниц. Pro: трек инженера." },
  ];

  async function sha(text) {
    const d = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(SEED + "|" + text + "|" + Date.now())
    );
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function answer(q) {
    const s = (q || "").toLowerCase().trim();
    if (/^snippet\s*html/i.test(s) || /сниппет\s*html/i.test(s)) {
      return "<!DOCTYPE html>\n<html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Page</title>\n<style>body{font-family:system-ui;background:#0b0f1a;color:#e8eefc;padding:24px}</style></head>\n<body><h1>Page</h1><p>Собрано в АКСИ.</p></body></html>";
    }
    if (/checklist|чеклист|практик/i.test(s)) {
      return "Чеклист инженера АКСИ:\n1) Pulse score ≥ 90\n2) Studio: создать страницу и экспорт\n3) Lab: подпись + verify\n4) Прочитать ORIGIN.md / ecosystem.json\n5) Один PR или патч в день\n6) Объяснить архитектуру вслух за 3 минуты";
    }
    for (const row of KB) {
      if (row.k.some((x) => s.includes(x))) return row.a;
    }
    return "Не нашла точный шаблон — откройте Studio для генерации страницы или Pro для трека практики. Уточните: studio / статус / license / архитектура.";
  }

  function $(id) {
    return document.getElementById(id);
  }

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("on", v.dataset.view === name));
    document.querySelectorAll("[data-nav]").forEach((b) => b.classList.toggle("on", b.dataset.nav === name));
    if (name === "studio") {
      const f = $("studioFrame");
      if (f && !f.getAttribute("src")) f.src = "/studio/?embed=1";
    }
    if (name === "lab") {
      const f = $("labFrame");
      if (f && !f.getAttribute("src")) f.src = "/lab/";
    }
    try {
      localStorage.setItem("AKSI_LAST_VIEW", name);
    } catch {}
  }

  function addBubble(role, text, meta) {
    const log = $("chatLog");
    if (!log) return;
    const d = document.createElement("div");
    d.className = "bubble " + (role === "user" ? "user" : "bot");
    d.textContent = text;
    if (meta) {
      const m = document.createElement("div");
      m.className = "meta";
      m.textContent = meta;
      d.appendChild(m);
    }
    log.appendChild(d);
    log.scrollTop = 1e9;
  }

  function loadChat() {
    try {
      JSON.parse(localStorage.getItem(HIST) || "[]").forEach((m) => addBubble(m.role, m.text, m.meta));
    } catch {}
  }
  function saveChat(role, text, meta) {
    try {
      const h = JSON.parse(localStorage.getItem(HIST) || "[]");
      h.push({ role, text, meta });
      localStorage.setItem(HIST, JSON.stringify(h.slice(-50)));
    } catch {}
  }

  async function sendChat() {
    const inp = $("chatInput");
    const q = (inp.value || "").trim();
    if (!q) return;
    inp.value = "";
    addBubble("user", q);
    saveChat("user", q);
    const a = answer(q);
    const sig = await sha(a);
    const meta = "sig " + sig.slice(0, 20) + "… · " + DID.slice(0, 22);
    addBubble("bot", a, meta);
    saveChat("bot", a, meta);
  }

  async function runStatus() {
    const paths = [
      "/",
      "/app.js",
      "/app.css",
      "/studio/",
      "/lab/",
      "/pulse/",
      "/kernel/",
      "/proof/",
      "/offer/",
      "/wake/",
      "/ecosystem.json",
      "/LICENSE",
      "/IDENTITY.md",
    ];
    $("stBody").innerHTML = "<tr><td colspan=3 class=mono>скан…</td></tr>";
    const t0 = performance.now();
    const rows = await Promise.all(
      paths.map(async (p) => {
        const t = performance.now();
        try {
          const r = await fetch(p, { cache: "no-store" });
          return { p, ok: r.ok, status: r.status, ms: Math.round(performance.now() - t) };
        } catch {
          return { p, ok: false, status: 0, ms: Math.round(performance.now() - t) };
        }
      })
    );
    const ok = rows.filter((r) => r.ok).length;
    const score = Math.round((ok / rows.length) * 100);
    $("stOk").textContent = ok;
    $("stBad").textContent = rows.length - ok;
    $("stScore").textContent = score;
    $("stScore").className = score >= 90 ? "ok" : "bad";
    const dot = document.querySelector(".brand .dot");
    if (dot) dot.style.background = score >= 90 ? "var(--ok)" : "var(--bad)";
    $("stBody").innerHTML = "";
    rows
      .slice()
      .sort((a, b) => Number(b.ok) - Number(a.ok))
      .forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          r.p +
          "</td><td class=\"" +
          (r.ok ? "ok" : "bad") +
          "\">" +
          (r.ok ? "OK" : "FAIL") +
          " " +
          r.status +
          "</td><td>" +
          r.ms +
          "</td>";
        $("stBody").appendChild(tr);
      });
    const sig = await sha("status|" + score);
    $("stSig").textContent =
      "score " + score + " · " + Math.round(performance.now() - t0) + " ms · sig " + sig.slice(0, 28) + "…";
  }

  function loadNotes() {
    try {
      return localStorage.getItem(NOTES) || "";
    } catch {
      return "";
    }
  }
  function saveNotes() {
    const t = $("proNotes");
    if (t) localStorage.setItem(NOTES, t.value);
  }

  function bindNav() {
    document.querySelectorAll("[data-nav]").forEach((b) => {
      b.addEventListener("click", () => showView(b.dataset.nav));
    });
    document.querySelectorAll("[data-go]").forEach((b) => {
      b.addEventListener("click", () => showView(b.dataset.go));
    });
  }

  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      const map = { "1": "home", "2": "chat", "3": "studio", "4": "status", "5": "lab", "6": "pro" };
      if (map[e.key]) showView(map[e.key]);
      if (e.key === "/") {
        e.preventDefault();
        showView("chat");
        $("chatInput") && $("chatInput").focus();
      }
      if (e.key === "s" || e.key === "S") {
        showView("status");
        runStatus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindKeys();
    $("chatSend") && $("chatSend").addEventListener("click", sendChat);
    $("chatInput") &&
      $("chatInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendChat();
        }
      });
    $("btnStatus") && $("btnStatus").addEventListener("click", runStatus);
    $("btnClearChat") &&
      $("btnClearChat").addEventListener("click", () => {
        localStorage.removeItem(HIST);
        $("chatLog").innerHTML = "";
        addBubble("bot", "История очищена.");
      });
    $("proNotes") && ($("proNotes").value = loadNotes());
    $("proNotes") && $("proNotes").addEventListener("change", saveNotes);
    $("proNotes") && $("proNotes").addEventListener("keyup", saveNotes);
    $("btnExportState") &&
      $("btnExportState").addEventListener("click", () => {
        const blob = new Blob(
          [
            JSON.stringify(
              {
                did: DID,
                chat: JSON.parse(localStorage.getItem(HIST) || "[]"),
                notes: loadNotes(),
                genome: localStorage.getItem("aksi_genome_v1"),
                exported: new Date().toISOString(),
              },
              null,
              2
            ),
          ],
          { type: "application/json" }
        );
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aksi-state.json";
        a.click();
      });

    loadChat();
    if ($("chatLog") && !$("chatLog").children.length) {
      addBubble(
        "bot",
        "АКСИ online.\nКлавиши 1–6 · / чат · S статус.\nPro — трек практики. Studio — производство страниц."
      );
    }
    let start = "home";
    try {
      start = localStorage.getItem("AKSI_LAST_VIEW") || "home";
    } catch {}
    showView(start);
    runStatus();
  });
})();
