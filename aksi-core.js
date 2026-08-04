/** AKSI shared core — offline profile / feed / DMs (localStorage) */
(function (g) {
  "use strict";
  var PKEY = "AKSI_PROFILE_V1";
  var FKEY = "AKSI_FEED_V1";
  var MKEY = "AKSI_MSGS_V1";
  var MAX_POSTS = 80;
  var MAX_MSGS = 200;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function load(k, fallback) {
    try {
      var r = localStorage.getItem(k);
      return r ? JSON.parse(r) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }

  function defaultProfile() {
    var sid = localStorage.getItem("AKSI_SID");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("AKSI_SID", sid);
    }
    return {
      id: "user-" + sid.slice(0, 12),
      name: "Гость",
      bio: "",
      handle: "guest",
      did: localStorage.getItem("AKSI_GUEST_DID") || "",
      created: Date.now(),
      avatarHue: Math.floor(Math.random() * 40) + 20,
    };
  }

  function getProfile() {
    var p = load(PKEY, null);
    if (!p) {
      p = defaultProfile();
      save(PKEY, p);
    }
    return p;
  }

  function setProfile(patch) {
    var p = Object.assign(getProfile(), patch || {}, { updated: Date.now() });
    if (p.handle) p.handle = String(p.handle).replace(/[^a-zA-Z0-9_а-яА-ЯёЁ]/g, "").slice(0, 24);
    if (p.name) p.name = String(p.name).slice(0, 48);
    if (p.bio) p.bio = String(p.bio).slice(0, 280);
    save(PKEY, p);
    return p;
  }

  function seedFeed() {
    return [
      {
        id: "seed-1",
        author: "АКСИ",
        handle: "aksi",
        text: "Портал MATRIX онлайн. Quantum · Globe · Agent · Feed.",
        ts: Date.now() - 3600000,
        likes: 3,
        system: true,
      },
      {
        id: "seed-2",
        author: "System",
        handle: "system",
        text: "Лента и кабинет работают offline (localStorage). Backend подключается через AKSI_API.",
        ts: Date.now() - 7200000,
        likes: 1,
        system: true,
      },
    ];
  }

  function getFeed() {
    var f = load(FKEY, null);
    if (!f || !f.length) {
      f = seedFeed();
      save(FKEY, f);
    }
    return f;
  }

  function addPost(text) {
    text = String(text || "").trim().slice(0, 1000);
    if (!text) return null;
    var p = getProfile();
    var post = {
      id: uid(),
      author: p.name || "Гость",
      handle: p.handle || "guest",
      userId: p.id,
      text: text,
      ts: Date.now(),
      likes: 0,
      likedBy: [],
    };
    var f = getFeed();
    f.unshift(post);
    save(FKEY, f.slice(0, MAX_POSTS));
    return post;
  }

  function toggleLike(postId) {
    var p = getProfile();
    var f = getFeed();
    for (var i = 0; i < f.length; i++) {
      if (f[i].id === postId) {
        f[i].likedBy = f[i].likedBy || [];
        var idx = f[i].likedBy.indexOf(p.id);
        if (idx >= 0) {
          f[i].likedBy.splice(idx, 1);
          f[i].likes = Math.max(0, (f[i].likes || 1) - 1);
        } else {
          f[i].likedBy.push(p.id);
          f[i].likes = (f[i].likes || 0) + 1;
        }
        save(FKEY, f);
        return f[i];
      }
    }
    return null;
  }

  function getThreads() {
    return load(MKEY, {});
  }

  function listPeers() {
    var t = getThreads();
    return Object.keys(t).map(function (k) {
      var msgs = t[k] || [];
      var last = msgs[msgs.length - 1];
      return {
        peer: k,
        last: last ? last.text : "",
        ts: last ? last.ts : 0,
        count: msgs.length,
      };
    }).sort(function (a, b) {
      return b.ts - a.ts;
    });
  }

  function getMessages(peer) {
    var t = getThreads();
    return t[peer] || [];
  }

  function sendMessage(peer, text) {
    peer = String(peer || "aksi").slice(0, 32);
    text = String(text || "").trim().slice(0, 2000);
    if (!text) return null;
    var p = getProfile();
    var t = getThreads();
    if (!t[peer]) t[peer] = [];
    var msg = {
      id: uid(),
      from: p.id,
      fromName: p.name,
      to: peer,
      text: text,
      ts: Date.now(),
      me: true,
    };
    t[peer].push(msg);
    // auto-reply from aksi for demo
    if (peer === "aksi" || peer === "АКСИ") {
      t[peer].push({
        id: uid(),
        from: "aksi",
        fromName: "АКСИ",
        to: p.id,
        text: "Принято. Ответ агента — в основном чате портала (/#demo) или через backend API.",
        ts: Date.now() + 1,
        me: false,
      });
    }
    // trim
    var keys = Object.keys(t);
    for (var i = 0; i < keys.length; i++) {
      if (t[keys[i]].length > MAX_MSGS) t[keys[i]] = t[keys[i]].slice(-MAX_MSGS);
    }
    save(MKEY, t);
    return msg;
  }

  function ensureAksiThread() {
    var t = getThreads();
    if (!t.aksi || !t.aksi.length) {
      t.aksi = [
        {
          id: "welcome",
          from: "aksi",
          fromName: "АКСИ",
          text: "Личные сообщения offline. Напишите — сохраню в браузере.",
          ts: Date.now() - 1000,
          me: false,
        },
      ];
      save(MKEY, t);
    }
  }

  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  g.AksiCore = {
    getProfile: getProfile,
    setProfile: setProfile,
    getFeed: getFeed,
    addPost: addPost,
    toggleLike: toggleLike,
    listPeers: listPeers,
    getMessages: getMessages,
    sendMessage: sendMessage,
    ensureAksiThread: ensureAksiThread,
    fmtTime: fmtTime,
  };
})(typeof window !== "undefined" ? window : globalThis);
