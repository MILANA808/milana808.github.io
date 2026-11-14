#!/usr/bin/env node
"use strict";

// Numerical conformance check between the Python AKSI Q runtime and the
// existing browser AKSI quantum simulator. State vectors are compared up to
// global phase because phase(state, theta) and Rz(theta) differ by one.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");
const languageDir = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "aksi-quantum.js"), "utf8");
const context = { console, Math, Promise };
context.window = context;
vm.runInNewContext(source, context, { filename: "aksi-quantum.js" });
const quantum = context.AKSI_QUANTUM;
if (!quantum) throw new Error("AKSI_QUANTUM did not initialize");

const cases = [
  {
    name: "Hadamard",
    aksi: "let s = qstate(1)\nlet out = h(s)",
    circuit: () => quantum.create(1).h(0),
  },
  {
    name: "Pauli X",
    aksi: "let s = qstate(1)\nlet out = x(s)",
    circuit: () => quantum.create(1).x(0),
  },
  {
    name: "Pauli Z",
    aksi: "let s = qstate(1)\nlet out = h(qstate(1))\nlet out = z(out)",
    circuit: () => quantum.create(1).h(0).z(0),
  },
  {
    name: "Rx rotation",
    aksi: "let s = qstate(1)\nlet out = rx(s, pi / 3)",
    circuit: () => quantum.create(1).rx(0, Math.PI / 3),
  },
  {
    name: "Ry rotation",
    aksi: "let s = qstate(1)\nlet out = ry(s, pi / 3)",
    circuit: () => quantum.create(1).ry(0, Math.PI / 3),
  },
  {
    name: "Rz rotation",
    aksi: "let s = h(qstate(1))\nlet out = rz(s, pi / 3)",
    circuit: () => quantum.create(1).h(0).rz(0, Math.PI / 3),
  },
  {
    name: "Bell state",
    aksi: "let s = qstate(2)\nlet p = h(s, 0)\nlet out = cnot(p, 0, 1)",
    circuit: () => quantum.create(2).h(0).cnot(0, 1),
  },
];

function pythonState(program) {
  const py = [
    "import json",
    "from aksi_q import Runtime",
    "r = Runtime()",
    "r.run(" + JSON.stringify(program) + ")",
    "print(json.dumps([[z.real, z.imag] for z in r.env['out']]))",
  ].join("\n");
  const result = spawnSync(process.env.PYTHON || "python3", ["-c", py], {
    cwd: languageDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error("Python runtime failed: " + (result.stderr || result.stdout));
  }
  return JSON.parse(result.stdout.trim().split(/\r?\n/).pop());
}

function compareUpToGlobalPhase(actual, expected) {
  if (actual.length !== expected.length) return Infinity;
  let pivot = -1;
  for (let i = 0; i < expected.length; i++) {
    if (Math.hypot(expected[i][0], expected[i][1]) > 1e-10) {
      pivot = i;
      break;
    }
  }
  if (pivot < 0) return Infinity;
  const [ar, ai] = actual[pivot];
  const [er, ei] = expected[pivot];
  const denom = er * er + ei * ei;
  const phase = [
    (ar * er + ai * ei) / denom,
    (ai * er - ar * ei) / denom,
  ];
  let maxError = 0;
  for (let i = 0; i < expected.length; i++) {
    const [r, im] = expected[i];
    const transformed = [
      phase[0] * r - phase[1] * im,
      phase[0] * im + phase[1] * r,
    ];
    maxError = Math.max(
      maxError,
      Math.hypot(actual[i][0] - transformed[0], actual[i][1] - transformed[1]),
    );
  }
  return maxError;
}

for (const test of cases) {
  const python = pythonState(test.aksi);
  const js = test.circuit().state.map((z) => [z.re, z.im]);
  const error = compareUpToGlobalPhase(js, python);
  if (!Number.isFinite(error) || error > 1e-9) {
    throw new Error(test.name + " parity failed; max amplitude error=" + error);
  }
  process.stdout.write("PASS " + test.name + " (max error " + error.toExponential(2) + ")\n");
}
process.stdout.write("AKSI quantum cross-runtime parity: " + cases.length + " cases passed\n");
