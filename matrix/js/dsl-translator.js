/** DSL: H 0; CNOT 0 1; MEASURE */
(function (global) {
  "use strict";
  function parseDSL(text, maxQ) {
    maxQ = maxQ || 4;
    var gates = [], nQ = 1, errors = [];
    var lines = String(text || "").replace(/;/g, "\n").split(/\n+/);
    lines.forEach(function (line, li) {
      line = line.trim();
      if (!line || line[0] === "#" || line[0] === "/") return;
      var parts = line.split(/[\s,]+/).filter(Boolean);
      var op = (parts[0] || "").toUpperCase();
      function qi(x) {
        var n = parseInt(x, 10);
        if (isNaN(n) || n < 0) { errors.push("строка " + (li + 1) + ": плохой кубит"); return 0; }
        if (n + 1 > nQ) nQ = n + 1;
        if (nQ > maxQ) { nQ = maxQ; errors.push("макс. кубитов " + maxQ); }
        return n;
      }
      if (op === "H" || op === "X" || op === "Y" || op === "Z" || op === "S" || op === "T" || op === "I") {
        gates.push({ g: op, q: qi(parts[1]) });
      } else if (op === "CNOT" || op === "CX") {
        gates.push({ g: "CNOT", c: qi(parts[1]), q: qi(parts[2]) });
      } else if (op === "SWAP") {
        gates.push({ g: "SWAP", c: qi(parts[1]), q: qi(parts[2]) });
      } else if (op === "TOFFOLI" || op === "CCX") {
        gates.push({ g: "TOFFOLI", c1: qi(parts[1]), c2: qi(parts[2]), q: qi(parts[3]) });
        if (nQ < 3) nQ = 3;
      } else if (op === "MEASURE" || op === "M") {
        gates.push({ g: "MEASURE", q: parts[1] != null ? qi(parts[1]) : -1 });
      } else {
        errors.push("строка " + (li + 1) + ": неизвестно «" + op + "»");
      }
    });
    return { gates: gates.filter(function (g) { return g.g !== "MEASURE"; }), nQ: nQ, errors: errors, measure: gates.some(function (g) { return g.g === "MEASURE"; }) };
  }

  function toDSL(gates) {
    return gates.map(function (g) {
      var op = (g.g || "").toUpperCase();
      if (op === "CNOT" || op === "CX") return "CNOT " + g.c + " " + g.q;
      if (op === "SWAP") return "SWAP " + g.c + " " + g.q;
      if (op === "TOFFOLI" || op === "CCX") return "TOFFOLI " + g.c1 + " " + g.c2 + " " + g.q;
      return op + " " + g.q;
    }).join("\n");
  }

  function toQASM(nQ, gates) {
    var lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', "qreg q[" + nQ + "];", "creg c[" + nQ + "];"];
    gates.forEach(function (g) {
      var op = (g.g || "").toUpperCase();
      if (op === "CNOT" || op === "CX") lines.push("cx q[" + g.c + "],q[" + g.q + "];");
      else if (op === "SWAP") lines.push("swap q[" + g.c + "],q[" + g.q + "];");
      else if (op === "TOFFOLI") lines.push("ccx q[" + g.c1 + "],q[" + g.c2 + "],q[" + g.q + "];");
      else if (op === "H" || op === "X" || op === "Y" || op === "Z" || op === "S" || op === "T") lines.push(op.toLowerCase() + " q[" + g.q + "];");
    });
    for (var i = 0; i < nQ; i++) lines.push("measure q[" + i + "] -> c[" + i + "];");
    return lines.join("\n");
  }

  function toQiskit(nQ, gates) {
    var lines = ["from qiskit import QuantumCircuit", "qc = QuantumCircuit(" + nQ + ", " + nQ + ")"];
    gates.forEach(function (g) {
      var op = (g.g || "").toUpperCase();
      if (op === "CNOT" || op === "CX") lines.push("qc.cx(" + g.c + ", " + g.q + ")");
      else if (op === "SWAP") lines.push("qc.swap(" + g.c + ", " + g.q + ")");
      else if (op === "TOFFOLI") lines.push("qc.ccx(" + g.c1 + ", " + g.c2 + ", " + g.q + ")");
      else if (op === "H") lines.push("qc.h(" + g.q + ")");
      else if (op === "X") lines.push("qc.x(" + g.q + ")");
      else if (op === "Y") lines.push("qc.y(" + g.q + ")");
      else if (op === "Z") lines.push("qc.z(" + g.q + ")");
      else if (op === "S") lines.push("qc.s(" + g.q + ")");
      else if (op === "T") lines.push("qc.t(" + g.q + ")");
    });
    lines.push("qc.measure(range(" + nQ + "), range(" + nQ + "))");
    lines.push("print(qc)");
    return lines.join("\n");
  }

  global.DSLTranslator = { parseDSL: parseDSL, toDSL: toDSL, toQASM: toQASM, toQiskit: toQiskit };
})(typeof window !== "undefined" ? window : globalThis);
