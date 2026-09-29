/**
 * AKSI Exocortex — session memory: user goal + agent trace log.
 */
export class Exocortex {
  constructor(sessionId = null) {
    this.sessionId = sessionId || `sess_${Date.now().toString(36)}`;
    this.userGoal = null;
    this.trace = [];
    this.createdAt = new Date().toISOString();
    this.meta = {};
  }

  setGoal(goal) {
    this.userGoal = String(goal || '').trim();
    this._push('goal_set', { goal: this.userGoal });
    return this.userGoal;
  }

  getGoal() {
    return this.userGoal;
  }

  addThought(kind, payload = {}) {
    this._push(kind, payload);
  }

  _push(kind, payload) {
    this.trace.push({
      ts: new Date().toISOString(),
      kind: String(kind),
      ...payload,
    });
    if (this.trace.length > 200) this.trace = this.trace.slice(-200);
  }

  getContextSummary() {
    const recent = this.trace.slice(-8).map((t) => {
      const bits = [t.kind];
      if (t.tool) bits.push(`tool=${t.tool}`);
      if (t.gate) bits.push(`gate=${t.gate}`);
      if (t.note) bits.push(t.note);
      return bits.join(' ');
    });
    return {
      sessionId: this.sessionId,
      userGoal: this.userGoal || '',
      goalLower: (this.userGoal || '').toLowerCase(),
      steps: this.trace.length,
      recent,
      createdAt: this.createdAt,
    };
  }

  contextFingerprint() {
    const s = this.getContextSummary();
    return JSON.stringify({
      sessionId: s.sessionId,
      userGoal: s.userGoal,
      steps: s.steps,
      recent: s.recent,
    });
  }
}

export default Exocortex;
