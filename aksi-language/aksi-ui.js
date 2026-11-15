/* AKSI Q UI profile v0.1.0
 * Small declarative UI grammar and capability-limited DOM renderer.
 * No eval, Function, HTML injection, implicit network or arbitrary DOM access.
 * © AKSI MATRIX
 */
(function (root) {
  "use strict";

  const VERSION = "0.1.0";
  const LIMITS = Object.freeze({ source: 16384, nodes: 500, depth: 12, text: 2000 });

  class AksiUIError extends Error {
    constructor(message, offset) {
      super(offset === undefined ? message : message + " (offset " + offset + ")");
      this.name = "AksiUIError";
      this.offset = offset === undefined ? null : offset;
    }
  }

  function tokenize(source) {
    if (typeof source !== "string" || source.length > LIMITS.source) {
      throw new AksiUIError("UI program must be text up to 16384 characters");
    }
    const tokens = [];
    const pattern = /\s+|"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z0-9_]*|[{}]/gy;
    let offset = 0;
    while (offset < source.length) {
      pattern.lastIndex = offset;
      const match = pattern.exec(source);
      if (!match) throw new AksiUIError("unexpected character", offset);
      offset = pattern.lastIndex;
      if (!/^\s+$/.test(match[0])) tokens.push({ value: match[0], offset: match.index });
      if (tokens.length > LIMITS.nodes * 4 + 8) throw new AksiUIError("UI program has too many tokens", offset);
    }
    tokens.push({ value: "<EOF>", offset });
    return tokens;
  }

  function decode(token, offset) {
    try { return JSON.parse(token); }
    catch (_) { throw new AksiUIError("invalid string literal", offset); }
  }

  function parse(source) {
    const tokens = tokenize(source);
    let cursor = 0;
    let nodeCount = 0;
    const peek = () => tokens[cursor].value;
    const take = () => tokens[cursor++];
    const expect = value => {
      const token = take();
      if (token.value !== value) throw new AksiUIError("expected " + value, token.offset);
      return token;
    };
    const string = () => {
      const token = take();
      if (!token.value.startsWith('"')) throw new AksiUIError("expected a quoted string", token.offset);
      const value = decode(token.value, token.offset);
      if (value.length > LIMITS.text) throw new AksiUIError("text exceeds 2000 characters", token.offset);
      return value;
    };
    function node(depth) {
      if (depth > LIMITS.depth) throw new AksiUIError("UI nesting exceeds depth limit");
      nodeCount += 1;
      if (nodeCount > LIMITS.nodes) throw new AksiUIError("UI node budget exceeded");
      const kind = take();
      if (kind.value === "text") return { type: "text", value: string() };
      if (kind.value === "button") {
        const label = string();
        expect("action");
        const action = string();
        if (!action.trim()) throw new AksiUIError("button action name cannot be empty", kind.offset);
        return { type: "button", label, action };
      }
      if (kind.value === "section") {
        expect("{");
        const children = [];
        while (peek() !== "}") {
          if (peek() === "<EOF>") throw new AksiUIError("unterminated section", kind.offset);
          children.push(node(depth + 1));
        }
        expect("}");
        return { type: "section", children };
      }
      throw new AksiUIError("unknown UI node: " + kind.value, kind.offset);
    }

    const rootToken = expect("page");
    const name = string();
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name)) {
      throw new AksiUIError("page name must be a simple identifier", rootToken.offset);
    }
    expect("{");
    const children = [];
    while (peek() !== "}") {
      if (peek() === "<EOF>") throw new AksiUIError("unterminated page", rootToken.offset);
      children.push(node(1));
    }
    expect("}");
    if (peek() !== "<EOF>") throw new AksiUIError("unexpected token: " + peek(), tokens[cursor].offset);
    return Object.freeze({
      type: "page",
      name,
      children: Object.freeze(children.map(freezeNode))
    });
  }

  function freezeNode(node) {
    if (node.children) {
      node.children = Object.freeze(node.children.map(freezeNode));
      Object.freeze(node);
    } else Object.freeze(node);
    return node;
  }

  function render(ast, doc, onAction) {
    if (!ast || ast.type !== "page" || !Array.isArray(ast.children)) {
      throw new AksiUIError("render expects a parsed page AST");
    }
    if (!doc || typeof doc.createElement !== "function") throw new AksiUIError("a DOM document is required");
    if (onAction !== undefined && typeof onAction !== "function") throw new AksiUIError("onAction must be a function");
    function create(node) {
      if (node.type === "text") {
        const p = doc.createElement("p");
        p.textContent = node.value;
        return p;
      }
      if (node.type === "button") {
        const button = doc.createElement("button");
        button.type = "button";
        button.textContent = node.label;
        button.addEventListener("click", () => {
          if (onAction) onAction(node.action, Object.freeze({ page: ast.name, label: node.label }));
        });
        return button;
      }
      if (node.type === "section") {
        const section = doc.createElement("section");
        node.children.forEach(child => section.appendChild(create(child)));
        return section;
      }
      throw new AksiUIError("unsupported AST node: " + node.type);
    }
    const main = doc.createElement("main");
    main.dataset.aksiPage = ast.name;
    ast.children.forEach(child => main.appendChild(create(child)));
    return main;
  }

  const api = Object.freeze({ version: VERSION, limits: LIMITS, AksiUIError, tokenize, parse, render });
  root.AKSI_Q_UI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
