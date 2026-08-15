import { analyzeProbs } from "../utils/quantum-logic.js";

const QUANTUM_RE = /квант|кубит|qubit|запут|белл|bell|схем|cnot|магия|superpos|телепорт|гровер/i;

export class AksiAgent {
  constructor({ quirk, llm, ui, history }) {
    this.quirk = quirk;
    this.llm = llm;
    this.ui = ui;
    this.history = history;
  }

  async handle(raw) {
    const text = String(raw || "").trim();
    if (!text) return;
    document.getElementById("inp").value = "";
    this.ui.add("u", text);
    await this.history.push("u", text);

    if (/покажи\s*магию/i.test(text) || text.toLowerCase() === "магия") {
      await this.magic();
      return;
    }

    if (QUANTUM_RE.test(text)) {
      await this.quantum(text);
      return;
    }

    this.ui.setStatus("думаю…");
    const ans = await this.llm.chat(text);
    this.ui.add("a", ans, "webllm");
    await this.history.push("a", ans, "webllm");
    this.ui.setStatus("АКСИ online");
  }

  async magic() {
    this.ui.playWaves(1800);
    await this.sleep(400);
    this.ui.add("a", "⚡ Магия: строю состояние Белла…", "magic");
    const res = await this.quirk.runTemplate("bell_state");
    const expl = analyzeProbs(res.probs);
    const msg = "Схема: H → CNOT (Quirk + локальный statevector)\n" + expl;
    this.ui.add("a", msg, "quantum");
    await this.history.push("a", msg, "quantum");
  }

  async quantum(text) {
    let key = "bell_state";
    if (/телепорт/i.test(text)) key = "teleportation";
    else if (/суперпоз/i.test(text)) key = "superposition";
    const res = await this.quirk.runTemplate(key);
    const expl = analyzeProbs(res.probs);
    const msg = "Шаблон: " + key + "\n" + expl;
    this.ui.add("a", msg, "quantum");
    await this.history.push("a", msg, "quantum");
  }

  sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
}
