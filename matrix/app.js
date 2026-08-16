import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const DB_NAME = "aksi_matrix_v3";
const STORE_MSG = "messages";
const STORE_RAG = "rag";
const STORE_KEYS = "keys";
const DID = "did:aksi:ed25519:sovereign-2026";

const SYSTEM = `Ты — АКСИ MATRIX. Отвечай развёрнуто на языке пользователя. Опирайся на CONTEXT. Не выдумывай новости и курсы. Схемы — в блоке mermaid. DID: ${DID}.`;

const ONTOLOGY = [
  { t: "АКСИ — суверенный local-first ИИ-контур: данные и ответы на устройстве пользователя, без обязательного иностранного облака.", k: ["акси", "что такое", "проект", "контур"] },
  { t: "Программный DID: did:aksi:ed25519:sovereign-2026. Контакт: aksilove@internet.ru. Лицензия: Apache License 2.0.", k: ["did", "идентич", "контакт", "лиценз", "email"] },
  { t: "MATRIX — браузерный ИИ: мгновенные ответы из онтологии и RAG, опционально WebLLM, IndexedDB-память, Mermaid, голос, ECDSA-подпись хода мыслей.", k: ["matrix", "браузер", "модель", "webllm"] },
  { t: "АКСИ-Омега — серверный контур: FastAPI, Ollama, hybrid RAG (Chroma+BM25), Рубикон (JSON-схема), Resonance Ed25519, Docker.", k: ["омега", "omega", "fastapi", "ollama", "сервер"] },
  { t: "Transparent Thought Protocol (TTP): каждый ответ сопровождается цепочкой шагов; Resonance подписывает шаги и итог (ECDSA P-256 / SHA-256).", k: ["ttp", "мысл", "подпись", "resonance", "крипт"] },
  { t: "Политика: нет факта в локальном CONTEXT → честный отказ, без галлюцинаций о «текущих» событиях.", k: ["галлюцин", "отказ", "политик", "правд"] },
  { t: "Сеть /app: регистрация, персональный агент @имя, общая лента, вызов чужого ИИ через @агент вопрос.", k: ["сеть", "агент", "лента", "@", "регистр"] },
  { t: "Оркестратор: приём → поиск знаний → маршрут → ответ → TTP → подпись. Ответ сначала из локальной базы (мгновенно).", k: ["оркестр", "как работа", "маршрут"] },
  { t: "Модули сайта: /matrix (этот ИИ), /app (сеть), /lab, /exocortex, /studio, /pulse, /quantum, /proof.", k: ["модул", "lab", "exocortex", "studio", "разделы"] },
  { t: "RAG: загрузите .txt/.md — фрагменты индексируются локально и участвуют в ответах.", k: ["rag", "файл", "загруз", "документ"] },
  { t: "Air-gapped / суверенный режим: приоритет локального инференса; внешние API не обязательны.", k: ["суверен", "air", "оффлайн", "локаль", "импорт"] },
  { t: "Не AGI: цель — проверяемый полезный локальный ассистент с прозрачной логикой.", k: ["agi", "превосход", "умный"] },
];

let engine = null;
let modelLoading = false;
let ragChunks = [];
let cryptoKey = null;

function bootMsg(t, pct) {
  const el = document.getElementById("boot-msg");
  if (el) el.textContent = t;
  if (pct != null) {
    const bar = document.getElementById("boot-bar");
    if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }
  const st = document.getElementById("status");
  if (st) st.textContent = t;
}
function hideBoot() {
  const b = document.getElementById("boot");
  if (!b) return;
  b.classList.add("hide");
  setTimeout(() => { b.style.display = "none"; }, 300);
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
  if (stored?.privateKey && stored?.publicKey) {
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
  if (!thoughtsEl) return;
  thoughtsEl.innerHTML = "";
  (steps || []).forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "step";
    d.innerHTML = "<b>" + (i + 1) + ". " + escapeHtml(s.title) + "</b>" + escapeHtml(s.detail || "");
    if (s.sig) {
      const m = document.createElement("div");
      m.className = "sig";
      m.textContent = "sig " + s.sig.sha256.slice(0, 16) + "… · " + (s.sig.signature || "").slice(0, 16) + "…";
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
  if (meta) {
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta;
    wrap.appendChild(m);
  }
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

function scoreOntology(query) {
  const low = query.toLowerCase();
  const q = tf(tokenize(query));
  return ONTOLOGY.map(row => {
    let score = cosine(q, tf(tokenize(row.t)));
    row.k.forEach(k => { if (low.includes(k)) score += 0.35; });
    return { source: "ontology", text: row.t, score };
  }).sort((a, b) => b.score - a.score);
}

function retrieve(query, k = 5) {
  const q = tf(tokenize(query));
  const fromFiles = ragChunks.map(c => ({ ...c, score: cosine(q, c.tf || {}) })).filter(c => c.score > 0.02);
  const fromOnt = scoreOntology(query).filter(c => c.score > 0.08);
  return [...fromFiles, ...fromOnt].sort((a, b) => b.score - a.score).slice(0, k);
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
  bootMsg("мгновенно · RAG " + ragChunks.length);
  addBubble("assistant", "Файлы в локальном RAG. Фрагментов: " + ragChunks.length + ". Можно спрашивать сразу.", "rag");
}

function composeInstant(userText, hits) {
  const low = userText.toLowerCase();
  const bullets = (hits || []).slice(0, 5).map(h => "• " + h.text).join("\n");
  if (/схем|диаграмм|архитектур|mermaid|покажи схему/.test(low)) {
    return { answer: "Архитектура АКСИ (локальный контур):\n\n```mermaid\nflowchart LR\n  U[Вы] --> Q[Вопрос]\n  Q --> R[Retrieve онтология+RAG]\n  R --> A[Мгновенный ответ]\n  A --> T[TTP шаги]\n  T --> S[ECDSA подпись]\n  S --> UI[Экран]\n  UI --> M[IndexedDB]\n```\n\nПоток: вопрос → поиск → ответ сразу → подписанный ход мыслей. WebLLM — опционально в фоне.\n\nDID: " + DID + " · Apache-2.0 · aksilove@internet.ru", route: "architecture" };
  }
  if (/привет|здравств|добрый|hello|hi\b/.test(low)) {
    return { answer: "Здравствуйте. АКСИ MATRIX отвечает сразу из локальных знаний.\n\nБез ожидания модели:\n• онтология АКСИ\n• RAG по файлам\n• ход мыслей с подписью\n• схемы Mermaid\n\nWebLLM — кнопка «Модель», не блокирует чат.\n\nСпросите: кто ты, архитектура, DID, сеть — или загрузите .txt/.md.", route: "greet" };
  }
  if (/кто ты|что ты|представь|твоя роль/.test(low)) {
    return { answer: "Я АКСИ MATRIX — локальный ассистент на этой странице.\n\nDID: " + DID + ".\n\nКак устроен ответ:\n1) Мгновенный поиск по онтологии и RAG\n2) Сборка развёрнутого ответа\n3) TTP — шаги справа\n4) ECDSA P-256 подпись\n\nРядом: /app, Lab, Exocortex. Омега — свой сервер.\n\nНе AGI: быстрый проверяемый local-first помощник.", route: "identity" };
  }
  if (/помощ|умеешь|что можешь|команд|функц/.test(low)) {
    return { answer: "Могу сразу:\n1) Объяснять АКСИ, MATRIX, Омегу, TTP, DID, @агентов\n2) Отвечать по файлам (RAG)\n3) Схемы («покажи схему»)\n4) Подписанный ход мыслей\n5) Голос (Chrome/Edge)\n6) По желанию — WebLLM\n\nНе выдумываю курсы и новости без ваших данных.", route: "help" };
  }
  if (hits && hits.length && hits[0].score > 0.15) {
    return { answer: "По локальным знаниям:\n\n" + bullets + "\n\nВывод: АКСИ — суверенный local-first контур (MATRIX в браузере, Омега на сервере). Прозрачность TTP важнее громких заявлений.\n\nУточните вопрос или добавьте файл в RAG.", route: "kb" };
  }
  return { answer: "По «" + userText.slice(0, 120) + "» мало точных совпадений в онтологии.\n\nПопробуйте: кто ты / DID / архитектура / сеть агентов / TTP — или загрузите документ.\n\nПолитика: лучше пробел, чем выдумка. " + DID, route: "refuse_soft" };
}

async function chat(userText) {
  const t0 = performance.now();
  const steps = [];
  const push = async (title, detail) => {
    const sig = await signText(title + "\n" + detail);
    steps.push({ title, detail, sig });
    showThoughts(steps);
  };
  await push("Приём", userText.slice(0, 240));
  const hits = retrieve(userText, 6);
  await push("Retrieve", hits.length ? hits.map(h => h.source + "(" + (h.score || 0).toFixed(2) + ")").join(", ") : "пусто");
  let { answer, route } = composeInstant(userText, hits);
  await push("Сборка", "instant · " + route);
  if (engine && !/схем|диаграмм|архитектур|mermaid/.test(userText.toLowerCase())) {
    try {
      await push("WebLLM", "фоновое усиление");
      const context = hits.map(h => h.text).join("\n");
      const reply = await engine.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM + (context ? "\nCONTEXT:\n" + context : "") },
          { role: "user", content: userText },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });
      const extra = reply.choices?.[0]?.message?.content || "";
      if (extra && extra.length > 80) {
        answer = answer + "\n\n—\nДополнение модели:\n" + extra;
        route = route + "+llm";
      }
    } catch (_) {}
  }
  const finalSig = await signText(answer);
  const ms = Math.round(performance.now() - t0);
  await push("Resonance", finalSig.sha256.slice(0, 20) + "… · " + ms + " ms");
  return { answer, route, finalSig, ms };
}

async function loadModel() {
  if (modelLoading || engine) return !!engine;
  modelLoading = true;
  bootMsg("WebLLM в фоне…", 5);
  try {
    engine = await CreateMLCEngine("TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", {
      initProgressCallback: (r) => {
        const p = Math.round((r.progress || 0) * 100);
        bootMsg("модель " + p + "%", p);
      },
    });
    bootMsg("модель готова · чат уже был мгновенным");
    return true;
  } catch (e) {
    engine = null;
    bootMsg("мгновенный режим · модель пропущена");
    return false;
  } finally {
    modelLoading = false;
  }
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { addBubble("assistant", "Голос: Chrome или Edge.", "voice"); return; }
  const rec = new SR();
  rec.lang = "ru-RU";
  rec.onresult = (ev) => { document.getElementById("inp").value = ev.results[0][0].transcript; send(); };
  rec.start();
  bootMsg("слушаю…");
}

let busy = false;
async function send() {
  if (busy) return;
  const inp = document.getElementById("inp");
  const text = (inp.value || "").trim();
  if (!text) return;
  inp.value = "";
  busy = true;
  addBubble("user", text);
  await saveMsg("user", text);
  document.getElementById("side")?.classList.add("on");
  try {
    const { answer, route, finalSig, ms } = await chat(text);
    addBubble("assistant", answer, "instant · " + route + " · " + ms + " ms · sig " + (finalSig.sha256 || "").slice(0, 12));
    await saveMsg("assistant", answer, { route, sig: finalSig, ms });
    bootMsg("готово · " + ms + " ms · RAG " + ragChunks.length + (engine ? " · llm" : ""));
  } catch (e) {
    addBubble("assistant", "Ошибка: " + (e.message || e), "error");
  } finally {
    busy = false;
  }
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
  addBubble("assistant", "История очищена. Пишите — ответ сразу.", "system");
};
document.getElementById("btn-arch").onclick = () => {
  document.getElementById("inp").value = "покажи схему архитектуры АКСИ";
  send();
};
document.getElementById("btn-thoughts").onclick = () => {
  document.getElementById("side")?.classList.toggle("on");
};

(async () => {
  try {
    bootMsg("Ключи…", 20);
    await ensureKeys();
    bootMsg("Память…", 50);
    const msgs = await loadMsgs(40);
    msgs.forEach((m) => addBubble(m.role === "user" ? "user" : "assistant", m.content));
    ragChunks = (await loadRag()).map((c) => ({ ...c, tf: c.tf || tf(tokenize(c.text || "")) }));
    bootMsg("мгновенный режим готов", 100);
    if (!msgs.length) {
      addBubble("assistant", "АКСИ отвечает сразу из локальной онтологии и RAG. Тяжёлая модель — кнопка «Модель», без блокировки чата.\n\nСпросите что угодно или нажмите «Схема».", "system");
    }
    hideBoot();
    bootMsg("instant · RAG " + ragChunks.length);
  } catch (e) {
    bootMsg("ошибка старта", 100);
    addBubble("assistant", "Старт с ошибкой, чат доступен: " + (e.message || e), "system");
    hideBoot();
  }
})();
