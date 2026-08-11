/**
 * AKSI offline auth — registration / login in browser
 * Profiles in localStorage. Optional sync when backend is on.
 */
(function (g) {
  var KEY = "AKSI_AUTH_USERS";
  var SESS = "AKSI_AUTH_SESSION";
  var SEED = "Alfiya_AKSI_DIMAX_v3_2026";

  function sha(t) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)).then(function (b) {
      return Array.prototype.map
        .call(new Uint8Array(b), function (x) {
          return x.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveUsers(u) {
    localStorage.setItem(KEY, JSON.stringify(u));
  }

  function session() {
    try {
      return JSON.parse(localStorage.getItem(SESS) || "null");
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    if (!user) {
      localStorage.removeItem(SESS);
      return;
    }
    localStorage.setItem(
      SESS,
      JSON.stringify({
        handle: user.handle,
        name: user.name,
        did: user.did,
        at: new Date().toISOString(),
      })
    );
  }

  async function register(name, handle, password, email) {
    handle = String(handle || "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
    if (!handle || handle.length < 3) throw new Error("handle: минимум 3 символа (a-z0-9_)");
    if (!password || password.length < 6) throw new Error("пароль: минимум 6 символов");
    var users = loadUsers();
    if (users[handle]) throw new Error("handle уже занят в этом браузере");
    var passHash = await sha(password + "|" + handle + "|" + SEED);
    var didBody = await sha("did|" + handle + "|" + Date.now() + "|" + SEED);
    var user = {
      name: String(name || handle).slice(0, 48),
      handle: handle,
      email: String(email || "").slice(0, 80),
      passHash: passHash,
      did: "did:aksi:user:" + didBody.slice(0, 32),
      createdAt: new Date().toISOString(),
      projects: [],
    };
    users[handle] = user;
    saveUsers(users);
    setSession(user);
    // bridge to cabinet profile
    try {
      localStorage.setItem(
        "AKSI_PROFILE",
        JSON.stringify({
          id: handle,
          name: user.name,
          handle: handle,
          bio: "",
          did: user.did,
        })
      );
      localStorage.setItem("AKSI_GUEST_DID", user.did);
    } catch (e) {}
    return { handle: user.handle, name: user.name, did: user.did };
  }

  async function login(handle, password) {
    handle = String(handle || "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    var users = loadUsers();
    var user = users[handle];
    if (!user) throw new Error("пользователь не найден");
    var passHash = await sha(password + "|" + handle + "|" + SEED);
    if (passHash !== user.passHash) throw new Error("неверный пароль");
    setSession(user);
    try {
      localStorage.setItem(
        "AKSI_PROFILE",
        JSON.stringify({
          id: handle,
          name: user.name,
          handle: handle,
          bio: user.bio || "",
          did: user.did,
        })
      );
      localStorage.setItem("AKSI_GUEST_DID", user.did);
    } catch (e) {}
    return { handle: user.handle, name: user.name, did: user.did };
  }

  function logout() {
    setSession(null);
  }

  function addProject(meta) {
    var s = session();
    if (!s) throw new Error("нужен вход");
    var users = loadUsers();
    var u = users[s.handle];
    if (!u) throw new Error("сессия устарела");
    u.projects = u.projects || [];
    u.projects.unshift({
      id: "p_" + Date.now().toString(36),
      title: String(meta.title || "import").slice(0, 80),
      source: meta.source || "replit",
      url: meta.url || "",
      note: String(meta.note || "").slice(0, 500),
      files: meta.files || [],
      at: new Date().toISOString(),
    });
    if (u.projects.length > 40) u.projects = u.projects.slice(0, 40);
    users[s.handle] = u;
    saveUsers(users);
    return u.projects[0];
  }

  function listProjects() {
    var s = session();
    if (!s) return [];
    var users = loadUsers();
    return (users[s.handle] && users[s.handle].projects) || [];
  }

  g.AksiAuth = {
    register: register,
    login: login,
    logout: logout,
    session: session,
    addProject: addProject,
    listProjects: listProjects,
  };
})(typeof window !== "undefined" ? window : globalThis);
