/**
 * AKSI Self-GitHub — browser-only commits to milana808.github.io
 * Token in sessionStorage only. Allowlist paths.
 */
(function (G) {
  "use strict";
  var VER = "1.0";
  var OWNER = "MILANA808";
  var REPO = "milana808.github.io";
  var BRANCH = "main";
  var TOKEN_KEY = "aksi_gh_pat_v1";
  var ALLOW = {
    "data/self-taught.json": true,
    "seed/self-taught.json": true,
    "aksi-self-log.json": true
  };
  function token() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setToken(t) {
    t = String(t || "").trim();
    if (!t) { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} return false; }
    try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) { return false; }
    return true;
  }
  function clearToken() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function allowed(path) {
    path = String(path || "").replace(/^\//, "");
    return !!ALLOW[path];
  }
  function api(path, opts) {
    opts = opts || {};
    var t = token();
    if (!t) return Promise.reject(new Error("Нет GitHub token. Вставьте PAT (repo) в Autopilot."));
    var headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + t,
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch("https://api.github.com" + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && j.message) || r.statusText || String(r.status));
        return j;
      });
    });
  }
  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(b64) { return decodeURIComponent(escape(atob(b64))); }
  async function getFile(path) {
    path = String(path).replace(/^\//, "");
    if (!allowed(path)) throw new Error("Файл вне allowlist: " + path);
    var j = await api("/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + BRANCH);
    return {
      path: path,
      sha: j.sha,
      content: j.content ? b64decode(j.content.replace(/\n/g, "")) : "",
      html_url: j.html_url
    };
  }
  async function putFile(path, content, message, sha) {
    path = String(path).replace(/^\//, "");
    if (!allowed(path)) throw new Error("Файл вне allowlist: " + path);
    if (!message) message = "AKSI Self: update " + path;
    var body = { message: message, content: b64encode(content), branch: BRANCH };
    if (sha) body.sha = sha;
    var j = await api("/repos/" + OWNER + "/" + REPO + "/contents/" + path, { method: "PUT", body: body });
    return {
      path: path,
      commit: j.commit && j.commit.sha,
      html_url: j.commit && j.commit.html_url,
      content_url: j.content && j.content.html_url
    };
  }
  async function teachToGitHub(fact, meta) {
    fact = String(fact || "").trim();
    if (!fact) throw new Error("Пустой факт");
    if (fact.length > 2000) throw new Error("Слишком длинный факт (max 2000)");
    var path = "data/self-taught.json";
    var file;
    try {
      file = await getFile(path);
    } catch (e) {
      await putFile(path, JSON.stringify({ version: 1, updated: null, items: [] }, null, 2), "AKSI Self: init self-taught");
      file = await getFile(path);
    }
    var data;
    try { data = JSON.parse(file.content); } catch (e) { data = { version: 1, items: [] }; }
    if (!Array.isArray(data.items)) data.items = [];
    data.items.push({ t: Date.now(), text: fact, meta: meta || {}, source: "autopilot-web" });
    if (data.items.length > 500) data.items = data.items.slice(-500);
    data.updated = new Date().toISOString();
    data.version = 1;
    var content = JSON.stringify(data, null, 2);
    var msg = "AKSI Self: teach «" + fact.slice(0, 60).replace(/\n/g, " ") + "»";
    return putFile(path, content, msg, file.sha);
  }
  async function whoami() { return api("/user"); }
  G.AKSI_SELF_GITHUB = {
    VERSION: VER, OWNER: OWNER, REPO: REPO, ALLOW: ALLOW,
    token: token, setToken: setToken, clearToken: clearToken, allowed: allowed,
    getFile: getFile, putFile: putFile, teachToGitHub: teachToGitHub, whoami: whoami
  };
})(typeof window !== "undefined" ? window : globalThis);
