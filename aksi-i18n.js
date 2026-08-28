/**
 * AKSI i18n — RU / EN
 * localStorage aksi:lang = ru|en
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-i18n";
  var KEY = "aksi:lang";
  var dict = {
    ru: {
      title: "АКСИ — помощник",
      brand: "АКСИ",
      sub: "Локальный помощник · офлайн по умолчанию",
      welcome_h: "Добро пожаловать",
      welcome_p: "АКСИ отвечает на вопросы, помнит заметки и читает текст с фото. Интернет — только если вы включите галочку.",
      step1: "Напишите вопрос внизу",
      step2: "📷 — разобрать фото",
      step3: "Галочка «Интернет» — поиск в сети по желанию",
      chat: "Чат",
      photo: "Фото",
      mem: "Память",
      settings: "Настройки",
      help: "Помощь",
      more: "Ещё",
      ask: "Спросить",
      ask_d: "Текстовый диалог",
      photo_d: "Прочитать картинку",
      settings_d: "Модель и ключи",
      help_d: "Как всё работает",
      placeholder: "Напишите вопрос…",
      internet: "Интернет",
      internet_hint: "Выкл = только офлайн. Вкл = Wikipedia / поиск.",
      offline_badge: "офлайн",
      online_badge: "сеть вкл",
      ready: "готова",
      help_chat: "Чат — вопросы. «запомни: …» сохраняет факт.",
      help_photo: "Фото — текст с картинки.",
      help_mem: "Память — только в этом браузере.",
      help_net: "Интернет выключен по умолчанию. Включите галочку, чтобы искать в сети.",
      help_priv: "Ключи и память не уходят на серверы АКСИ. Поиск — только при включённой галочке.",
      contact: "Контакт",
      hide: "скрыть",
      process: "Обработать",
      wipe: "Очистить память",
      who: "Кто ты?",
      can: "Что умеешь?",
      remember: "Запомни",
      what_ai: "Что такое ИИ?",
      hint_chat: "Офлайн по умолчанию. Поиск в сети — галочка «Интернет».",
      photo_help: "Выберите снимок. OCR текста. С llava — описание.",
      settings_help: "Ollama усиливает ответы. Без неё — локальные знания.",
      precedent: "Прецедент",
      precedent_p: "Доказуемая политика offline-first. Откройте JSON для проверки.",
      greet_bubble: "Здравствуйте. Я АКСИ — офлайн по умолчанию. Интернет только по галочке."
    },
    en: {
      title: "AKSI — assistant",
      brand: "AKSI",
      sub: "Local assistant · offline by default",
      welcome_h: "Welcome",
      welcome_p: "AKSI answers questions, remembers notes, and reads text from photos. Internet only if you enable the checkbox.",
      step1: "Type a question below",
      step2: "📷 — analyze a photo",
      step3: "Checkbox «Internet» — optional web search",
      chat: "Chat",
      photo: "Photo",
      mem: "Memory",
      settings: "Settings",
      help: "Help",
      more: "More",
      ask: "Ask",
      ask_d: "Text dialogue",
      photo_d: "Read image text",
      settings_d: "Model & keys",
      help_d: "How it works",
      placeholder: "Write a question…",
      internet: "Internet",
      internet_hint: "Off = offline only. On = Wikipedia / search.",
      offline_badge: "offline",
      online_badge: "net on",
      ready: "ready",
      help_chat: "Chat — questions. «запомни: …» / remember saves a fact.",
      help_photo: "Photo — text from image.",
      help_mem: "Memory stays in this browser only.",
      help_net: "Internet is off by default. Enable the checkbox to search the web.",
      help_priv: "Keys and memory stay local. Network only with consent.",
      contact: "Contact",
      hide: "hide",
      process: "Process",
      wipe: "Clear memory",
      who: "Who are you?",
      can: "What can you do?",
      remember: "Remember",
      what_ai: "What is AI?",
      hint_chat: "Offline by default. Web search only with Internet checkbox.",
      photo_help: "Choose an image. OCR text. With llava — scene description.",
      settings_help: "Ollama improves answers. Without it — local knowledge.",
      precedent: "Precedent",
      precedent_p: "Provable offline-first policy. Open JSON to verify.",
      greet_bubble: "Hello. I am AKSI — offline by default. Internet only via the checkbox."
    }
  };
  function lang() {
    try {
      var l = localStorage.getItem(KEY);
      if (l === "en" || l === "ru") return l;
    } catch (e) {}
    return "ru";
  }
  function setLang(l) {
    l = l === "en" ? "en" : "ru";
    try { localStorage.setItem(KEY, l); } catch (e) {}
    try { document.documentElement.lang = l; } catch (e) {}
    return l;
  }
  function t(key) {
    var d = dict[lang()] || dict.ru;
    return (d && d[key]) || (dict.en && dict.en[key]) || key;
  }
  function apply() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (!k) return;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.placeholder = t(k);
      else el.textContent = t(k);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    try { document.title = t("title"); } catch (e) {}
    var b = document.getElementById("stBadge");
    if (b && G.AKSI_WEB && G.AKSI_WEB.isEnabled) {
      b.textContent = G.AKSI_WEB.isEnabled() ? t("online_badge") : t("offline_badge");
    }
    var lr = document.getElementById("langRu");
    var le = document.getElementById("langEn");
    if (lr) lr.classList.toggle("on", lang() === "ru");
    if (le) le.classList.toggle("on", lang() === "en");
  }
  G.AKSI_I18N = { version: VER, t: t, lang: lang, setLang: setLang, apply: apply, dict: dict };
})(typeof window !== "undefined" ? window : this);
