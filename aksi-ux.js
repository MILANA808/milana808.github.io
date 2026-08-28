/**
 * AKSI UX — human answers + safety overlay
 */
(function (G) {
  "use strict";
  var answers = {
    hi: "Привет! Я АКСИ — помощник в вашем браузере. Спросите что угодно или откройте «Помощь».",
    who: "Я АКСИ — локальный помощник. Отвечаю на вопросы, помню заметки, могу прочитать текст с фото. Данные остаются у вас. Контакт: aksilove@internet.ru",
    can: "Умею отвечать в чате, запоминать («запомни: …»), разбирать фото, подключать Ollama. Подробнее — вкладка «Помощь».",
  };
  function patchLocal() {
    if (!G.AKSI_ONE || typeof G.AKSI_ONE.thinkLocal !== "function") return false;
    if (G.AKSI_ONE._uxPatched) return true;
    var orig = G.AKSI_ONE.thinkLocal;
    G.AKSI_ONE.thinkLocal = function (q) {
      var low = String(q || "").toLowerCase().trim();
      if (/^(привет|здравств|добрый|hello|hi)\b/.test(low))
        return Promise.resolve({ text: answers.hi, meta: "local" });
      if (/кто ты|что ты такое|what are you/.test(low))
        return Promise.resolve({ text: answers.who, meta: "local" });
      if (/что умеешь|помощь|help|функци/.test(low))
        return Promise.resolve({ text: answers.can, meta: "local" });
      return orig(q);
    };
    G.AKSI_ONE._uxPatched = true;
    return true;
  }
  function run(n) {
    n = n || 0;
    if (!patchLocal() && n < 30) setTimeout(function () { run(n + 1); }, 100);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", function () { run(0); });
    else run(0);
  }
})(typeof window !== "undefined" ? window : this);
