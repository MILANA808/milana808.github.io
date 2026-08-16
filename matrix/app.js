import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const DB_NAME = "aksi_matrix_v2";
const STORE_MSG = "messages";
const STORE_RAG = "rag";
const STORE_KEYS = "keys";
const DID = "did:aksi:ed25519:sovereign-2026";

const SYSTEM = `Ты — АКСИ MATRIX, локальный суверенный ассистент проекта АКСИ.
Отвечай развёрнуто, осмысленно, структурированно (абзацы, списки при необходимости), на языке пользователя.
Не выдумывай внешние новости, курсы и «текущие» факты вне контекста.
Если просят схему/диаграмму/архитектуру — верни блок \`\`\`mermaid ... \`\`\` и краткое пояснение.
Опирайся на CONTEXT (онтология АКСИ и файлы пользователя).
Идентичность: ${DID}. Контакт: aksilove@internet.ru. Лицензия: Apache-2.0.`;

const ONTOLOGY = [
  "АКСИ — суверенный агентный контур local-first: данные и инференс на устройстве.",
  "DID: did:aksi:ed25519:sovereign-2026. Контакт aksilove@internet.ru. Лицензия Apache-2.0.",
  "MATRIX: WebLLM, IndexedDB, RAG, Mermaid, голос, подписанный ход мыслей (ECDSA P-256).",
  "Омега: FastAPI, Ollama, RAG Chroma+BM25, Рубикон, Resonance Ed25519, Docker.",
  "TTP: цепочка рассуждений обязательна; без факта в CONTEXT — отказ от выдумки.",
  "Метки private, local-first, verifiable. Сеть /app: агенты @имя, лента, чат.",
  "Оркестратор: intent → retrieve → route → answer → TTP → подпись.",
  "Модули: /matrix /app /lab /exocortex /studio /pulse /quantum /proof.",
  "Air-gapped: без обязательных внешних облачных API.",
  "Цель: проверяемый локальный ИИ, без заявлений об AGI."
];

let engine = null;
let ragChunks = [];
let cryptoKey = null;

function bootMsg(t, pct) {
  document.getElementById("boot-msg").textContent = t;
  if (pct != null) document.getElementById("boot-bar").style.width = Math.min(100, Math.max(0, pct)) + "%";
  document.getElementById("status").textContent = t;
}
function hideBoot() {
  const b = document.getElementById("boot");
  b.classList.add("hide");
  setTimeout(() => { b.style.display = "none"; }, 450);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MSG)) db.createObjectStore(STORE_MSG, { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains(STORE_RAG)) db.createObjectStore(STORE_RAG, { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains(STORE_KEYS)) db.createObjectStore(STORE_KEYS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveMsg(role, content, extra) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MSG, "readwrite");
    tx.objectStore(STORE_MSG).add({ role, content, extra: extra || null, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function loadMsgs(limit = 40) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MSG, "readonly");
    const req = tx.objectStore(STORE_MSG).getAll();
    req.onsuccess = () => resolve((req.result || []).slice(-limit));
    req.onerror = () => reject(req.error);
  });
}
async function clearMsgs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MSG, "readwrite");
    tx.objectStore(STORE_MSG).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function saveRagChunk(chunk) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RAG, "readwrite");
    tx.objectStore(STORE_RAG).add(chunk);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function loadRag() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RAG, "readonly");
    const req = tx.objectStore(STORE_RAG).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256hex(text) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function ensureKeys() {
  if (cryptoKey) return cryptoKey;
  const db = await openDB();
  const stored = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, "readonly");
    const req = tx.objectStore(STORE_KEYS).get("ecdsa");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (stored && stored.privateKey && stored.publicKey) {
    cryptoKey = {
      privateKey: await crypto.subtle.importKey("jwk", stored.privateKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]),
      publicKey: await crypto.subtle.importKey("jwk", stored.publicKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]),
    };
    return cryptoKey;
  }
  cryptoKey = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const priv = await crypto.subtle.exportKey("jwk", cryptoKey.privateKey);
  const pub = await crypto.subtle.exportKey("jwk", cryptoKey.publicKey);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, "readwrite");
    tx.objectStore(STORE_KEYS).put({ privateKey: priv, publicKey: pub }, "ecdsa");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return cryptoKey;
}
async function signText(text) {
  await ensureKeys();
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey.privateKey, new TextEncoder().encode(text));
  return { alg: "ECDSA-P256-SHA256", did: DID, sha256: await sha256hex(text), signature: b64(sig) };
}

const thread = document.getElementById("thread");
const thoughtsEl = document.getElementById("thoughts");

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&", "<": "<", ">": ">", "\"": """, "'": "&#39;" }[c]));
}
function showThoughts(steps) {
  thoughtsEl.innerHTML = "";
  (steps || []).forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "step";
    d.innerHTML = "<b>" + (i + 1) + ". " + escapeHtml(s.title) + "</b>" + escapeHtml(s.detail || "");
    if (s.sig) {
      const m = document.createElement("div");
      m.className = "sig";
      m.textContent = "sig " + s.sig.sha256.slice(0, 16) + "… · " + (s.sig.signature || "").slice(0, 18) + "…";
      d.appendChild(m);
    }
    thoughtsEl.appendChild(d);
  });
}

async function renderMermaid(code, container) {
  try {
    const id = "mmd_" + Math.random().toString(36).slice(2);
    const { svg } = await window.__mermaid.render(id, code);
    container.innerHTML = svg;
  } catch (e) {
    container.textContent = code;
  }
}

function addBubble(role, content, meta) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "bot");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const mermaidMatch = content.match(/```mermaid\s*([\s\S]*?)```/i);
  if (mermaidMatch && role !== "user") {
    const before = content.slice(0, mermaidMatch.index).trim();
    if (before) { const t = document.createElement("div"); t.textContent = before; bubble.appendChild(t); }
    const box = document.createElement("div");
    box.className = "mermaid-box";
    bubble.appendChild(box);
    renderMermaid(mermaidMatch[1].trim(), box);
    const after = content.slice(mermaidMatch.index + mermaidMatch[0].length).trim();
    if (after) { const t2 = document.createElement("div"); t2.style.marginTop = "8px"; t2.textContent = after; bubble.appendChild(t2); }
  } else bubble.textContent = content;
  wrap.appendChild(bubble);
  if (meta) { const m = document.createElement("div"); m.className = "meta"; m.textContent = meta; wrap.appendChild(m); }
  thread.appendChild(wrap);
  thread.scrollTop = thread.scrollHeight;
}

function tokenize(s) {
  return String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(Boolean);
}
function tf(tokens) {
  const m = {};
  tokens.forEach(t => { m[t] = (m[t] || 0) + 1; });
  return m;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => {
    const x = a[k] || 0, y = b[k] || 0;
    dot += x * y; na += x * x; nb += y * y;
  });
  return (!na || !nb) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function chunkText(text, size = 500) {
  const parts = [];
  const clean = text.replace(/\r/g, "");
  for (let i = 0; i < clean.length; i += size) parts.push(clean.slice(i, i + size));
  return parts.filter(p => p.trim().length > 20);
}
function ontologyRetrieve(query, k = 6) {
  const q = tf(tokenize(query));
  return ONTOLOGY.map(text => ({ source: "ontology", text, tf: tf(tokenize(text)), score: cosine(q, tf(tokenize(text))) }))
    .sort((a, b) => b.score - a.score).filter(c => c.score > 0.01).slice(0, k);
}
function retrieve(query, k = 4) {
  const q = tf(tokenize(query));
  const fromFiles = ragChunks.map(c => ({ ...c, score: cosine(q, c.tf || {}) })).filter(c => c.score > 0.02);
  return [...fromFiles, ...ontologyRetrieve(query, 6)].sort((a, b) => b.score - a.score).slice(0, k + 2);
}

async function ingestFiles(fileList) {
  for (const f of fileList) {
    const text = await f.text();
    for (const ch of chunkText(text)) {
      const item = { source: f.name, text: ch, tf: tf(tokenize(ch)), ts: Date.now() };
      ragChunks.push(item);
      await saveRagChunk(item);
    }
  }
  bootMsg("RAG: " + ragChunks.length + " фрагментов", null);
  addBubble("assistant", "В RAG добавлены файлы. Фрагментов: " + ragChunks.length + ". Спрашивайте по содержимому.", "rag");
}

function expandFallback(userText, contextHits) {
  const low = userText.toLowerCase();
  const ctx = (contextHits || []).map(h => "• (" + h.source + ") " + h.text).join("\n");
  if (/схем|диаграмм|архитектур|mermaid|покажи схему/.test(low)) {
    return { answer: "Архитектура АКСИ MATRIX:\n\n```mermaid\nflowchart TB\n  U[Пользователь] --> UI[MATRIX UI]\n  UI --> ORCH[Оркестратор TTP]\n  ORCH --> ONT[Онтология]\n  ORCH --> RAG[RAG]\n  ORCH --> LLM[WebLLM / fallback]\n  ORCH --> SIG[Resonance ECDSA]\n  LLM --> UI\n  SIG --> UI\n  UI --> MEM[IndexedDB]\n```\n\nСлои: UI → оркестратор → знания → генерация → подпись. DID: " + DID + ".", route: "architecture" };
  }
  if (contextHits && contextHits.length) {
    return { answer: "Развёрнутый ответ по локальным знаниям АКСИ:\n\n" + ctx + "\n\nСмысл: MATRIX — local-first в браузере (память, RAG, TTP-подпись). Омега — серверный контур FastAPI/Ollama. Без факта в контексте внешние «новости» не выдумываются. Контакт: aksilove@internet.ru. Apache-2.0.\n\nУточните модуль или загрузите документ в RAG.", route: "kb" };
  }
  if (/привет|здравств/.test(low)) {
    return { answer: "Здравствуйте. АКСИ MATRIX на связи.\n\nУже есть:\n• память IndexedDB\n• онтология разработок АКСИ\n• RAG по .txt/.md\n• ход мыслей с ECDSA-подписью\n• WebLLM или умный fallback\n\nСпросите про архитектуру, DID, сеть /app или загрузите файл.", route: "greet" };
  }
  if (/кто ты|что ты|представь/.test(low)) {
    return { answer: "Я АКСИ MATRIX — локальный ИИ этой страницы.\n\nDID: " + DID + ".\n\nОтвечаю по знаниям проекта и вашим файлам, показываю проверяемый ход мыслей, не подменяю внешние факты выдумкой. Рядом: /app (сеть агентов), Lab, Exocortex. Омега — для своего сервера.\n\nНе AGI: сила в прозрачности и локальности.", route: "identity" };
  }
  if (/помощ|умеешь|что можешь|функц/.test(low)) {
    return { answer: "Могу:\n1) Развёрнуто объяснить АКСИ (MATRIX, Омега, TTP, DID, @агенты).\n2) Отвечать по вашим файлам (RAG).\n3) Схемы Mermaid («покажи схему»).\n4) Подписанный ход мыслей справа.\n5) Голос (Chrome/Edge).\n\nАктуальные новости/курсы без локальных данных — честный отказ.", route: "help" };
  }
  return { answer: "Недостаточно совпадения в онтологии для уверенного ответа на «" + userText.slice(0, 100) + "».\n\nПопробуйте: «кто ты», «архитектура», «DID», «сеть агентов», кнопку «Схема», или загрузите .txt/.md.\n\nПолитика: лучше отказ, чем выдумка. DID: " + DID + ".", route: "refuse_soft" };
}

async function chat(userText) {
  const steps = [];
  const push = async (title, detail) => {
    const sig = await signText(title + "\n" + detail);
    steps.push({ title, detail, sig });
    showThoughts(steps);
  };
  await push("Приём запроса", userText.slice(0, 300));
  await push("Retrieve", "онтология + RAG");
  const hits = retrieve(userText, 5);
  await push("Контекст", hits.length ? hits.map(h => h.source + ": " + h.text.slice(0, 70)).join(" | ") : "пустой");
  const context = hits.map(h => "[" + h.source + "]\n" + h.text).join("\n\n");
  const history = await loadMsgs(10);
  const messages = [{ role: "system", content: SYSTEM + (context ? "\n\nCONTEXT:\n" + context : "") }];
  history.forEach(m => messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
  messages.push({ role: "user", content: userText });
  let answer, route;
  if (engine) {
    await push("Генерация", "WebLLM · развёрнутый ответ");
    try {
      const reply = await engine.chat.completions.create({ messages, temperature: 0.75, max_tokens: 900 });
      answer = reply.choices?.[0]?.message?.content || "";
      if (!answer || answer.length < 40) {
        const fb = expandFallback(userText, hits);
        answer = fb.answer; route = fb.route + "+short_llm";
      } else route = "webllm";
    } catch (e) {
      await push("Fallback", String(e.message || e));
      const fb = expandFallback(userText, hits);
      answer = fb.answer; route = fb.route;
    }
  } else {
    await push("Fallback-движок", "онтология АКСИ");
    const fb = expandFallback(userText, hits);
    answer = fb.answer; route = fb.route;
  }
  const finalSig = await signText(answer);
  await push("Resonance", "подпись · " + finalSig.sha256.slice(0, 24) + "…");
  await push("Готово", "route=" + route + " · " + DID);
  return { answer, route, steps, finalSig };
}

async function loadModel() {
  bootMsg("Подключаю WebLLM…", 5);
  try {
    engine = await CreateMLCEngine("TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", {
      initProgressCallback: (r) => {
        const p = Math.round((r.progress || 0) * 100);
        bootMsg((r.text || "Загрузка") + " · " + p + "%", p);
      },
    });
    bootMsg("Модель готова", 100);
    return true;
  } catch (e) {
    engine = null;
    bootMsg("Fallback активен", 100);
    return false;
  }
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { addBubble("assistant", "Голос: Chrome/Edge.", "voice"); return; }
  const rec = new SR();
  rec.lang = "ru-RU";
  rec.onresult = (ev) => { document.getElementById("inp").value = ev.results[0][0].transcript; send(); };
  rec.start();
  bootMsg("слушаю…");
}

async function send() {
  const inp = document.getElementById("inp");
  const text = (inp.value || "").trim();
  if (!text) return;
  inp.value = "";
  addBubble("user", text);
  await saveMsg("user", text);
  bootMsg("TTP · генерация…");
  document.getElementById("side").classList.add("on");
  const { answer, route, finalSig } = await chat(text);
  addBubble("assistant", answer, (engine ? "webllm" : "fallback") + " · " + route + " · sig " + (finalSig.sha256 || "").slice(0, 12));
  await saveMsg("assistant", answer, { route, sig: finalSig });
  bootMsg(engine ? "модель · RAG " + ragChunks.length : "fallback · RAG " + ragChunks.length);
}

document.getElementById("send").onclick = send;
document.getElementById("inp").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
document.getElementById("btn-model").onclick = async () => {
  document.getElementById("boot").style.display = "flex";
  document.getElementById("boot").classList.remove("hide");
  await loadModel();
  hideBoot();
};
document.getElementById("btn-mic").onclick = startVoice;
document.getElementById("file-input").onchange = async (e) => {
  if (e.target.files?.length) await ingestFiles(e.target.files);
  e.target.value = "";
};
document.getElementById("btn-clear").onclick = async () => {
  await clearMsgs();
  thread.innerHTML = "";
  showThoughts([{ title: "очищено", detail: "Новый диалог." }]);
  addBubble("assistant", "История очищена. АКСИ на связи.", "system");
};
document.getElementById("btn-arch").onclick = () => {
  document.getElementById("inp").value = "покажи схему архитектуры АКСИ";
  send();
};
document.getElementById("btn-thoughts").onclick = () => {
  document.getElementById("side").classList.toggle("on");
};

(async () => {
  try {
    bootMsg("Ключи Resonance…", 5);
    await ensureKeys();
    bootMsg("IndexedDB…", 10);
    const msgs = await loadMsgs(40);
    msgs.forEach(m => addBubble(m.role === "user" ? "user" : "assistant", m.content));
    bootMsg("RAG…", 18);
    ragChunks = (await loadRag()).map(c => ({ ...c, tf: c.tf || tf(tokenize(c.text || "")) }));
    const ok = await loadModel();
    if (!msgs.length) {
      addBubble("assistant", ok
        ? "АКСИ MATRIX: онтология, память, RAG, WebLLM, подписанный ход мыслей (ECDSA). Спросите развёрнуто или «покажи схему»."
        : "АКСИ MATRIX (fallback): онтология, RAG, TTP-подпись. WebLLM недоступна — ответы всё равно развёрнутые.", "system");
    }
    hideBoot();
    bootMsg(ok ? "готово · webllm · RAG " + ragChunks.length : "готово · fallback · RAG " + ragChunks.length);
  } catch (e) {
    bootMsg("Ошибка: " + (e.message || e), 100);
    addBubble("assistant", "Старт с ошибкой, чат в fallback.", "system");
    hideBoot();
  }
})();
