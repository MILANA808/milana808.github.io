(function () {
  "use strict";
  const DID = "did:aksi:ed25519:sovereign-2026";
  const SEED = "AKSI_DIMAX_v3_2026";
  const CONTACT = "aksilove@internet.ru";
  const HIST = "AKSI_APP_CHAT_V1";

  const KB = [
    { k: ["кто ты", "что такое акси", "aksi"], a: "Я АКСИ — суверенный агентный контур. Публичная идентичность системы: DID, код и модули. Личные данные людей в продукт не входят." },
    { k: ["studio", "студи"], a: "Studio — редактор: агент пишет страницы во внутреннюю VFS, превью, экспорт JSON/HTML. Откройте раздел Studio." },
    { k: ["pulse", "пульс", "статус"], a: "Pulse проверяет живость модулей и подписывает отчёт. Раздел «Статус» делает быстрый скан." },
    { k: ["kernel", "ядро"], a: "Kernel — ограниченное самоулучшение: propose → critique → подтверждение человека." },
    { k: ["lab", "крипто", "bloch"], a: "Lab: сад агентов, Web Crypto, сфера Блоха, 2-qubit." },
    { k: ["лиценз", "license", "apache"], a: "Код: Apache License 2.0. См. /LICENSE и /NOTICE." },
    { k: ["контакт", "связ", "email"], a: "Контакт: " + CONTACT },
    { k: ["did", "идентич"], a: "DID: " + DID + " — идентичность программного агента/проекта, не паспортные данные." },
    { k: ["квант", "кубит", "bell"], a: "Квантовый модуль: statevector H+CNOT, Белл ~0.5/0.5. /quantum/ и Lab." },
    { k: ["оффер", "купи", "пилот", "сделк"], a: "Продуктовый пакет и форматы пилота: /offer/." },
    { k: ["помощ", "help", "умеешь"], a: "Разделы: Обзор, Чат, Studio, Статус, Lab. Команды в чате — по смыслу: studio, pulse, license, did." },
  ];

  async function sha(text) {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SEED + "|" + text + "|" + Date.now()));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function answer(q) {
    const s = (q || "").toLowerCase();
    for (const row of KB) {
      if (row.k.some((x) => s.includes(x))) return row.a;
    }
    return "Принято. Рабочие разделы продукта: Studio (писать сайт), Статус (скан), Lab (крипто/агенты), Kernel. Уточните запрос или откройте нужный раздел.";
  }

  function $(id) { return document.getElementById(id); }

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("on", v.dataset.view === name));
    document.querySelectorAll("[data-nav]").forEach((b) => b.classList.toggle("on", b.dataset.nav === name));
    if (name === "studio") {
      const f = $("studioFrame");
      if (f && !f.src) f.src = "/studio/";
    }
    if (name === "lab") {
      const f = $("labFrame");
      if (f && !f.src) f.src = "/lab/";
    }
  }

  function addBubble(role, text, meta) {
    const log = $("chatLog");
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
      const h = JSON.parse(localStorage.getItem(HIST) || "[]");
      h.forEach((m) => addBubble(m.role, m.text, m.meta));
    } catch {}
  }
  function saveChat(role, text, meta) {
    try {
      const h = JSON.parse(localStorage.getItem(HIST) || "[]");
      h.push({ role, text, meta });
      localStorage.setItem(HIST, JSON.stringify(h.slice(-40)));
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
    const meta = "sig " + sig.slice(0, 20) + "… · " + DID.slice(0, 24);
    addBubble("bot", a, meta);
    saveChat("bot", a, meta);
  }

  async function runStatus() {
    const paths = ["/", "/studio/", "/lab/", "/pulse/", "/kernel/", "/proof/", "/wake/", "/offer/", "/ecosystem.json", "/LICENSE"];
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
    $("stBody").innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + r.p + "</td><td class=\"" + (r.ok ? "ok" : "bad") + "\">" + (r.ok ? "OK" : "FAIL") + " " + r.status + "</td><td>" + r.ms + "</td>";
      $("stBody").appendChild(tr);
    });
    const sig = await sha("status|" + score);
    $("stSig").textContent = "score " + score + " · " + Math.round(performance.now() - t0) + " ms · sig " + sig.slice(0, 28) + "…";
  }

  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.addEventListener("click", () => showView(b.dataset.nav));
  });
  document.querySelectorAll("[data-go]").forEach((b) => {
    b.addEventListener("click", () => showView(b.dataset.go));
  });

  $("chatSend").addEventListener("click", sendChat);
  $("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChat();
    }
  });
  $("btnStatus").addEventListener("click", runStatus);
  $("btnClearChat").addEventListener("click", () => {
    localStorage.removeItem(HIST);
    $("chatLog").innerHTML = "";
    addBubble("bot", "История очищена. АКСИ на связи.");
  });

  loadChat();
  if (!$("chatLog").children.length) {
    addBubble("bot", "АКСИ online.\nПродукт: чат · Studio · статус · Lab.\nЛицензия Apache-2.0 · " + CONTACT);
  }
  showView("home");
})();
