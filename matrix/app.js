import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";
import { detectSkill, runSkill } from "./skills.js";

const DB_NAME = "aksi_matrix_v4";
const STORE_MSG = "messages";
const STORE_RAG = "rag";
const STORE_KEYS = "keys";
const DID = "did:aksi:ed25519:sovereign-2026";
const VERSION = "MATRIX-4.0-instant";

const SYSTEM = `Ты — АКСИ MATRIX ${VERSION}. Отвечай развёрнуто. Опирайся на CONTEXT. Не выдумывай новости. Схемы — mermaid. DID: ${DID}.`;

const ONTOLOGY = [
  { t: "АКСИ — суверенный local-first ИИ-контур: ответы и данные на устройстве, без обязательного иностранного облака.", k: ["акси","aksi","контур","проект","суверен","что такое"] },
  { t: "DID: did:aksi:ed25519:sovereign-2026. Контакт aksilove@internet.ru. Лицензия Apache-2.0.", k: ["did","идентич","контакт","лиценз","email"] },
  { t: "MATRIX 4.0: мгновенный оркестратор, онтология, RAG, TTP+ECDSA, skills, proof/verify, опциональный WebLLM.", k: ["matrix","версия","4.0","skills","мгновен"] },
  { t: "Омега: FastAPI + Ollama + hybrid RAG + Рубикон + Resonance Ed25519 + Docker.", k: ["омега","omega","fastapi","ollama","сервер","docker"] },
  { t: "TTP: цепочка шагов; шаг и итог подписываются ECDSA P-256 + SHA-256 (Resonance в браузере).", k: ["ttp","мысл","ход","прозрачн","thought"] },
  { t: "Политика anti-hallucination: нет опоры в CONTEXT → отказ/уточнение, без выдуманных текущих фактов.", k: ["галлюцин","отказ","политик","правд"] },
  { t: "Сеть /app: аккаунты, агент @имя, лента, вызов через @agent текст.", k: ["сеть","агент","лента","@","регистр","network"] },
  { t: "Оркестратор: intent → retrieve → skills? → compose → TTP → sign. Instant-path не ждёт LLM.", k: ["оркестр","intent","маршрут","compose"] },
  { t: "Модули: /matrix /app /lab /exocortex /studio /pulse /quantum /proof /kernel /offer.", k: ["модул","lab","exocortex","studio","quantum","proof"] },
  { t: "RAG: .txt/.md → чанки IndexedDB, TF-cosine + онтология.", k: ["rag","файл","загруз","документ"] },
  { t: "Air-gapped: приоритет локального контура; внешние API не обязательны.", k: ["air","оффлайн","локаль","суверен","периметр"] },
  { t: "Swarm (Омега): Research Critic Coder Guardian Formalizer Scientist; mutations_allowed=false.", k: ["swarm","рой","critic","guardian"] },
  { t: "Не AGI: проверяемый полезный ассистент, не заявление о превосходстве над frontier-моделями.", k: ["agi","превосход","frontier"] },
];

const SYNONYMS = {
  "архитектура": ["схема","структура","слои","architecture","diagram"],
  "подпись": ["signature","resonance","sig","хеш","hash"],
  "помощь": ["help","команды","умеешь","функции"],
};

let engine = null, modelLoading = false, ragChunks = [], cryptoKey = null, lastPackage = null;

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
  setTimeout(() => { b.style.display = "none"; }, 280);
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
  return { alg: "ECDSA-P256-SHA256", did: DID, sha256: await sha256hex(text), signature: b64(sig), at: new Date().toISOString() };
}
async function verifyText(text, signatureB64) {
  await ensureKeys();
  try {
    const bin = Uint8Array.from(atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, cryptoKey.publicKey, bin, new TextEncoder().encode(text));
  } catch { return false; }
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
      m.textContent = "sig " + s.sig.sha256.slice(0, 16) + "… · " + (s.sig.signature || "").slice(0, 14) + "…";
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
  } catch (e) { container.textContent = code; }
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
    const box = document.createElement("div"); box.className = "mermaid-box"; bubble.appendChild(box);
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
function expandQuery(q) {
  let low = q.toLowerCase();
  Object.entries(SYNONYMS).forEach(([root, list]) => {
    if (list.some(x => low.includes(x)) && !low.includes(root)) low += " " + root;
  });
  return low;
}
function tf(tokens) {
  const m = {}; tokens.forEach(t => { m[t] = (m[t] || 0) + 1; }); return m;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => {
    const x = a[k] || 0, y = b[k] || 0;
    dot += x * y; na += x * x; nb += y * y;
  });
  return (!na || !nb) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function chunkText(text, size = 480) {
  const parts = [], clean = text.replace(/\r/g, "");
  for (let i = 0; i < clean.length; i += size) parts.push(clean.slice(i, i + size));
  return parts.filter(p => p.trim().length > 20);
}
function scoreOntology(query) {
  const low = expandQuery(query);
  const q = tf(tokenize(low));
  return ONTOLOGY.map(row => {
    let score = cosine(q, tf(tokenize(row.t))) * 1.2;
    row.k.forEach(k => { if (low.includes(k)) score += 0.4; });
    return { source: "ontology", text: row.t, score };
  }).sort((a, b) => b.score - a.score);
}
function retrieve(query, k = 6) {
  const q = tf(tokenize(expandQuery(query)));
  const fromFiles = ragChunks.map(c => ({ ...c, score: cosine(q, c.tf || {}) })).filter(c => c.score > 0.02);
  const fromOnt = scoreOntology(query).filter(c => c.score > 0.1);
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
  bootMsg("instant · RAG " + ragChunks.length);
  addBubble("assistant", "RAG обновлён. Фрагментов: " + ragChunks.length + ".", "rag");
}

function composeInstant(userText, hits, skillOut) {
  const low = userText.toLowerCase();
  const bullets = (hits || []).slice(0, 6).map((h, i) => (i + 1) + ". [" + h.source + "] " + h.text).join("\n");
  const conf = hits && hits[0] ? Math.min(0.95, 0.35 + hits[0].score) : 0.2;
  if (skillOut) return { answer: skillOut + "\n\nSkill локально. DID: " + DID + " · " + VERSION, route: "skill", confidence: 0.99 };
  if (/схем|диаграмм|архитектур|mermaid|покажи схему/.test(low)) {
    return { answer: "Архитектура АКСИ MATRIX 4.0:\n\n```mermaid\nflowchart TB\n  U[Пользователь] --> I[Intent + Skills]\n  I --> R[Retrieve]\n  R --> C[Compose instant]\n  C --> T[TTP]\n  T --> S[ECDSA]\n  S --> UI[Ответ + proof]\n  I -.opt.-> L[WebLLM]\n```\n\nНовое: skills, proof, verify, confidence, синонимы.\nDID: " + DID, route: "architecture", confidence: 0.95 };
  }
  if (/привет|здравств|добрый|hello|hi\b/.test(low)) {
    return { answer: "Здравствуйте. MATRIX 4.0 — instant.\n\n• онтология + RAG\n• TTP + ECDSA\n• skills: hash / uuid / время / посчитай\n• Proof + Verify\n\nWebLLM — кнопка «Модель».", route: "greet", confidence: 0.9 };
  }
  if (/кто ты|что ты|представь|версия/.test(low)) {
    return { answer: "Я АКСИ MATRIX " + VERSION + ".\n\nDID: " + DID + "\n\n1) Intent/skills 2) Retrieve 3) Compose 4) TTP+ECDSA 5) Proof\n\nНе AGI — local-first проверяемый ассистент.", route: "identity", confidence: 0.95 };
  }
  if (/помощ|умеешь|команд|skills|функц/.test(low)) {
    return { answer: "• Вопрос по АКСИ\n• покажи схему\n• hash текст / uuid / который час / посчитай 12*7\n• RAG-файлы\n• Proof / Verify\n\naksilove@internet.ru", route: "help", confidence: 0.92 };
  }
  if (hits && hits.length && hits[0].score > 0.18) {
    return { answer: "Сводка (confidence ~" + conf.toFixed(2) + "):\n\n" + bullets + "\n\nСинтез: local-first АКСИ — MATRIX в браузере, Омега в периметре, TTP для проверяемости.", route: "kb", confidence: conf };
  }
  return { answer: "Мало опоры на «" + userText.slice(0, 100) + "». Спросите DID/TTP/архитектура/сеть или skill/uuid/hash.\n" + DID, route: "refuse_soft", confidence: conf };
}

async function chat(userText) {
  const t0 = performance.now();
  const steps = [];
  const push = async (title, detail) => {
    const sig = await signText(title + "\n" + detail);
    steps.push({ title, detail, sig });
    showThoughts(steps);
  };
  await push("Приём", userText.slice(0, 220));
  const skill = detectSkill(userText);
  let skillOut = null;
  if (skill) {
    await push("Skill", skill.name);
    skillOut = await runSkill(skill, sha256hex);
  }
  const hits = retrieve(userText, 6);
  await push("Retrieve", hits.length ? hits.map(h => h.source + "@" + (h.score || 0).toFixed(2)).join(", ") : "пусто");
  let { answer, route, confidence } = composeInstant(userText, hits, skillOut);
  await push("Compose", route + " · conf " + (confidence || 0).toFixed(2));
  if (engine && !skill && !/схем|диаграмм|архитектур|mermaid/.test(userText.toLowerCase())) {
    try {
      await push("WebLLM", "optional");
      const context = hits.map(h => h.text).join("\n");
      const reply = await engine.chat.completions.create({
        messages: [{ role: "system", content: SYSTEM + (context ? "\nCONTEXT:\n" + context : "") }, { role: "user", content: userText }],
        temperature: 0.65, max_tokens: 350,
      });
      const extra = reply.choices?.[0]?.message?.content || "";
      if (extra.length > 80) { answer += "\n\n—\nWebLLM:\n" + extra; route += "+llm"; }
    } catch (_) {}
  }
  const finalSig = await signText(answer);
  const ms = Math.round(performance.now() - t0);
  await push("Resonance", finalSig.sha256.slice(0, 18) + "… · " + ms + "ms");
  lastPackage = {
    version: VERSION, did: DID, question: userText, answer, route, confidence, ms,
    steps: steps.map(s => ({ title: s.title, detail: s.detail, sha256: s.sig?.sha256, signature: s.sig?.signature })),
    final: finalSig,
    sources: (hits || []).map(h => ({ source: h.source, score: h.score, preview: (h.text || "").slice(0, 120) })),
    created_at: new Date().toISOString(),
  };
  return { answer, route, finalSig, ms, confidence };
}

async function loadModel() {
  if (modelLoading || engine) return !!engine;
  modelLoading = true;
  bootMsg("WebLLM…", 5);
  try {
    engine = await CreateMLCEngine("TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", {
      initProgressCallback: (r) => bootMsg("модель " + Math.round((r.progress || 0) * 100) + "%", Math.round((r.progress || 0) * 100)),
    });
    bootMsg("модель on");
    return true;
  } catch { engine = null; bootMsg("instant only"); return false; }
  finally { modelLoading = false; }
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { addBubble("assistant", "Голос: Chrome/Edge.", "voice"); return; }
  const rec = new SR(); rec.lang = "ru-RU";
  rec.onresult = (ev) => { document.getElementById("inp").value = ev.results[0][0].transcript; send(); };
  rec.start(); bootMsg("слушаю…");
}

function exportProof() {
  if (!lastPackage) { addBubble("assistant", "Нет ответа для proof.", "proof"); return; }
  const blob = new Blob([JSON.stringify(lastPackage, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "aksi-proof-" + Date.now() + ".json"; a.click(); URL.revokeObjectURL(a.href);
  addBubble("assistant", "Proof JSON скачан.", "proof");
}
async function verifyLast() {
  if (!lastPackage?.final?.signature) { addBubble("assistant", "Нет подписи.", "verify"); return; }
  const ok = await verifyText(lastPackage.answer, lastPackage.final.signature);
  addBubble("assistant", ok ? "✅ Подпись верна (ECDSA P-256)." : "❌ Подпись не совпала.", "verify");
}

let busy = false;
async function send() {
  if (busy) return;
  const inp = document.getElementById("inp");
  const text = (inp.value || "").trim();
  if (!text) return;
  inp.value = ""; busy = true;
  addBubble("user", text); await saveMsg("user", text);
  document.getElementById("side")?.classList.add("on");
  try {
    const { answer, route, finalSig, ms, confidence } = await chat(text);
    addBubble("assistant", answer, "v4 · " + route + " · " + ms + "ms · conf " + (confidence || 0).toFixed(2) + " · " + (finalSig.sha256 || "").slice(0, 10));
    await saveMsg("assistant", answer, { route, sig: finalSig, ms, confidence });
    bootMsg("ok · " + ms + "ms · RAG " + ragChunks.length + (engine ? " · llm" : ""));
  } catch (e) { addBubble("assistant", "Ошибка: " + (e.message || e), "error"); }
  finally { busy = false; }
}

document.getElementById("send").onclick = send;
document.getElementById("inp").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
document.getElementById("btn-model").onclick = async () => {
  document.getElementById("boot").style.display = "flex";
  document.getElementById("boot").classList.remove("hide");
  await loadModel(); hideBoot();
};
document.getElementById("btn-mic").onclick = startVoice;
document.getElementById("file-input").onchange = async (e) => { if (e.target.files?.length) await ingestFiles(e.target.files); e.target.value = ""; };
document.getElementById("btn-clear").onclick = async () => {
  await clearMsgs(); thread.innerHTML = ""; lastPackage = null;
  showThoughts([{ title: "clear", detail: "Новая сессия." }]);
  addBubble("assistant", "Очищено. MATRIX 4.0 готов.", "system");
};
document.getElementById("btn-arch").onclick = () => { document.getElementById("inp").value = "покажи схему архитектуры АКСИ"; send(); };
document.getElementById("btn-thoughts").onclick = () => { document.getElementById("side")?.classList.toggle("on"); };
document.getElementById("btn-proof")?.addEventListener("click", exportProof);
document.getElementById("btn-verify")?.addEventListener("click", verifyLast);

(async () => {
  try {
    bootMsg("Ключи…", 25); await ensureKeys();
    bootMsg("Память…", 55);
    const msgs = await loadMsgs(40);
    msgs.forEach((m) => addBubble(m.role === "user" ? "user" : "assistant", m.content));
    ragChunks = (await loadRag()).map((c) => ({ ...c, tf: c.tf || tf(tokenize(c.text || "")) }));
    bootMsg("MATRIX 4.0", 100);
    if (!msgs.length) addBubble("assistant", "MATRIX 4.0: instant, skills, proof, verify.\n\nПримеры: кто ты · покажи схему · uuid · hash привет · посчитай 15*8", "system");
    hideBoot(); bootMsg("v4 · RAG " + ragChunks.length);
  } catch (e) {
    bootMsg("error", 100);
    addBubble("assistant", "Старт: " + (e.message || e), "system");
    hideBoot();
  }
})();
