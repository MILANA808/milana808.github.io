export class ChatRenderer {
  constructor(threadEl, wavesEl) {
    this.thread = threadEl;
    this.waves = wavesEl;
  }

  add(role, text, meta) {
    const d = document.createElement("div");
    d.className = "msg " + (role === "u" ? "u" : "a");
    const b = document.createElement("div");
    b.className = "b";
    b.textContent = text;
    d.appendChild(b);
    if (meta) {
      const m = document.createElement("div");
      m.className = "m";
      m.textContent = meta;
      d.appendChild(m);
    }
    this.thread.appendChild(d);
    this.thread.scrollTop = this.thread.scrollHeight;
  }

  playWaves(ms) {
    this.waves.classList.add("on");
    setTimeout(() => this.waves.classList.remove("on"), ms || 1600);
  }

  setStatus(t) {
    const s = document.getElementById("status");
    if (s) s.textContent = t;
  }

  startVoice(onText) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.add("a", "Голосовой ввод не поддерживается в этом браузере.", "voice");
      return;
    }
    const r = new SR();
    r.lang = "ru-RU";
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      onText(t);
    };
    r.onerror = () => this.add("a", "Ошибка микрофона.", "voice");
    r.start();
  }
}
