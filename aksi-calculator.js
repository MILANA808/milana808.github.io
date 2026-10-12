(function (g) {
  "use strict";
  var VERSION = "1.0.0";
  function evaluate(expression) {
    var s = String(expression == null ? "" : expression).trim();
    if (!s || s.length > 200) return { ok: false, error: "Введите выражение длиной от 1 до 200 символов." };
    var i = 0;
    function ws() { while (/\s/.test(s[i] || "")) i++; }
    function eat(ch) { ws(); if (s[i] === ch) { i++; return true; } return false; }
    function expr() { var v = term(); for (;;) { if (eat("+")) v += term(); else if (eat("-")) v -= term(); else return v; } }
    function term() { var v = unary(); for (;;) { if (eat("*")) v *= unary(); else if (eat("/")) { var d = unary(); if (d === 0) throw Error("Деление на ноль."); v /= d; } else return v; } }
    function power() { var v = primary(); if (eat("^")) v = Math.pow(v, unary()); return v; }
    function unary() { if (eat("+")) return unary(); if (eat("-")) return -unary(); return power(); }
    function primary() {
      ws();
      if (eat("(")) { var v = expr(); if (!eat(")")) throw Error("Не хватает закрывающей скобки."); return v; }
      var rest = s.slice(i), nm = rest.match(/^[a-zA-Z]+/);
      if (nm) {
        i += nm[0].length; var name = nm[0].toLowerCase();
        if (name === "pi") return Math.PI;
        if (name === "e") return Math.E;
        if (!eat("(")) throw Error("Для функции " + name + " нужны скобки.");
        var a = expr(); if (!eat(")")) throw Error("Не хватает закрывающей скобки.");
        var f = {sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: function (x) { return Math.log(x) / Math.LN10; }, exp: Math.exp}[name];
        if (!f) throw Error("Неизвестная функция: " + name + ".");
        if ((name === "sqrt" && a < 0) || ((name === "ln" || name === "log") && a <= 0)) throw Error("Аргумент вне области определения.");
        return f(a);
      }
      var n = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (!n) throw Error("Ожидалось число, скобка или функция около позиции " + (i + 1) + ".");
      i += n[0].length; return Number(n[0]);
    }
    try {
      var value = expr(); ws();
      if (i !== s.length) throw Error("Неожиданный символ «" + s[i] + "» около позиции " + (i + 1) + ".");
      if (!Number.isFinite(value)) throw Error("Результат не является конечным числом.");
      return { ok: true, expression: s, value: value, formatted: Number(value.toPrecision(12)).toString(), version: VERSION };
    } catch (e) { return { ok: false, expression: s, error: e.message || "Не удалось вычислить выражение.", version: VERSION }; }
  }
  g.AKSICalculator = { version: VERSION, evaluate: evaluate };
})(typeof window !== "undefined" ? window : globalThis);
