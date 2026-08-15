import { AksiAgent } from "./core/aksii-agent.js";
import { WebLLMWrapper } from "./ai/webllm-wrapper.js";
import { QuirkController } from "./quantum/quirk-controller.js";
import { HistoryStore } from "./storage/history.js";
import { ChatRenderer } from "./ui/chat-renderer.js";

const status = document.getElementById("status");
const quirk = new QuirkController(document.getElementById("quirk"), document.getElementById("probs"));
const history = new HistoryStore();
const ui = new ChatRenderer(document.getElementById("thread"), document.getElementById("waves"));
const llm = new WebLLMWrapper({ statusEl: status });
const agent = new AksiAgent({ quirk, llm, ui, history });

async function boot() {
  status.textContent = "история…";
  const last = await history.loadLast(10);
  last.forEach((m) => ui.add(m.role, m.text, m.meta || ""));
  status.textContent = "АКСИ online";
  if (!last.length) {
    ui.add("a", "АКСИ MATRIX v1.1 на связи.\nСкажите «покажи магию» или спросите про запутанность.", "system");
  }
  quirk.loadTemplate("bell_state");
}

document.getElementById("send").onclick = () => agent.handle(document.getElementById("inp").value);
document.getElementById("inp").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); agent.handle(document.getElementById("inp").value); }
});
document.getElementById("magic").onclick = () => agent.handle("покажи магию");
document.getElementById("mic").onclick = () => ui.startVoice((t) => {
  document.getElementById("inp").value = t;
  agent.handle(t);
});

boot();
