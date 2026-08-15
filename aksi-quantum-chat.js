(function () {
  "use strict";

  const HIST = "AKSI_APP_CHAT_V2";
  const DID = "did:aksi:ed25519:sovereign-2026";
  const RESPONSES = {
    identity: "АКСИ — персональный когнитивный контур. Запрос сначала проходит через локальный state-vector симулятор, который вычисляет вероятностное состояние и классифицирует намерение. Затем система формирует ответ и сохраняет его происхождение.",
    trust: "Trust показывает проверяемый след: canonical payload, SHA-256 и связь с предыдущим событием. Симуляция помогает выбрать когнитивный маршрут, но не превращает утверждение в истину. Статус остаётся unverified, пока содержание не проверено независимым источником.",
    memory: "Память АКСИ работает локально в браузере. Quantum Runtime не отправляет запрос наружу: он получает текст, строит 3-кубитное состояние, рассчитывает распределение вероятностей и передаёт результат следующему слою.",
    quantum: "Это реальная классическая симуляция квантового состояния: 3 кубита, комплексные амплитуды, H/X/Y/Z и CNOT, измерение вероятностей и энтропия. Это не квантовый компьютер и не заявляет квантового превосходства.",
    architecture: "Пайплайн АКСИ: запрос → canonical input → локальная quantum state-vector simulation → intent inference → response layer → provenance → cognitive ledger. Сеть и внешняя модель остаются отдельными capability и выключены по умолчанию.",
    help: "Попробуйте спросить: что такое АКСИ, как работает Trust, что такое квантовая симуляция, где память, как устроено ядро или зачем нужен ledger."
  };

  function add(role, text, meta) {
    const log = document.getElementById("chatLog"); if (!log) return;
    const d = document.createElement("div"); d.className = "bubble " + (role === "user" ? "user" : "bot"); d.textContent = text;
    if (meta) { const m = document.createElement("div"); m.className = "meta"; m.textContent = meta; d.appendChild(m); }
    log.appendChild(d); log.scrollTop = 1e9;
  }
  function save(role, text, meta) {
    try { const h = JSON.parse(localStorage.getItem(HIST) || "[]"); h.push({ role, text, meta }); localStorage.setItem(HIST, JSON.stringify(h.slice(-50))); } catch (_) {}
  }
  function responseFor(intent, q) {
    const base = RESPONSES[intent] || RESPONSES.help;
    if (intent === "quantum") return base + "\n\nДля каждого запроса можно посмотреть технический след в Pro: число кубитов, top states, entropy и trace hash.";
    return base + "\n\nСформировано маршрутизатором АКСИ после локальной симуляции.";
  }

  async function handle(event) {
    const input = document.getElementById("chatInput");
    const q = (input && input.value || "").trim();
    if (!q || !window.AKSIQuantum) return;
    event.preventDefault(); event.stopImmediatePropagation();
    input.value = "";
    add("user", q); save("user", q);
    try {
      const quantum = await AKSIQuantum.run(q);
      const answer = responseFor(quantum.intent, q);
      const meta = "quantum " + quantum.qubits + "q · intent " + quantum.intent + " · entropy " + quantum.entropy + " · trace " + quantum.trace_hash.slice(0, 18) + "…";
      add("bot", answer, meta); save("bot", answer, meta);
      window.dispatchEvent(new CustomEvent("aksi:quantum-inference", { detail: { query: q, quantum, answer, did: DID } }));
      if (window.AKSI && typeof window.AKSI.emit === "function") window.AKSI.emit("quantum.inference", { intent: quantum.intent, trace_hash: quantum.trace_hash, input_hash: quantum.input_hash });
    } catch (err) {
      add("bot", "Quantum Runtime не смог выполнить симуляцию. Я не буду имитировать результат: проверьте диагностику АКСИ.", "quantum-error");
    }
  }

  function bind() {
    const send = document.getElementById("chatSend");
    const input = document.getElementById("chatInput");
    if (send) send.addEventListener("click", handle, true);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") handle(e); }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true }); else bind();
})();
