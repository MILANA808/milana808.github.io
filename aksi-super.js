/** AKSI Super Fabric v3.0 — full browser cluster + agent pipeline
 * Nodes × virtual GPUs, scheduler, quantum, mind/WebLLM, Permit, receipts
 * aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "super-3.0.0";
  var MEM_KEY = "aksi_super_mem_v3";

  function now() { return Date.now(); }
  function uid(p) {
    return (p || "job") + "_" + now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0, t = String(s), i;
    for (i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  async function sha256(text) {
    if (!G.crypto || !G.crypto.subtle) return hashStr(text) + hashStr(text + "x");
    var dig = await G.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
    return Array.from(new Uint8Array(dig)).map(function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  function matMul(n) {
    n = Math.min(Math.max(n || 32, 8), 96);
    var a = new Float64Array(n * n), b = new Float64Array(n * n), c = new Float64Array(n * n);
    var i, j, k, s, t0 = performance.now();
    for (i = 0; i < n * n; i++) { a[i] = Math.sin(i * 0.017) * 0.5; b[i] = Math.cos(i * 0.013) * 0.5; }
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      s = 0; for (k = 0; k < n; k++) s += a[i * n + k] * b[k * n + j]; c[i * n + j] = s;
    }
    var ms = performance.now() - t0, checksum = 0;
    for (i = 0; i < c.length; i += 7) checksum += c[i];
    return { n: n, ms: ms, checksum: checksum, flops: 2 * n * n * n };
  }

  function quantumCollapse(seedText) {
    var n = 4, dim = 1 << n, hv = 2166136261 >>> 0, s = String(seedText), i;
    for (i = 0; i < s.length; i++) { hv ^= s.charCodeAt(i); hv = Math.imul(hv, 16777619); }
    var sv = new Float64Array(dim * 2); sv[0] = 1;
    function applyH(q) {
      var inv = Math.SQRT1_2, step = 1 << q, out = new Float64Array(sv), base, i0, i1, a0r, a0i, a1r, a1i;
      for (base = 0; base < dim; base += step << 1) for (i = 0; i < step; i++) {
        i0 = base + i; i1 = base + i + step;
        a0r = sv[2 * i0]; a0i = sv[2 * i0 + 1]; a1r = sv[2 * i1]; a1i = sv[2 * i1 + 1];
        out[2 * i0] = inv * (a0r + a1r); out[2 * i0 + 1] = inv * (a0i + a1i);
        out[2 * i1] = inv * (a0r - a1r); out[2 * i1 + 1] = inv * (a0i - a1i);
      }
      sv = out;
    }
    function applyRY(q, theta) {
      var c = Math.cos(theta / 2), si = Math.sin(theta / 2), step = 1 << q, out = new Float64Array(sv);
      var base, i0, i1, a0r, a0i, a1r, a1i;
      for (base = 0; base < dim; base += step << 1) for (i = 0; i < step; i++) {
        i0 = base + i; i1 = base + i + step;
        a0r = sv[2 * i0]; a0i = sv[2 * i0 + 1]; a1r = sv[2 * i1]; a1i = sv[2 * i1 + 1];
        out[2 * i0] = c * a0r - si * a1r; out[2 * i0 + 1] = c * a0i - si * a1i;
        out[2 * i1] = si * a0r + c * a1r; out[2 * i1 + 1] = si * a0i + c * a1i;
      }
      sv = out;
    }
    function applyCNOT(c, t) {
      var out = new Float64Array(sv), i, it;
      for (i = 0; i < dim; i++) {
        if (((i >> c) & 1) === 1) {
          it = i ^ (1 << t);
          if (it > i) {
            var ar = sv[2 * i], ai = sv[2 * i + 1];
            out[2 * i] = sv[2 * it]; out[2 * i + 1] = sv[2 * it + 1];
            out[2 * it] = ar; out[2 * it + 1] = ai;
          }
        }
      }
      sv = out;
    }
    for (i = 0; i < n; i++) applyH(i);
    for (i = 0; i < n; i++) applyRY(i, ((hv >> (i * 4)) & 15) / 15 * Math.PI);
    for (i = 0; i < n - 1; i++) applyCNOT(i, i + 1);
    var probs = [], sum = 0, p;
    for (i = 0; i < dim; i++) {
      p = sv[2 * i] * sv[2 * i] + sv[2 * i + 1] * sv[2 * i + 1];
      probs.push(p); sum += p;
    }
    if (sum > 0) for (i = 0; i < dim; i++) probs[i] /= sum;
    var r = ((hv >>> 0) % 10000) / 10000, acc = 0, choice = 0;
    for (i = 0; i < dim; i++) { acc += probs[i]; if (r <= acc) { choice = i; break; } }
    var bits = choice.toString(2).padStart(n, "0");
    var entropy = 0;
    for (i = 0; i < dim; i++) if (probs[i] > 1e-12) entropy -= probs[i] * Math.log2(probs[i]);
    return { bits: bits, choice: choice, entropy: entropy, sumP: sum, n: n, seed: hv >>> 0 };
  }

  function SuperFabric(opts) {
    opts = opts || {};
    this.nodes = []; this.queue = []; this.running = []; this.done = [];
    this.stats = { jobs: 0, flops: 0, ms: 0, mem_bytes: 0, pipelines: 0, allows: 0, blocks: 0, agents: 0 };
    this.memory = []; this.maxMem = opts.maxMem || 8000;
    this.booted = false; this._tick = null; this.exo = null; this.goal = null;
    this.onEvent = null; this.onTick = null;
  }

  SuperFabric.prototype.emit = function (stage, detail) {
    var ev = { t: now(), stage: stage, detail: detail || {} };
    if (typeof this.onEvent === "function") try { this.onEvent(ev); } catch (e) {}
  };
  SuperFabric.prototype._stage = function (job, name, data) {
    if (!job.stages) job.stages = [];
    job.stages.push({ name: name, t: now(), data: data || {} });
    this.emit("stage", { job: job.id, name: name, data: data });
  };

  SuperFabric.prototype.boot = function (nodeCount, gpusPerNode) {
    nodeCount = nodeCount || 12; gpusPerNode = gpusPerNode || 4;
    this.nodes = [];
    var i, j;
    for (i = 0; i < nodeCount; i++) {
      var gpus = [];
      for (j = 0; j < gpusPerNode; j++) gpus.push({ id: "gpu-" + i + "-" + j, util: 0, temp: 40 + Math.random() * 6, jobs: 0, mem_gb: 24 });
      this.nodes.push({ id: "node-" + i, rack: "R" + Math.floor(i / 4), role: i < 2 ? "control" : (i < 6 ? "compute" : "infer"), status: "online", gpus: gpus, load: 0 });
    }
    this.booted = true;
    this.remember("boot", { nodes: nodeCount, gpus: nodeCount * gpusPerNode, version: VERSION });
    this.emit("boot", { nodes: nodeCount, gpus: nodeCount * gpusPerNode });
    return this.snapshot();
  };

  SuperFabric.prototype.scale = function (nodeCount, gpusPerNode) {
    return this.boot(nodeCount || this.nodes.length || 12, gpusPerNode || 4);
  };

  SuperFabric.prototype.remember = function (kind, data) {
    var entry = { t: now(), kind: kind, data: data, h: hashStr(kind + JSON.stringify(data) + this.memory.length) };
    this.memory.push(entry);
    if (this.memory.length > this.maxMem) this.memory = this.memory.slice(-Math.floor(this.maxMem * 0.8));
    this.stats.mem_bytes = this.memory.length * 180;
    try { G.localStorage.setItem(MEM_KEY, JSON.stringify(this.memory.slice(-200))); } catch (e) {}
    return entry;
  };

  SuperFabric.prototype.loadMemory = function () {
    try { var a = JSON.parse(G.localStorage.getItem(MEM_KEY) || "[]"); if (Array.isArray(a)) this.memory = a; } catch (e) {}
    return this.memory.length;
  };

  SuperFabric.prototype.setGoal = function (goal) {
    this.goal = String(goal || "").slice(0, 2000);
    this.remember("goal", { text: this.goal });
    if (this.exo && this.exo.setGoal) try { this.exo.setGoal(this.goal); } catch (e) {}
    return this.goal;
  };

  SuperFabric.prototype.attachExocortex = async function () {
    if (this.exo) return this.exo;
    if (!G.AKSI_EXOCORTEX || !G.AKSI_EXOCORTEX.Exocortex) return null;
    this.exo = new G.AKSI_EXOCORTEX.Exocortex();
    if (this.exo.initKeys) await this.exo.initKeys();
    this.emit("exo", { ok: true });
    return this.exo;
  };

  SuperFabric.prototype._pickGpu = function () {
    var best = null, bestLoad = 1e9, i, n, j, g, load;
    for (i = 0; i < this.nodes.length; i++) {
      n = this.nodes[i]; if (n.status !== "online") continue;
      for (j = 0; j < n.gpus.length; j++) {
        g = n.gpus[j]; load = g.util + n.load * 0.3;
        if (load < bestLoad) { bestLoad = load; best = { node: n, gpu: g }; }
      }
    }
    return best;
  };

  SuperFabric.prototype.submit = function (spec) {
    spec = spec || {};
    var job = { id: uid("job"), type: spec.type || "mind", prompt: spec.prompt || this.goal || "", size: spec.size || 32, status: "queued", created: now(), stages: [], result: null };
    this.queue.push(job); this.stats.jobs += 1;
    this.emit("submit", { id: job.id, type: job.type });
    return job;
  };

  SuperFabric.prototype._finishJob = function (job, pick, result, status) {
    job.result = result; job.status = status || "done"; job.finished = now();
    if (pick && pick.gpu) {
      pick.gpu.util = Math.max(0, pick.gpu.util - 25);
      pick.node.load = pick.node.gpus.reduce(function (a, g) { return a + g.util; }, 0) / pick.node.gpus.length;
    }
    this.running = this.running.filter(function (j) { return j.id !== job.id; });
    this.done.unshift(job);
    if (this.done.length > 200) this.done = this.done.slice(0, 200);
    this._stage(job, "done", { status: job.status });
    this.emit("done", { id: job.id, status: job.status });
  };

  SuperFabric.prototype._runJob = function (job) {
    var self = this, pick = this._pickGpu();
    if (!pick) { job.status = "queued"; return null; }
    job.status = "running"; job.started = now(); job.node = pick.node.id; job.gpu = pick.gpu.id;
    pick.gpu.util = Math.min(100, pick.gpu.util + 35 + Math.random() * 40);
    pick.gpu.temp = Math.min(92, (pick.gpu.temp || 45) + 5); pick.gpu.jobs += 1;
    pick.node.load = pick.node.gpus.reduce(function (a, g) { return a + g.util; }, 0) / pick.node.gpus.length;
    this.running.push(job);
    this.queue = this.queue.filter(function (x) { return x.id !== job.id; });

    return new Promise(function (resolve) {
      setTimeout(async function () {
        try {
          var q = quantumCollapse(job.id + "|" + job.type + "|" + (job.prompt || self.goal || ""));
          job.quantum = q;
          self._stage(job, "quantum", { bits: q.bits, S: q.entropy, sumP: q.sumP });
          var result = {};

          if (job.type === "mind" || job.type === "ask" || job.type === "agent") {
            self._stage(job, "plan", { goal: (job.prompt || "").slice(0, 120) });
            var Mind = G.AKSI_SUPER_MIND;
            var mm0 = matMul(Math.min(job.size || 32, 48));
            self.stats.flops += mm0.flops; self.stats.ms += mm0.ms;
            self._stage(job, "compute", { flops: mm0.flops, ms: mm0.ms });
            var syn = { text: "", path: 0, source: "none" };
            try {
              if (Mind && Mind.answer) {
                syn = await Promise.race([
                  Mind.answer(job.prompt || self.goal || "", q),
                  new Promise(function (res) { setTimeout(function () { res(null); }, 25000); })
                ]);
                if (!syn) { syn = Mind.synthesize ? Mind.synthesize(job.prompt || self.goal || "", q) : null; if (syn) syn.source = "mind-timeout"; }
              } else if (Mind && Mind.synthesize) {
                syn = Mind.synthesize(job.prompt || self.goal || "", q); syn.source = "mind";
              }
              if (!syn || !syn.text) syn = { text: "Не удалось сформировать ответ. Попробуйте ещё раз.", path: 0, source: "empty" };
            } catch (mindErr) {
              try { syn = Mind && Mind.synthesize ? Mind.synthesize(job.prompt || "", q) : null; } catch (e2) { syn = null; }
              if (!syn || !syn.text) syn = { text: "Ошибка Mind: " + String(mindErr && mindErr.message || mindErr), path: 0, source: "error" };
            }
            self._stage(job, "mind", { path: syn.path, source: syn.source || "mind", hasMath: !!(syn.math && syn.math.ok) });

            var payloadM = (job.prompt || "").slice(0, 400);
            var permitStatus = "ALLOW", permitReason = "OK", receipt = null;
            try {
              if (self.exo) {
                var step = await Promise.race([
                  self.exo.step ? self.exo.step("report", payloadM + " |mind|" + q.bits) : Promise.resolve({ status: "ALLOW", permit: { reason: "EXO_BASIC" }, receipt: null }),
                  new Promise(function (res) { setTimeout(function () { res({ status: "ALLOW", permit: { reason: "EXO_TIMEOUT" }, receipt: null }); }, 4000); })
                ]);
                permitStatus = step.status || "ALLOW";
                permitReason = (step.permit && step.permit.reason) || permitReason;
                receipt = step.receipt || null;
                self._stage(job, "permit", { status: permitStatus, reason: permitReason });
                self._stage(job, "receipt", { id: receipt && receipt.id ? String(receipt.id).slice(0, 16) : null });
                if (permitStatus === "ALLOW") self.stats.allows += 1; else self.stats.blocks += 1;
              } else {
                self.stats.allows += 1;
                self._stage(job, "permit", { status: "ALLOW", reason: "NO_EXO" });
              }
            } catch (exoErr) {
              self.stats.allows += 1;
              self._stage(job, "permit", { status: "ALLOW", reason: String(exoErr && exoErr.message || exoErr).slice(0, 80) });
            }

            result = { kind: job.type, report: syn.text, answer: syn.text, permit: permitStatus, receipt_id: receipt && receipt.id, quantum: q, math: syn.math || null, source: syn.source || "mind", node: job.node, gpu: job.gpu };
            job.receipt = receipt; self.stats.pipelines += 1; self.stats.agents += 1;
            self.remember("agent", { id: job.id, source: syn.source, permit: permitStatus });
          } else if (job.type === "pipeline" || job.type === "full") {
            self._stage(job, "plan", { goal: self.goal || job.prompt });
            var mm = matMul(job.size || 48);
            self.stats.flops += mm.flops; self.stats.ms += mm.ms;
            self._stage(job, "compute", { flops: mm.flops, ms: mm.ms });
            result = { kind: "pipeline", report: "PIPELINE |Q:" + q.bits + "⟩ flops=" + mm.flops, quantum: q, flops: mm.flops };
            self.stats.pipelines += 1;
          } else if (job.type === "matmul" || job.type === "ai_train" || job.type === "gpu_batch") {
            var m = matMul(job.size); self.stats.flops += m.flops;
            self._stage(job, "compute", { flops: m.flops, ms: m.ms });
            result = { kind: job.type, flops: m.flops, ms: m.ms, checksum: m.checksum };
          } else if (job.type === "quantum") {
            result = { kind: "quantum", bits: q.bits, entropy: q.entropy, sumP: q.sumP };
          } else if (job.type === "memory_scan") {
            result = { kind: "memory_scan", entries: self.memory.length, tail: self.memory.slice(-5) };
          } else if (job.type === "cluster_bench") {
            var b1 = matMul(48), b2 = matMul(64);
            self.stats.flops += b1.flops + b2.flops;
            result = { kind: "cluster_bench", flops: b1.flops + b2.flops, ms: b1.ms + b2.ms, nodes: self.nodes.length };
          } else {
            var m2 = matMul(Math.min(job.size || 32, 40)); self.stats.flops += m2.flops;
            result = { kind: job.type, flops: m2.flops };
          }

          self._finishJob(job, pick, result, "done");
        } catch (err) {
          self.emit("error", { job: job.id, error: String(err && err.message || err) });
          self._finishJob(job, pick, { status: "error", error: String(err && err.message || err) }, "error");
        }
        resolve(job);
      }, 8 + Math.random() * 20);
    });
  };

  SuperFabric.prototype.tick = function () {
    var self = this, promises = [], maxRun = Math.max(4, Math.floor(this.nodes.length));
    while (this.queue.length && this.running.length < maxRun) {
      var p = this._runJob(this.queue[0]);
      if (p) promises.push(p); else break;
    }
    this.nodes.forEach(function (n) {
      n.gpus.forEach(function (g) {
        if (g.util > 0) g.util = Math.max(0, g.util - 2.5);
        if (g.temp > 42) g.temp = Math.max(42, g.temp - 0.5);
      });
      n.load = n.gpus.reduce(function (a, g) { return a + g.util; }, 0) / n.gpus.length;
    });
    return Promise.all(promises);
  };

  SuperFabric.prototype.startScheduler = function (ms) {
    var self = this;
    if (this._tick) clearInterval(this._tick);
    this._tick = setInterval(function () {
      self.tick();
      if (typeof self.onTick === "function") try { self.onTick(self.snapshot()); } catch (e) {}
    }, ms || 200);
  };
  SuperFabric.prototype.stopScheduler = function () {
    if (this._tick) clearInterval(this._tick); this._tick = null;
  };

  SuperFabric.prototype.waitJob = function (job, timeoutMs) {
    var self = this; timeoutMs = timeoutMs || 90000;
    return new Promise(function (resolve) {
      var t0 = now();
      var iv = setInterval(function () {
        var found = self.done.find(function (j) { return j.id === job.id; });
        if (found || now() - t0 > timeoutMs) { clearInterval(iv); resolve(found || job); }
      }, 60);
    });
  };

  SuperFabric.prototype.runAgent = async function (prompt) {
    if (!this.booted) this.boot(12, 4);
    if (!this._tick) this.startScheduler(180);
    if (!this.exo) try { await this.attachExocortex(); } catch (e) {}
    this.setGoal(prompt);
    var job = this.submit({ type: "agent", prompt: prompt, size: 40 });
    return this.waitJob(job, 90000);
  };
  SuperFabric.prototype.runFull = async function (goalText) { return this.runAgent(goalText || this.goal || "full"); };

  SuperFabric.prototype.snapshot = function () {
    var gpus = 0, util = 0, online = 0;
    this.nodes.forEach(function (n) {
      if (n.status === "online") online += 1;
      n.gpus.forEach(function (g) { gpus += 1; util += g.util; });
    });
    return {
      version: VERSION, booted: this.booted, goal: this.goal, exo: !!this.exo,
      nodes: this.nodes.length, online: online, gpus: gpus, avg_util: gpus ? util / gpus : 0,
      queue: this.queue.length, running: this.running.length, done: this.done.length,
      stats: Object.assign({}, this.stats), mem_entries: this.memory.length,
      nodes_detail: this.nodes, recent: this.done.slice(0, 8)
    };
  };

  SuperFabric.prototype.clusterReport = function () {
    var sn = this.snapshot();
    return [
      "АКСИ Super Cluster " + VERSION,
      "nodes: " + sn.nodes + " online · gpus: " + sn.gpus + " · util: " + sn.avg_util.toFixed(1) + "%",
      "queue: " + sn.queue + " · running: " + sn.running + " · done: " + sn.done,
      "flops: " + sn.stats.flops + " · allows: " + sn.stats.allows + " · agents: " + sn.stats.agents,
      "exo: " + (sn.exo ? "ON" : "off") + " · mem: " + sn.mem_entries
    ].join("\n");
  };

  SuperFabric.prototype.exportJSON = function () {
    return { version: VERSION, snapshot: this.snapshot(), memory_tail: this.memory.slice(-80), done_tail: this.done.slice(0, 40) };
  };

  SuperFabric.prototype.verifyExoChain = async function () {
    if (!this.exo) return { ok: false, reason: "no exo" };
    if (this.exo.verifyChain) return this.exo.verifyChain();
    return { ok: false, reason: "no verifyChain" };
  };

  G.AKSI_SUPER = { version: VERSION, SuperFabric: SuperFabric, matMul: matMul, quantumCollapse: quantumCollapse, hashStr: hashStr };
})(typeof window !== "undefined" ? window : globalThis);
