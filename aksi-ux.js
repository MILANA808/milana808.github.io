/**
 * AKSI UX — human answers overlay (after ONE)
 */
(function (G) {
  "use strict";
  function patch() {
    if (!G.AKSI_ONE) return;
    var answers = {
      hi: "Привет! Я АКСИ — помощник в вашем браузере. Спросите что угодно или откройте «Помощь».",
      who: "Я АКСИ — локальный помощник. Отвечаю на вопросы, помню заметки, могу прочитать текст с фото. Данные остаются у вас. Контакт: aksilove@internet.ru",
      can: "Умею отвечать в чате, запоминать («запомни: …»), разбирать фото, подключать Ollama. Подробнее — вкладка «Помощь».",
    };
    var orig = G.AKSI_ONE.thinkLocal;
    if (typeof orig !== "function") return;
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
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { setTimeout(patch, 100); });
  else setTimeout(patch, 100);
})(window);
