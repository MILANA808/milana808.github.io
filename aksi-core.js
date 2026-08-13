/* AKSI Core v2 — local reasoning without server */
window.AksiCore = (function () {
  var NET = "AKSI_NET_V1";
  var DREAMS = "AKSI_DREAMS_V1";
  var MEM = "AKSI_CORE_MEM";

  function load(key, fb) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fb : v;
    } catch (e) {
      return fb;
    }
  }
  function saveMem(role, text) {
    var m = load(MEM, []);
    m.push({ role: role, text: String(text).slice(0, 500), t: Date.now() });
    localStorage.setItem(MEM, JSON.stringify(m.slice(-40)));
  }

  function score(blob, words) {
    var s = 0;
    words.forEach(function (w) {
      if (w.length > 1 && blob.indexOf(w) >= 0) s += w.length > 3 ? 2 : 1;
    });
    return s;
  }

  function fromNet(q) {
    var pages = load(NET, []);
    if (!Array.isArray(pages) || !pages.length) return null;
    var words = q.toLowerCase().split(/\s+/);
    var best = null, bestS = 0;
    pages.forEach(function (p) {
      var blob = ((p.title || "") + " " + (p.body || "") + " " + (p.tags || []).join(" ")).toLowerCase();
      var s = score(blob, words);
      if ((p.title || "").toLowerCase().indexOf(q.toLowerCase()) >= 0) s += 5;
      if (s > bestS) {
        bestS = s;
        best = p;
      }
    });
    if (!best || bestS < 2) return null;
    return { text: best.body, source: "Сеть · " + best.title };
  }

  function fromDreams(q) {
    if (!/сон|снилось|сновид/.test(q)) return null;
    var d = load(DREAMS, []);
    if (d[0]) return { text: d[0].text + (d[0].seal ? "\nПечать: " + d[0].seal : ""), source: "Сон" };
    return { text: "Снов ещё нет. Откройте раздел Сны.", source: null };
  }

  function fromCore(q) {
    if (!window.AKSIKnowledge) return null;
    var p = AKSIKnowledge.search(q);
    if (!p) return null;
    return { text: p.title + ".\n\n" + p.body, source: "Ядро" };
  }

  function rules(q) {
    var low = q.toLowerCase();
    if (/^(привет|здравств|добрый|hello)/.test(low))
      return { text: "Здравствуйте. Я АКСИ — локальное ядро. Сначала сеть, потом знания, потом веб.", source: null };
    if (/ты здесь|ты жив|на связи|кто ты/.test(low))
      return {
        text: "Да. АКСИ на связи. DID: did:aksi:ed25519:sovereign-2026. Режим: офлайн-ядро + ваша сеть.",
        source: "Идентичность",
      };
    if (/как тебя зовут/.test(low)) return { text: "АКСИ.", source: null };
    if (/спасибо|благодар/.test(low)) return { text: "Пожалуйста.", source: null };
    if (/навигатор|путь|gps|карта/.test(low))
      return {
        text: "Навигатор: /drive/ — кнопка «Вести». Офлайн: GPS двигает стрелку без интернета; если GPS пропал — PDR (компас+шаги). Маршрут по адресу нужен интернет.",
        source: "Справка",
      };
    if (/бэкап|сохран/.test(low))
      return { text: "Бэкап: /backup/ — скачайте JSON на телефон.", source: "Справка" };
    if (/что умеешь|помощ|help|функц/.test(low))
      return {
        text: "Чат Net-first, сеть знаний, сны с печатью, бэкап, навигатор GPS+PDR, поле LIVE. Сервер не обязателен.",
        source: "Справка",
      };
    return null;
  }

  async function wiki(q) {
    if (!navigator.onLine) return null;
    try {
      var query = q.replace(/^(что такое|кто такой|расскажи про|почему)\s+/i, "").trim();
      if (query.length < 2) return null;
      var ctrl = new AbortController();
      var t = setTimeout(function () {
        ctrl.abort();
      }, 4500);
      var s = await fetch(
        "https://ru.wikipedia.org/w/api.php?action=opensearch&search=" +
          encodeURIComponent(query) +
          "&limit=1&namespace=0&format=json&origin=*",
        { signal: ctrl.signal }
      ).then(function (r) {
        return r.json();
      });
      clearTimeout(t);
      var title = s && s[1] && s[1][0];
      if (!title) return null;
      var j = await fetch("https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title)).then(function (r) {
        return r.json();
      });
      if (!j || !j.extract) return null;
      return { text: j.title + ".\n\n" + String(j.extract).slice(0, 900), source: "Wikipedia" };
    } catch (e) {
      return null;
    }
  }

  async function reply(userText) {
    var q = String(userText || "").trim();
    if (!q) return { text: "Напишите вопрос.", source: null };
    saveMem("user", q);
    var a =
      rules(q) ||
      fromDreams(q) ||
      fromNet(q) ||
      fromCore(q) ||
      (await wiki(q)) || {
        text: navigator.onLine
          ? "Не нашла точного ответа. Добавьте факт в Сеть — в следующий раз отвечу из неё."
          : "Офлайн: в сети и ядре нет ответа. Запишите знание в /net/.",
        source: null,
      };
    saveMem("aksi", a.text);
    return a;
  }

  return { reply: reply, saveMem: saveMem };
})();
