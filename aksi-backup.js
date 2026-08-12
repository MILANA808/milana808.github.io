/* AKSI local backup helpers — no server */
window.AksiBackup = (function () {
  var KEYS = {
    net: "AKSI_NET_V1",
    dreams: "AKSI_DREAMS_V1",
    awake: "AKSI_AWAKE_V1",
    session: "AKSI_SESSION_V1",
    last: "AKSI_BACKUP_LAST",
    snap: "AKSI_BACKUP_SNAP"
  };

  function parse(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function collect() {
    return {
      version: 2,
      app: "AKSI",
      did: "did:aksi:ed25519:sovereign-2026",
      exported_at: new Date().toISOString(),
      net: parse(KEYS.net, []),
      dreams: parse(KEYS.dreams, []),
      awake: parse(KEYS.awake, null),
      session: parse(KEYS.session, null)
    };
  }

  function stats() {
    var c = collect();
    return {
      net: Array.isArray(c.net) ? c.net.length : 0,
      dreams: Array.isArray(c.dreams) ? c.dreams.length : 0,
      awake: !!c.awake,
      last: localStorage.getItem(KEYS.last) || null
    };
  }

  function download() {
    var data = collect();
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var a = document.createElement("a");
    var name = "aksi-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    localStorage.setItem(KEYS.last, data.exported_at);
    localStorage.setItem(KEYS.snap, json);
    return data;
  }

  function snapshot() {
    var data = collect();
    var json = JSON.stringify(data);
    localStorage.setItem(KEYS.snap, json);
    localStorage.setItem(KEYS.last, data.exported_at);
    return data;
  }

  function apply(data, mode) {
    if (!data || typeof data !== "object") throw new Error("Пустой бэкап");
    mode = mode || "replace";
    if (mode === "replace") {
      if (Array.isArray(data.net)) localStorage.setItem(KEYS.net, JSON.stringify(data.net));
      if (Array.isArray(data.dreams)) localStorage.setItem(KEYS.dreams, JSON.stringify(data.dreams));
    } else {
      // merge by id
      var net = parse(KEYS.net, []);
      var dreams = parse(KEYS.dreams, []);
      var ids = {};
      net.forEach(function (p) {
        if (p && p.id) ids[p.id] = 1;
      });
      (data.net || []).forEach(function (p) {
        if (p && p.id && !ids[p.id]) {
          net.unshift(p);
          ids[p.id] = 1;
        }
      });
      var dids = {};
      dreams.forEach(function (d) {
        if (d && d.id) dids[d.id] = 1;
      });
      (data.dreams || []).forEach(function (d) {
        if (d && d.id && !dids[d.id]) {
          dreams.unshift(d);
          dids[d.id] = 1;
        }
      });
      localStorage.setItem(KEYS.net, JSON.stringify(net));
      localStorage.setItem(KEYS.dreams, JSON.stringify(dreams));
    }
    if (data.awake) localStorage.setItem(KEYS.awake, JSON.stringify(data.awake));
    if (data.session) localStorage.setItem(KEYS.session, JSON.stringify(data.session));
    return stats();
  }

  function restoreSnap() {
    var raw = localStorage.getItem(KEYS.snap);
    if (!raw) throw new Error("Нет автоснимка");
    return apply(JSON.parse(raw), "replace");
  }

  return {
    KEYS: KEYS,
    collect: collect,
    stats: stats,
    download: download,
    snapshot: snapshot,
    apply: apply,
    restoreSnap: restoreSnap
  };
})();
