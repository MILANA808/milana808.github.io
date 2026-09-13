/* AKSI Reality Engine — deterministic causal experiment substrate. */
(function (root) {
  'use strict';
  const VERSION = '0.1.0';
  const PROTOCOL = 'AKSI-REALITY/0.1';

  function stable(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(stable(value));
    if (root.crypto && root.crypto.subtle) {
      const digest = await root.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('WebCrypto SHA-256 is required');
  }

  class Reality {
    constructor(spec) {
      spec = spec || {};
      this.protocol = PROTOCOL;
      this.version = VERSION;
      this.seed = String(spec.seed == null ? 'aksi-reality-default' : spec.seed);
      this.state = Object.assign({ tick: 0, energy: 100, reward: 0, position: [0, 0], memory: {} }, spec.initialState || {});
      this.history = [];
    }

    async observe(agent) {
      return { tick: this.state.tick, energy: this.state.energy, reward: this.state.reward, position: this.state.position.slice(), memory: Object.assign({}, this.state.memory), agent: agent || 'unknown' };
    }

    async step(agent, action, outcome) {
      const before = Object.assign({}, this.state, { position: this.state.position.slice(), memory: Object.assign({}, this.state.memory) });
      const a = action || {};
      const dx = Number(a.dx || 0), dy = Number(a.dy || 0);
      this.state.position = [before.position[0] + dx, before.position[1] + dy];
      this.state.energy = Math.max(0, before.energy - Math.max(0, Number(a.cost || 1)));
      this.state.reward += Number(outcome && outcome.reward || 0);
      this.state.tick += 1;
      const after = Object.assign({}, this.state, { position: this.state.position.slice(), memory: Object.assign({}, this.state.memory) });
      const record = { protocol: PROTOCOL, seed: this.seed, tick: this.state.tick, agent: agent || 'unknown', before, action: a, outcome: outcome || {}, after };
      record.state_hash = await sha256(after);
      record.transition_hash = await sha256(record);
      this.history.push(record);
      return record;
    }

    async fork(label) {
      const snapshot = Object.assign({}, this.state, { position: this.state.position.slice(), memory: Object.assign({}, this.state.memory) });
      const parent_hash = await sha256(snapshot);
      return { protocol: PROTOCOL, fork: String(label || 'fork'), parent_hash, seed: this.seed, state: snapshot };
    }

    async evidence(agent, experiment) {
      const final = this.history[this.history.length - 1];
      const payload = { protocol: PROTOCOL, agent: agent || 'unknown', experiment: experiment || 'episode', seed: this.seed, initial_state: this.history[0] ? this.history[0].before : this.state, transitions: this.history, final_state_hash: final ? final.state_hash : await sha256(this.state) };
      payload.evidence_id = await sha256(payload);
      return payload;
    }
  }

  root.AKSIRelity = { VERSION, PROTOCOL, Reality, sha256, stable };
})(typeof globalThis !== 'undefined' ? globalThis : window);
