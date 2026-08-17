import { AksiAgent } from "./core/aksii-agent.js";
import { WebLLMWrapper } from "./ai/webllm-wrapper.js";
import { QuirkController } from "./quantum/quirk-controller.js";
import { HistoryStore } from "./storage/history.js";
import { ChatRenderer } from "./ui/chat-renderer.js";

const $ = (id) => document.getElementById(id);
const status = $("status");
const input = $("inp");
const historyState = $("historyState");
const quirk = new QuirkController($("quirk"), $("probs"));
const history = new HistoryStore();
const ui = new ChatRenderer($("thread"), $("waves"));
const llm = new WebLLMWrapper({ statusEl: status });
const agent = new AksiAgent({ quirk, llm, ui, history });

function setStatus(text, ok = true) {
  if (status) status.textContent = text;
  const dot = $("stateDot");
  if (dot) dot.style.background = ok ? "#52e6a5" : "#ff718c";
}

async function refreshHistoryCount() {
  try {
    const last = await history.loadLast(9999);
    if (historyState) historyState.textContent = `память: ${last.length} записей`;
  } catch (error) {
    if (historyState) historyState.textContent = "память: недоступна";
    console.warn("AKSII history unavailable", error);
  }
}

async function send() {
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try {
    await agent.handle(text);
    input.value = "";
  } catch (error) {
    console.error(error);
    ui.add("a", "Не удалось выполнить запрос в текущем режиме. Локальная часть сайта продолжает работать. Попробуйте ещё раз или запустите «Магия».", "error");
    setStatus("ошибка запроса", false);
  } finally {
    input.disabled = false;
    await refreshHistoryCount();
    if (!status || status.textContent !== "ошибка запроса") setStatus("АКСИ online");
    input.focus();
  }
}

async function boot() {
  try {
    setStatus("запуск ядра…");
    const last = await history.loadLast(10);
    const thread = $("thread");
    if (thread) thread.innerHTML = "";
    last.forEach((m) => ui.add(m.role, m.text, m.meta || ""));
    if (!last.length) ui.add("a", "АКСИ MATRIX готова.\nПопробуйте «покажи магию» или задайте обычный вопрос.", "system");
    await refreshHistoryCount();
    if ($( "quirk" )) quirk.loadTemplate("bell_state");
    setStatus("АКСИ online");
  } catch (error) {
    console.error(error);
    setStatus("частичный режим", false);
    ui.add("a", "Я запустилась в частичном режиме: чат и часть локальных функций могут работать, но сохранение истории или квантовый модуль сейчас недоступны.", "startup");
  }
}

const sendButton = $("send");
if (sendButton) sendButton.onclick = send;
if (input) input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
});
const magic = $("magic");
if (magic) magic.onclick = () => agent.handle("покажи магию").then(refreshHistoryCount).catch((e) => console.error(e));
const mic = $("mic");
if (mic) mic.onclick = () => ui.startVoice((text) => {
  if (input) input.value = text;
  send();
});

boot();
