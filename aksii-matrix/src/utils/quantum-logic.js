function C(re, im) { return { re: re || 0, im: im || 0 }; }
function add(a, b) { return C(a.re + b.re, a.im + b.im); }
function mul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
function abs2(a) { return a.re * a.re + a.im * a.im; }
const ISQ = 1 / Math.SQRT2;

function apply1(psi, q, M) {
  const next = [C(), C(), C(), C()];
  for (let b = 0; b < 2; b++) {
    for (let other = 0; other < 2; other++) {
      let i0, i1, out;
      if (q === 0) { i0 = other; i1 = 2 + other; out = b * 2 + other; }
      else { i0 = other * 2; i1 = other * 2 + 1; out = other * 2 + b; }
      next[out] = add(mul(M[b][0], psi[i0]), mul(M[b][1], psi[i1]));
    }
  }
  return next;
}

function H(psi, q) {
  return apply1(psi, q, [[C(ISQ), C(ISQ)], [C(ISQ), C(-ISQ)]]);
}
function X(psi, q) {
  return apply1(psi, q, [[C(0), C(1)], [C(1), C(0)]]);
}
function CNOT(psi) {
  const next = [C(), C(), C(), C()];
  for (let q0 = 0; q0 < 2; q0++) {
    for (let q1 = 0; q1 < 2; q1++) {
      const t = q0 ? 1 - q1 : q1;
      next[2 * q0 + t] = add(next[2 * q0 + t], psi[2 * q0 + q1]);
    }
  }
  return next;
}

export function runCircuit(steps) {
  let psi = [C(1), C(), C(), C()];
  (steps || []).forEach((g) => {
    if (g === "H0") psi = H(psi, 0);
    else if (g === "H1") psi = H(psi, 1);
    else if (g === "X0") psi = X(psi, 0);
    else if (g === "X1") psi = X(psi, 1);
    else if (g === "CNOT") psi = CNOT(psi);
  });
  let probs = psi.map(abs2);
  const s = probs.reduce((a, b) => a + b, 0) || 1;
  probs = probs.map((p) => p / s);
  return { probs, psi };
}

export function analyzeProbs(probs) {
  const p = probs || [1, 0, 0, 0];
  const labels = ["00", "01", "10", "11"];
  const lines = labels.map((L, i) => "P|" + L + "⟩ = " + p[i].toFixed(4));
  let entropy = 0;
  p.forEach((x) => { if (x > 1e-12) entropy -= x * Math.log2(x); });
  lines.push("Энтропия: " + entropy.toFixed(3) + " бит");
  if (Math.abs(p[0] - 0.5) < 0.05 && Math.abs(p[3] - 0.5) < 0.05 && p[1] < 0.05 && p[2] < 0.05) {
    lines.push("Вывод: запутанность (Белл Φ+). Измерения кубитов коррелированы.");
  } else if (entropy < 0.08) {
    lines.push("Вывод: почти чистое базисное состояние.");
  } else if (entropy > 0.9) {
    lines.push("Вывод: заметная суперпозиция / неопределённость исхода.");
  } else {
    lines.push("Вывод: смешанный учебный профиль — смотрите доминирующие |базис⟩.");
  }
  return lines.join("\n");
}
