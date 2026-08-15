import { runCircuit } from "../utils/quantum-logic.js";

export class QuirkController {
  constructor(iframe, probsEl) {
    this.iframe = iframe;
    this.probsEl = probsEl;
    this.templates = null;
  }

  async loadTemplates() {
    if (this.templates) return this.templates;
    const r = await fetch(new URL("../../data/templates.json", import.meta.url));
    this.templates = await r.json();
    return this.templates;
  }

  async loadTemplate(key) {
    const templates = await this.loadTemplates();
    const t = templates[key];
    if (!t) return;
    this.iframe.src = t.quirkUrl;
  }

  async runTemplate(key) {
    const templates = await this.loadTemplates();
    const t = templates[key] || templates.bell_state;
    this.iframe.src = t.quirkUrl;
    try {
      this.iframe.contentWindow && this.iframe.contentWindow.postMessage({ type: "aksi-load", template: key }, "*");
    } catch (_) {}
    const sim = runCircuit(t.gates || ["H0", "CNOT"]);
    this.renderProbs(sim.probs, t.name);
    return { template: key, probs: sim.probs, gates: t.gates };
  }

  renderProbs(probs, name) {
    const labels = ["00", "01", "10", "11"];
    this.probsEl.textContent =
      (name || "circuit") + ": " +
      labels.map((L, i) => "|" + L + "⟩=" + (probs[i] || 0).toFixed(3)).join("  ");
  }
}
