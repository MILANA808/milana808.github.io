/* AKSI Full offline LIF worker v2 — 4096 neurons, responsive decisions */
const N = 4096;
const GROUPS = [
  { name: 'sensory', n: 480, color: '#38bdf8' },
  { name: 'optic', n: 1200, color: '#22d3ee' },
  { name: 'central', n: 1100, color: '#a78bfa' },
  { name: 'kc_mb', n: 400, color: '#c084fc' },
  { name: 'descending', n: 280, color: '#f472b6' },
  { name: 'motor', n: 236, color: '#4ade80' },
  { name: 'modulatory', n: 400, color: '#fbbf24' }
];
let start = 0;
const ranges = GROUPS.map((g) => {
  const a = start, b = start + g.n;
  start = b;
  return [a, b];
});
const adjPre = Array.from({ length: N }, () => []);
const adjW = Array.from({ length: N }, () => []);
function connect(pre, post, w) {
  adjPre[post].push(pre);
  adjW[post].push(w);
}
function rand(a, b) { return a + Math.floor(Math.random() * (b - a)); }
function pick(gi) {
  const [a, b] = ranges[gi];
  return rand(a, b);
}
for (let i = 0; i < 2800; i++) {
  connect(pick(0), pick(2), 0.55 + Math.random() * 0.55);
  connect(pick(0), pick(1), 0.35 + Math.random() * 0.4);
}
for (let i = 0; i < 2200; i++) {
  connect(pick(1), pick(4), 0.65 + Math.random() * 0.5);
  connect(pick(1), pick(2), 0.3 + Math.random() * 0.35);
}
for (let i = 0; i < 3200; i++) {
  connect(pick(2), pick(3), 0.45 + Math.random() * 0.45);
  connect(pick(3), pick(4), 0.55 + Math.random() * 0.45);
  connect(pick(2), pick(4), 0.4 + Math.random() * 0.4);
}
for (let i = 0; i < 2400; i++) connect(pick(4), pick(5), 0.65 + Math.random() * 0.5);
for (let i = 0; i < 1200; i++) {
  connect(pick(0), pick(5), -(0.55 + Math.random() * 0.6));
  connect(pick(2), pick(5), -(0.3 + Math.random() * 0.4));
}
for (let i = 0; i < 900; i++) {
  connect(pick(6), pick(2), 0.3 + Math.random() * 0.35);
  connect(pick(6), pick(3), 0.35 + Math.random() * 0.35);
}
for (let i = 0; i < 1200; i++) {
  const g = rand(0, 7);
  connect(pick(g), pick(g), 0.12 + Math.random() * 0.18);
}
const V = new Float32Array(N);
const spikes = new Uint8Array(N);
let t = 0;
let drive = { food: 0, bitter: 0, loom: 0, touch: 0 };
let decisionHold = { name: 'IDLE', ttl: 0 };
function step() {
  t++;
  const [s0] = ranges[0];
  const [o0] = ranges[1];
  for (let i = s0; i < s0 + 100; i++) V[i] += drive.food * 1.4;
  for (let i = s0 + 100; i < s0 + 200; i++) V[i] += drive.bitter * 1.5;
  for (let i = o0; i < o0 + 160; i++) V[i] += drive.loom * 1.4;
  for (let i = s0 + 200; i < s0 + 280; i++) V[i] += drive.touch * 1.2;
  drive.food *= 0.96; drive.bitter *= 0.95; drive.loom *= 0.94; drive.touch *= 0.93;
  const next = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x = V[i] * 0.88;
    const pres = adjPre[i], ws = adjW[i];
    for (let k = 0; k < pres.length; k++) if (spikes[pres[k]]) x += ws[k] * 0.7;
    next[i] = x;
  }
  for (let i = 0; i < N; i++) {
    V[i] = next[i];
    if (V[i] > 0.75) { spikes[i] = 1; V[i] = 0; } else spikes[i] = 0;
  }
  const rates = GROUPS.map((g, gi) => {
    const [a, b] = ranges[gi];
    let c = 0;
    for (let i = a; i < b; i++) c += spikes[i];
    return c / g.n;
  });
  const motor = rates[5], desc = rates[4], sens = rates[0], optic = rates[1];
  let decision = 'IDLE';
  if (drive.bitter > 0.08 || (sens > 0.02 && motor < 0.01 && drive.bitter > 0.02)) decision = 'DEFERRED';
  else if (drive.loom > 0.08 || optic > 0.025) decision = 'ESCAPE';
  else if (motor > 0.012 || desc > 0.02 || drive.food > 0.1) decision = 'ALLOWED';
  if (decision !== 'IDLE') decisionHold = { name: decision, ttl: 25 };
  else if (decisionHold.ttl > 0) { decisionHold.ttl--; decision = decisionHold.name; }
  const sample = [];
  for (let i = 0; i < N && sample.length < 200; i++) if (spikes[i]) sample.push(i);
  return { t, decision, rates, sample, n: N, edges: adjPre.reduce((s, a) => s + a.length, 0),
    drive: { food: drive.food, bitter: drive.bitter, loom: drive.loom, touch: drive.touch } };
}
self.onmessage = (ev) => {
  const m = ev.data || {};
  if (m.type === 'inject') {
    const k = m.kind, s = m.strength || 2.0;
    if (k === 'food' || k === 'sweet') drive.food = Math.max(drive.food, s);
    else if (k === 'bitter') drive.bitter = Math.max(drive.bitter, s);
    else if (k === 'loom' || k === 'danger') drive.loom = Math.max(drive.loom, s);
    else if (k === 'touch') drive.touch = Math.max(drive.touch, s);
  } else if (m.type === 'reset') {
    V.fill(0); spikes.fill(0); t = 0;
    drive = { food: 0, bitter: 0, loom: 0, touch: 0 };
    decisionHold = { name: 'IDLE', ttl: 0 };
  } else if (m.type === 'tick') {
    let out = null;
    for (let i = 0; i < (m.steps || 1); i++) out = step();
    self.postMessage(out);
  } else if (m.type === 'info') {
    self.postMessage({ type: 'info', n: N, groups: GROUPS,
      edges: adjPre.reduce((s, a) => s + a.length, 0),
      disclaimer: 'Offline 4096 LIF v2. Not FlyWire 15M edges.' });
  }
};
