/* AKSI Full offline LIF worker — 4096 neurons, FlyWire-scale populations */
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
let groupOf = new Uint8Array(N);
let start = 0;
const ranges = GROUPS.map((g, gi) => {
  const a = start, b = start + g.n;
  for (let i = a; i < b; i++) groupOf[i] = gi;
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
for (let i = 0; i < 2000; i++) {
  connect(pick(0), pick(2), 0.4 + Math.random() * 0.5);
  connect(pick(0), pick(1), 0.3 + Math.random() * 0.4);
}
for (let i = 0; i < 1500; i++) {
  connect(pick(1), pick(4), 0.5 + Math.random() * 0.5);
  connect(pick(1), pick(2), 0.2 + Math.random() * 0.3);
}
for (let i = 0; i < 2500; i++) {
  connect(pick(2), pick(3), 0.35 + Math.random() * 0.4);
  connect(pick(3), pick(4), 0.4 + Math.random() * 0.45);
  connect(pick(2), pick(4), 0.25 + Math.random() * 0.35);
}
for (let i = 0; i < 1800; i++) connect(pick(4), pick(5), 0.5 + Math.random() * 0.5);
for (let i = 0; i < 800; i++) {
  connect(pick(0), pick(5), -(0.4 + Math.random() * 0.6));
  connect(pick(2), pick(5), -(0.2 + Math.random() * 0.4));
}
for (let i = 0; i < 600; i++) {
  connect(pick(6), pick(2), 0.2 + Math.random() * 0.3);
  connect(pick(6), pick(3), 0.25 + Math.random() * 0.35);
}
for (let i = 0; i < 1000; i++) {
  const g = rand(0, 7);
  connect(pick(g), pick(g), 0.1 + Math.random() * 0.15);
}
const V = new Float32Array(N);
const spikes = new Uint8Array(N);
let t = 0;
let drive = { food: 0, bitter: 0, loom: 0, touch: 0 };
function step() {
  t++;
  const [s0] = ranges[0];
  const [o0] = ranges[1];
  for (let i = s0; i < s0 + 80; i++) V[i] += drive.food;
  for (let i = s0 + 80; i < s0 + 160; i++) V[i] += drive.bitter;
  for (let i = o0; i < o0 + 120; i++) V[i] += drive.loom;
  for (let i = s0 + 160; i < s0 + 220; i++) V[i] += drive.touch;
  drive.food *= 0.93; drive.bitter *= 0.91; drive.loom *= 0.9; drive.touch *= 0.88;
  const next = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x = V[i] * 0.9;
    const pres = adjPre[i], ws = adjW[i];
    for (let k = 0; k < pres.length; k++) if (spikes[pres[k]]) x += ws[k] * 0.55;
    next[i] = x;
  }
  for (let i = 0; i < N; i++) {
    V[i] = next[i];
    if (V[i] > 0.85) { spikes[i] = 1; V[i] = 0; } else spikes[i] = 0;
  }
  const rates = GROUPS.map((g, gi) => {
    const [a, b] = ranges[gi];
    let c = 0;
    for (let i = a; i < b; i++) c += spikes[i];
    return c / g.n;
  });
  const motor = rates[5], desc = rates[4], sensB = rates[0];
  let decision = 'IDLE';
  if (drive.bitter > 0.15 || (sensB > 0.08 && motor < 0.05)) decision = 'DEFERRED';
  else if (drive.loom > 0.2 || rates[1] > 0.12) decision = 'ESCAPE';
  else if (motor > 0.04 || desc > 0.06) decision = 'ALLOWED';
  const sample = [];
  for (let i = 0; i < N && sample.length < 180; i++) if (spikes[i]) sample.push(i);
  return { t, decision, rates, sample, n: N, edges: adjPre.reduce((s, a) => s + a.length, 0), drive: { food: drive.food, bitter: drive.bitter, loom: drive.loom, touch: drive.touch } };
}
self.onmessage = (ev) => {
  const m = ev.data || {};
  if (m.type === 'inject') drive[m.kind] = Math.max(drive[m.kind] || 0, m.strength || 1.2);
  else if (m.type === 'reset') { V.fill(0); spikes.fill(0); t = 0; drive = { food: 0, bitter: 0, loom: 0, touch: 0 }; }
  else if (m.type === 'tick') {
    let out = null;
    for (let i = 0; i < (m.steps || 1); i++) out = step();
    self.postMessage(out);
  } else if (m.type === 'info') {
    self.postMessage({ type: 'info', n: N, groups: GROUPS, edges: adjPre.reduce((s, a) => s + a.length, 0), disclaimer: 'Offline 4096 LIF. Not FlyWire 15M edges.' });
  }
};
