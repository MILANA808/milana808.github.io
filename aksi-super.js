/**
 * AKSI Supercomputer Simulator v1.0
 * Virtual fabric: nodes, GPUs, job queue, memory ledger, quantum seed.
 * Honest: runs in browser. Not physical FLOPS of world supercomputers.
 */
(function (G) {
  "use strict";
  var VERSION = "super-1.0.0";
  var MEM_KEY = "aksi_super_mem_v1";

  function now() { return Date.now(); }
  function uid() {
    return "job_" + now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0, t = String(s), i;
    for (i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function matMul(n) {
    n = Math.min(Math.max(n || 32, 8), 96);
    var a = new Float64Array(n * n), b = new Float64Array(n * n), c = new Float64Array(n * n);
    var i, j, k, s, t0 = performance.now();
    for (i = 0; i < n * n; i++) {
      a[i] = Math.sin(i * 0.017) * 0.5;
      b[i] = Math.cos(i * 0.013) * 0.5;
    }
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        s = 0;
        for (k = 0; k < n; k++) s += a[i * n + k] * b[k * n + j];
        c[i * n + j] = s;
      }
    }
    var ms = performance.now() - t0;
    var checksum = 0;
    for (i = 0; i < c.length; i += 7) checksum += c[i];
    return { n: n, ms: ms, checksum: checksum, flops: 2 * n * n * n };
  }

  function quantumSeed(text) {
    var n = 4, dim = 1 << n;
    var hv = 2166136261 >>> 0, s = String(text), i;
    for (i = 0; i < s.length; i++) {
      hv ^= s.charCodeAt(i);
      hv = Math.imul(hv, 16777619);
    }
    var sv = new Float64Array(dim * 2);
    sv[0] = 1;
    function h(q) {
      var inv = Math.SQRT1_2, step = 1 << q, out = new Float64Array(sv);
      var base, i0, i1, a0r, a0i, a1r, a1i;
      for (base = 0; base < dim; base += step << 1) {
        for (i = 0; i < step; i++) {
          i0 = base + i; i1 = base + i + step;
          a0r = sv[2 * i0]; a0i = sv[2 * i0 + 1];
          a1r = sv[2 * i1]; a1i = sv[2 * i1 + 1];
          out[2 * i0] = inv * (a0r + a1r); out[2 * i0 + 1] = inv * (a0i + a1i);
          out[2 * i1] = inv * (a0r - a1r); out[2 * i1 + 1] = inv * (a0i - a1i);
        }
      }
      sv = out;
    }
    for (i = 0; i < n; i++) h(i);
    var p = new Float64Array(dim), sum = 0, e = 0;
    for (i = 0; i < dim; i++) {
      p[i] = sv[2 * i] * sv[2 * i] + sv[2 * i + 1] * sv[2 * i + 1];
      sum += p[i];
    }
    for (i = 0; i < dim; i++) if (p[i] > 1e-15) e -= p[i] * Math.log(p[i]) / Math.LN2;
    var r = Math.random(), acc = 0, idx = dim - 1;
    for (i = 0; i < dim; i++) {
      acc += p[i];
      if (r <= acc) { idx = i; break; }
    }
    return {
      bits: ("0000" + idx.toString(2)).slice(-4),
      entropy: e,
      sumP: sum,
      seed: hv >>> 0
    };
  }

  function SuperFabric(opts) {
    opts = opts || {};
    this.nodes = [];
    this.queue = [];
    this.running = [];
    this.done = [];
    this.stats = { jobs: 0, flops: 0, ms: 0, mem_bytes: 0 };
    this.memory = [];
    this.maxMem = opts.maxMem || 5000;
    this.booted = false;
    this._tick = null;
  }

  SuperFabric.prototype.boot = function (nodeCount, gpusPerNode) {
    nodeCount = nodeCount || 8;
    gpusPerNode = gpusPerNode || 4;
    this.nodes = [];
    var i, j;
    for (i = 0; i < nodeCount; i++) {
      var gpus = [];
      for (j = 0; j < gpusPerNode; j++) {
        gpus.push({
          id: "gpu-" + i + "-" + j,
          util: 0,
          temp: 42 + Math.random() * 8,
          mem: 0,
          jobs: 0
        });
      }
      this.nodes.push({
        id: "node-" + i,
        rack: "R" + Math.floor(i / 4),
        status: "online",
        gpus: gpus,
        load: 0
      });
    }
    this.booted = true;
    this.remember("boot", {
      nodes: nodeCount,
      gpus: nodeCount * gpusPerNode,
      note: "virtual fabric online"
    });
    return this.snapshot();
  };

  SuperFabric.prototype.remember = function (kind, data) {
    var entry = {
      t: now(),
      kind: kind,
      data: data,
      h: hashStr(kind + JSON.stringify(data) + this.memory.length)
    };
    this.memory.push(entry);
    if (this.memory.length > this.maxMem) {
      this.memory = this.memory.slice(-Math.floor(this.maxMem * 0.8));
    }
    this.stats.mem_bytes = this.memory.length * 180;
    try {
      var slim = this.memory.slice(-200);
      localStorage.setItem(MEM_KEY, JSON.stringify(slim));
    } catch (e) {}
    return entry;
  };

  SuperFabric.prototype.loadMemory = function () {
    try {
      var raw = localStorage.getItem(MEM_KEY);
      if (raw) this.memory = JSON.parse(raw) || [];
    } catch (e) {
      this.memory = [];
    }
    this.stats.mem_bytes = this.memory.length * 180;
  };

  SuperFabric.prototype.submit = function (job) {
    job = job || {};
    var j = {
      id: uid(),
      type: job.type || "matmul",
      size: job.size || 48,
      prompt: job.prompt || "",
      status: "queued",
      node: null,
      gpu: null,
      created: now(),
      started: null,
      finished: null,
      result: null,
      quantum: null
    };
    this.queue.push(j);
    this.remember("submit", { id: j.id, type: j.type, size: j.size });
    return j;
  };

  SuperFabric.prototype._pickGpu = function () {
    var best = null, i, j, g, score;
    for (i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].status !== "online") continue;
      for (j = 0; j < this.nodes[i].gpus.length; j++) {
        g = this.nodes[i].gpus[j];
        score = g.util + g.jobs * 0.1;
        if (!best || score < best.score) {
          best = { score: score, node: this.nodes[i], gpu: g };
        }
      }
    }
    return best;
  };

  SuperFabric.prototype._runJob = function (job) {
    var self = this;
    var pick = this._pickGpu();
    if (!pick) {
      job.status = "queued";
      return null;
    }
    job.status = "running";
    job.started = now();
    job.node = pick.node.id;
    job.gpu = pick.gpu.id;
    pick.gpu.util = Math.min(100, pick.gpu.util + 35 + Math.random() * 40);
    pick.gpu.temp = Math.min(92, pick.gpu.temp + 5 + Math.random() * 10);
    pick.gpu.jobs += 1;
    pick.node.load = pick.node.gpus.reduce(function (a, g) { return a + g.util; }, 0) / pick.node.gpus.length;
    this.running.push(job);
    this.queue = this.queue.filter(function (x) { return x.id !== job.id; });

    return new Promise(function (resolve) {
      setTimeout(function () {
        var q = quantumSeed(job.id + "|" + job.type + "|" + (job.prompt || ""));
        var result = {};
        if (job.type === "matmul" || job.type === "ai_train" || job.type === "gpu_batch") {
          var mm = matMul(job.size);
          result = {
            kind: "matmul",
            n: mm.n,
            ms: mm.ms,
            flops: mm.flops,
            checksum: mm.checksum,
            note: job.type === "ai_train" ? "virtual backprop slice" : "dense GEMM on virtual GPU"
          };
          self.stats.flops += mm.flops;
          self.stats.ms += mm.ms;
        } else if (job.type === "quantum") {
          result = {
            kind: "quantum",
            bits: q.bits,
            entropy: q.entropy,
            sumP: q.sumP,
            note: "4-qubit statevector collapse"
          };
        } else if (job.type === "memory_scan") {
          result = {
            kind: "memory_scan",
            entries: self.memory.length,
            last_h: self.memory.length ? self.memory[self.memory.length - 1].h : null,
            note: "ledger scan"
          };
        } else if (job.type === "exocortex_link") {
          result = {
            kind: "exocortex_link",
            url: "/exocortex/",
            note: "payload prepared for Exocortex Permit/receipt path",
            payload: (job.prompt || "super job " + job.id).slice(0, 200)
          };
        } else {
          var mm2 = matMul(Math.min(job.size, 40));
          result = { kind: job.type, ms: mm2.ms, flops: mm2.flops, checksum: mm2.checksum };
          self.stats.flops += mm2.flops;
          self.stats.ms += mm2.ms;
        }
        job.quantum = q;
        job.result = result;
        job.status = "done";
        job.finished = now();
        pick.gpu.util = Math.max(0, pick.gpu.util - 25);
        pick.gpu.temp = Math.max(40, pick.gpu.temp - 3);
        pick.node.load = pick.node.gpus.reduce(function (a, g) { return a + g.util; }, 0) / pick.node.gpus.length;
        self.running = self.running.filter(function (x) { return x.id !== job.id; });
        self.done.unshift(job);
        if (self.done.length > 100) self.done = self.done.slice(0, 100);
        self.stats.jobs += 1;
        self.remember("done", {
          id: job.id,
          type: job.type,
          node: job.node,
          gpu: job.gpu,
          quantum: q.bits,
          flops: result.flops || 0
        });
        resolve(job);
      }, 80 + Math.random() * 220);
    });
  };

  SuperFabric.prototype.tick = function () {
    var self = this;
    var promises = [];
    while (this.queue.length && this.running.length < Math.max(2, Math.floor(this.nodes.length / 2))) {
      var job = this.queue[0];
      var p = this._runJob(job);
      if (p) promises.push(p);
      else break;
    }
    this.nodes.forEach(function (n) {
      n.gpus.forEach(function (g) {
        if (g.util > 0) g.util = Math.max(0, g.util - 2);
        if (g.temp > 42) g.temp = Math.max(42, g.temp - 0.4);
      });
      n.load = n.gpus.reduce(function (a, g) { return a + g.util; }, 0) / n.gpus.length;
    });
    return Promise.all(promises);
  };

  SuperFabric.prototype.startScheduler = function (intervalMs) {
    var self = this;
    if (this._tick) clearInterval(this._tick);
    this._tick = setInterval(function () {
      self.tick();
      if (typeof self.onTick === "function") {
        try { self.onTick(self.snapshot()); } catch (e) {}
      }
    }, intervalMs || 400);
  };

  SuperFabric.prototype.stopScheduler = function () {
    if (this._tick) clearInterval(this._tick);
    this._tick = null;
  };

  SuperFabric.prototype.snapshot = function () {
    var gpus = 0, util = 0;
    this.nodes.forEach(function (n) {
      n.gpus.forEach(function (g) {
        gpus += 1;
        util += g.util;
      });
    });
    return {
      version: VERSION,
      booted: this.booted,
      nodes: this.nodes.length,
      gpus: gpus,
      avg_util: gpus ? util / gpus : 0,
      queue: this.queue.length,
      running: this.running.length,
      done: this.done.length,
      stats: Object.assign({}, this.stats),
      mem_entries: this.memory.length,
      mem_bytes: this.stats.mem_bytes,
      nodes_detail: this.nodes,
      recent: this.done.slice(0, 8)
    };
  };

  SuperFabric.prototype.exportJSON = function () {
    return {
      version: VERSION,
      snapshot: this.snapshot(),
      memory_tail: this.memory.slice(-50),
      done_tail: this.done.slice(0, 30)
    };
  };

  G.AKSI_SUPER = {
    version: VERSION,
    SuperFabric: SuperFabric,
    matMul: matMul,
    quantumSeed: quantumSeed,
    hashStr: hashStr
  };
})(typeof window !== "undefined" ? window : globalThis);
