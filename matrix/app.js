import { detectSkill, runSkill } from "./skills.js";

const DB = "aksi_m5";
const DID = "did:aksi:ed25519:sovereign-2026";
const VER = "5.0-mobile";

const ONTOLOGY = [
  { t: "АКСИ — local-first ИИ-контур: ответы на устройстве, без обязательного облака.", k: ["акси","aksi","контур","проект","суверен","что такое"] },
  { t: "DID: did:aksi:ed25519:sovereign-2026. Контакт aksilove@internet.ru. Apache-2.0.", k: ["did","идентич","контакт","лиценз","email"] },
  { t: "MATRIX 5: мгновенные ответы на телефоне, RAG, TTP-подпись, skills, proof.", k: ["matrix","версия","модель","быстр"] },
  { t: "Омега: FastAPI + Ollama + RAG + Resonance для своего сервера.", k: ["омега","omega","fastapi","ollama","сервер"] },
  { t: "TTP: цепочка шагов; итог подписывается ECDSA P-256 в браузере.", k: ["ttp","мысл","подпись","resonance","крипт"] },
  { t: "Сеть /app: агент @имя, лента, вызов чужого ИИ.", k: ["сеть","агент","лента","@","регистр"] },
  { t: "Модули: /matrix /app /lab /exocortex /studio /quantum /proof.", k: ["модул","lab","exocortex","studio","quantum"] },
  { t: "RAG: загрузите .txt/.md — поиск по вашим файлам локально.", k: ["rag","файл","загруз","документ"] },
  { t: "Политика: нет данных в контексте — честный отказ, без выдумки новостей.", k: ["галлюцин","отказ","политик","правд"] },
  { t: "Skills: uuid, hash, время, калькулятор — без сети.", k: ["skill","uuid","hash","посчитай","помощь","умеешь"] },
];

let rag = [];
let keyPair = null;
let lastPkg = null;
let mermaidReady = null;
let busy = false;

const $ = (id) => document.getElementById(id);
const thread = $("thread");
const thoughts = $("thoughts");

function status(t) { const s = $("status"); if (s) s.textContent = t; }

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("m")) d.createObjectStore("m", { keyPath: "id", autoIncrement: true });
      if (!d.objectStoreNames.contains("r")) d.createObjectStore("r", { keyPath: "id", autoIncrement: true });
      if (!d.objectStoreNames.contains("k")) d.createObjectStore("k");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function idbGet(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readonly");
    const q = key != null ? tx.objectStore(store).get(key) : tx.objectStore(store).getAll();
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
async function idbAdd(store, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).add(val);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbPut(store, val, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function idbClear(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

function b64(buf) {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(text) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function ensureKeys() {
  if (keyPair) return keyPair;
  const stored = await idbGet("k", "ecdsa");
  if (stored?.privateKey) {
    keyPair = {
      privateKey: await crypto.subtle.importKey("jwk", stored.privateKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
      publicKey: await crypto.subtle.importKey("jwk", stored.publicKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]),
    };
    return keyPair;
  }
  keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  await idbPut("k", {
    privateKey: await crypto.subtle.exportKey("jwk", keyPair.privateKey),
    publicKey: await crypto.subtle.exportKey("jwk", keyPair.publicKey),
  }, "ecdsa");
  return keyPair;
}
async function sign(text) {
  await ensureKeys();
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, new TextEncoder().encode(text));
  return { alg: "ECDSA-P256-SHA256", did: DID, sha256: await sha256(text), signature: b64(sig) };
}
async function verify(text, sigB64) {
  await ensureKeys();
  try {
    const bin = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, keyPair.publicKey, bin, new TextEncoder().encode(text));
  } catch { return false; }
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c]));
}

function showSteps(steps) {
  if (!thoughts) return;
  thoughts.innerHTML = (steps || []).map((s, i) =>
    `<div class="step"><b>${i + 1}. ${esc(s.t)}</b>${esc(s.d || "")}</div>`
  ).join("");
}

function addBubble(role, text, meta) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "bot");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const mm = text.match(/```mermaid\s*([\s\S]*?)```/i);
  if (mm && role !== "user") {
    const before = text.slice(0, mm.index).trim();
    if (before) bubble.appendChild(document.createTextNode(before));
    const box = document.createElement("div");
    box.className = "mermaid-box";
    box.textContent = "схема…";
    bubble.appendChild(box);
    loadMermaid().then(() => renderMermaid(mm[1].trim(), box)).catch(() => { box.textContent = mm[1]; });
    const after = text.slice(mm.index + mm[0].length).trim();
    if (after) {
      const n = document.createElement("div");
      n.style.marginTop = "6px";
      n.textContent = after;
      bubble.appendChild(n);
    }
  } else {
    bubble.textContent = text;
  }
  wrap.appendChild(bubble);
  if (meta) {
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta;
    wrap.appendChild(m);
  }
  thread.appendChild(wrap);
  thread.scrollTop = 1e9;
}

function loadMermaid() {
  if (mermaidReady) return mermaidReady;
  mermaidReady = import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs").then((m) => {
    m.default.initialize({ startOnLoad: false, theme: "dark" });
    window.__mermaid = m.default;
    return m.default;
  });
  return mermaidReady;
}
async function renderMermaid(code, el) {
  try {
    const m = await loadMermaid();
    const id = "m" + Math.random().toString(36).slice(2);
    const { svg } = await m.render(id, code);
    el.innerHTML = svg;
  } catch {
    el.textContent = code;
  }
}

function tok(s) {
  return String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(Boolean);
}
function tf(tokens) {
  const m = {};
  for (const t of tokens) m[t] = (m[t] || 0) + 1;
  return m;
}
function cos(a, b) {
  let dot = 0, na = 0, nb = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = a[k] || 0, y = b[k] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function retrieve(q, k = 5) {
  const low = q.toLowerCase();
  const qtf = tf(tok(q));
  const ont = ONTOLOGY.map((row) => {
    let score = cos(qtf, tf(tok(row.t)));
    for (const kw of row.k) if (low.includes(kw)) score += 0.45;
    return { source: "ontology", text: row.t, score };
  });
  const files = rag.map((c) => ({ ...c, score: cos(qtf, c.tf || {}) })).filter((c) => c.score > 0.03);
  return [...files, ...ont].sort((a, b) => b.score - a.score).slice(0, k);
}

function answer(q, hits, skillOut) {
  const low = q.toLowerCase();
  if (skillOut) return { text: skillOut + "\n\n· skill · " + DID, route: "skill" };

  if (/схем|диаграмм|архитектур|mermaid|покажи схему/.test(low)) {
    return {
      text: "Архитектура АКСИ (мобильный контур):\n\n```mermaid\nflowchart LR\n  U[Вы] --> R[Retrieve]\n  R --> A[Ответ]\n  A --> S[Подпись]\n  S --> UI[Экран]\n```\n\nВсё локально и быстро. DID: " + DID,
      route: "arch",
    };
  }
  if (/привет|здравств|добрый|hello|hi\b/.test(low)) {
    return {
      text: "Здравствуйте. АКСИ отвечает сразу на телефоне.\n\nМожно: вопрос по проекту · «покажи схему» · uuid · hash … · посчитай 2+2 · загрузить файл (RAG).",
      route: "hi",
    };
  }
  if (/кто ты|что ты|представь|версия/.test(low)) {
    return {
      text: "Я АКСИ MATRIX " + VER + ".\n\nDID: " + DID + "\n\nМгновенный поиск по онтологии и вашим файлам, подпись ответа, skills. Тяжёлую нейросеть на телефон не тащим — так быстрее и стабильнее.",
      route: "id",
    };
  }
  if (/помощ|умеешь|команд|skills|функц/.test(low)) {
    return {
      text: "• вопрос про АКСИ\n• покажи схему\n• uuid / hash текст / который час / посчитай N\n• RAG-файлы\n• Proof · Verify\n\naksilove@internet.ru",
      route: "help",
    };
  }
  if (hits.length && hits[0].score > 0.2) {
    const lines = hits.slice(0, 4).map((h, i) => (i + 1) + ". " + h.text).join("\n");
    return {
      text: "По локальным знаниям:\n\n" + lines + "\n\nУточните вопрос или добавьте файл в RAG.",
      route: "kb",
    };
  }
  return {
    text: "Мало данных по запросу. Попробуйте: кто ты · архитектура · DID · uuid · или загрузите .txt.\n\n" + DID,
    route: "soft",
  };
}

async function chat(q) {
  const t0 = performance.now();
  const steps = [];
  const step = (t, d) => { steps.push({ t, d }); showSteps(steps); };

  step("Приём", q.slice(0, 160));
  const skill = detectSkill(q);
  let skillOut = null;
  if (skill) {
    step("Skill", skill.name);
    skillOut = await runSkill(skill, sha256);
  }
  const hits = retrieve(q, 5);
  step("Поиск", hits.length ? hits.map((h) => h.source).join(", ") : "пусто");
  const { text, route } = answer(q, hits, skillOut);
  step("Ответ", route);

  const sig = await sign(text);
  const ms = Math.round(performance.now() - t0);
  step("Подпись", sig.sha256.slice(0, 16) + "… · " + ms + "ms");

  lastPkg = {
    version: VER, did: DID, question: q, answer: text, route, ms,
    final: sig, steps, sources: hits.map((h) => ({ source: h.source, score: h.score })),
    created_at: new Date().toISOString(),
  };
  return { text, route, sig, ms };
}

async function send() {
  if (busy) return;
  const inp = $("inp");
  const q = (inp.value || "").trim();
  if (!q) return;
  inp.value = "";
  busy = true;
  addBubble("user", q);
  try { await idbAdd("m", { role: "user", content: q, ts: Date.now() }); } catch {}
  try {
    const { text, route, sig, ms } = await chat(q);
    addBubble("bot", text, ms + "ms · " + route + " · " + (sig.sha256 || "").slice(0, 10));
    try { await idbAdd("m", { role: "assistant", content: text, ts: Date.now() }); } catch {}
    status(ms + " ms");
  } catch (e) {
    addBubble("bot", "Ошибка: " + (e.message || e), "err");
  } finally {
    busy = false;
  }
}

async function onFiles(files) {
  for (const f of files) {
    const text = await f.text();
    for (let i = 0; i < text.length; i += 450) {
      const chunk = text.slice(i, i + 450);
      if (chunk.trim().length < 20) continue;
      const item = { source: f.name, text: chunk, tf: tf(tok(chunk)), ts: Date.now() };
      rag.push(item);
      try { await idbAdd("r", item); } catch {}
    }
  }
  addBubble("bot", "RAG: " + rag.length + " фрагментов. Можно спрашивать.", "rag");
  status("RAG " + rag.length);
}

$("send").onclick = send;
$("inp").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
$("btn-arch").onclick = () => { $("inp").value = "покажи схему"; send(); };
$("btn-thoughts").onclick = () => $("side").classList.toggle("on");
$("btn-clear").onclick = async () => {
  await idbClear("m");
  thread.innerHTML = "";
  lastPkg = null;
  showSteps([]);
  addBubble("bot", "Очищено. Пишите — ответ сразу.", "sys");
};
$("file-input").onchange = async (e) => {
  if (e.target.files?.length) await onFiles([...e.target.files]);
  e.target.value = "";
};
$("btn-proof").onclick = () => {
  if (!lastPkg) { addBubble("bot", "Сначала задайте вопрос.", "proof"); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(lastPkg, null, 2)], { type: "application/json" }));
  a.download = "aksi-proof.json";
  a.click();
};
$("btn-verify").onclick = async () => {
  if (!lastPkg?.final?.signature) { addBubble("bot", "Нет подписи.", "v"); return; }
  const ok = await verify(lastPkg.answer, lastPkg.final.signature);
  addBubble("bot", ok ? "✅ Подпись верна" : "❌ Неверна", "v");
};
$("btn-mic").onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { addBubble("bot", "Голос: Chrome/Safari.", "voice"); return; }
  const r = new SR();
  r.lang = "ru-RU";
  r.onresult = (ev) => { $("inp").value = ev.results[0][0].transcript; send(); };
  r.start();
  status("слушаю…");
};

(async () => {
  try {
    status("старт");
    await ensureKeys();
    const msgs = (await idbGet("m")) || [];
    msgs.slice(-30).forEach((m) => addBubble(m.role === "user" ? "user" : "bot", m.content));
    rag = ((await idbGet("r")) || []).map((c) => ({ ...c, tf: c.tf || tf(tok(c.text || "")) }));
    if (!msgs.length) {
      addBubble("bot", "АКСИ готов. Ответ сразу, без тяжёлой модели на телефоне.\n\nСпросите «кто ты» или нажмите «Схема».", "sys");
    }
    status("готово · RAG " + rag.length);
  } catch (e) {
    status("ok");
    addBubble("bot", "Можно писать. " + (e.message || ""), "sys");
  }
  const boot = $("boot");
  if (boot) {
    boot.classList.add("hide");
    setTimeout(() => { boot.style.display = "none"; }, 280);
  }
})();
