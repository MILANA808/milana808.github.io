/** AKSI i18n — ru | en | tt (Tatar basic) */
(function (g) {
  "use strict";
  var dict = {
    ru: {
      tagline: "Личный ИИ с подписью",
      placeholder: "Скажи АКСИ…",
      listening: "Слушаю…",
      resonance: "Резонанс…",
      speak: "Говори…",
      online: "Напиши или скажи — я здесь",
      matrix: "MATRIX",
      earn: "Доход",
      messages: "Сообщения",
      encrypt: "E2E шифрование",
      send: "Отправить",
    },
    en: {
      tagline: "Personal signed AI",
      placeholder: "Tell AKSI…",
      listening: "Listening…",
      resonance: "Resonance…",
      speak: "Speak…",
      online: "Type or speak — I’m here",
      matrix: "MATRIX",
      earn: "Earn",
      messages: "Messages",
      encrypt: "E2E encryption",
      send: "Send",
    },
    tt: {
      tagline: "Имзалы шәхси ЯС",
      placeholder: "АКСИга әйт…",
      listening: "Тыңлыйм…",
      resonance: "Резонанс…",
      speak: "Сөйлә…",
      online: "Яз яки сөйлә — мин монда",
      matrix: "MATRIX",
      earn: "Керем",
      messages: "Хатлар",
      encrypt: "E2E шифр",
      send: "Җибәр",
    },
  };

  function lang() {
    return localStorage.getItem("AKSI_LANG") || "ru";
  }

  function setLang(l) {
    if (!dict[l]) l = "ru";
    localStorage.setItem("AKSI_LANG", l);
    document.documentElement.lang = l;
    return l;
  }

  function t(key) {
    var d = dict[lang()] || dict.ru;
    return d[key] || dict.ru[key] || key;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
  }

  g.AksiI18n = { dict: dict, t: t, lang: lang, setLang: setLang, apply: apply };
})(typeof window !== "undefined" ? window : globalThis);
