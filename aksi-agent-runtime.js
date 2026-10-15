/**
 * AKSI Bot Runtime Bridge v2 — uses the canonical unified gateway when available.
 * Task creation is not replayed across hosts after an ambiguous POST.
 */
(function (G) {
  "use strict";
  if (G.AKSI_AGENT_RUNTIME) return;
  var API = String((G.AKSI_UNIFIED && G.AKSI_UNIFIED.base()) || G.AKSI_API_BASE || (typeof localStorage !== "undefined" && (localStorage.getItem("AKSI_API") || localStorage.getItem("aksi_api"))) || "").replace(/\/$/, "");
  var TERMINAL = { COMPLETED:1, FAILED:1, STOPPED:1, NEEDS_PERMISSION:1, RECOVERABLE:1 };
  function setApi(url) {
    var next = String(url || "").trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(next)) throw new Error("API URL must use http(s)");
    API = G.AKSI_UNIFIED ? G.AKSI_UNIFIED.setBase(next) : next;
    try { localStorage.setItem("AKSI_API", API); } catch (_) {}
    return API;
  }
  async function health() {
    if (G.AKSI_UNIFIED) {
      var result = await G.AKSI_UNIFIED.health();
      return { ok: result.alive, ready: result.ready, api: result.api, data: result };
    }
    if (!API) return { ok:false, ready:false, api:"", error:"AKSI автономен: backend не настроен." };
    try {
      var r = await fetch(API + "/health", { signal: AbortSignal.timeout(8000) });
      return { ok: r.ok, api: API, data: await r.json() };
    } catch (e) { return { ok:false, api:API, error:String(e.message || e) }; }
  }
  async function run(goal, opts) {
    opts = opts || {}; goal = String(goal || "").trim();
    if (!goal) throw new Error("Пустая задача");
    var permissions = Object.assign({internet:true,read_pages:true,browser_actions:false,downloads:false,memory:true,external_actions:false}, opts.permissions || {});
    if (G.AKSI_UNIFIED) {
      var result = await G.AKSI_UNIFIED.runTask(goal, {
        permissions: permissions, max_sources: opts.max_sources || 10,
        timeoutMs: opts.timeout_ms || 120000, pollMs: opts.poll_ms || 1800,
        onProgress: opts.onProgress
      });
      return result;
    }
    if (!API) throw new Error("AKSI автономен: backend не настроен. Задача остаётся локальной.");
    var r = await fetch(API + "/api/agent/tasks", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({goal:goal,permissions:permissions,max_sources:opts.max_sources||10}),
      signal:AbortSignal.timeout(12000)
    });
    if (!r.ok) throw new Error("agent create HTTP " + r.status);
    var created = await r.json(), id = (created.task || {}).id;
    if (!id) throw new Error("backend did not return task id");
    var deadline = Date.now() + (opts.timeout_ms || 120000), last = created.task || {};
    while (Date.now() < deadline) {
      if (TERMINAL[last.status]) break;
      await new Promise(function (resolve) { setTimeout(resolve, opts.poll_ms || 1800); });
      var p = await fetch(API + "/api/agent/tasks/" + encodeURIComponent(id), {signal:AbortSignal.timeout(10000)});
      if (!p.ok) throw new Error("agent poll HTTP " + p.status);
      var data = await p.json(); last = data.task || last;
      if (typeof opts.onProgress === "function") { try { opts.onProgress(last); } catch (_) {} }
    }
    return {id:id,status:last.status,report:last.report||null,receipt:last.receipt||null,verification:last.verification||null,sources:last.sources||[],journal:last.journal||[],timed_out:!TERMINAL[last.status]};
  }
  G.AKSI_AGENT_RUNTIME = {version:"2.0.0",get api(){return G.AKSI_UNIFIED?G.AKSI_UNIFIED.base():API;},setApi:setApi,health:health,run:run};
})(typeof window !== "undefined" ? window : globalThis);
