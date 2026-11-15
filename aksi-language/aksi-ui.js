/* AKSI Q UI profile v0.4.0
 * Bounded declarative UI grammar with local state and restricted event effects.
 * No eval, Function, HTML injection, implicit network or arbitrary DOM access.
 * © AKSI MATRIX
 */
(function (root) {
  "use strict";

  const VERSION = "0.4.0";
  const LIMITS = Object.freeze({ source: 16384, nodes: 500, depth: 12, text: 2000, states: 64 });

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
    const pattern = /\s+|"(?:\\.|[^"\\])*"|-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z0-9_]*|[{}=]/gy;
    let offset = 0;
    while (offset < source.length) {
      pattern.lastIndex = offset;
      const match = pattern.exec(source);
      if (!match) throw new AksiUIError("unexpected character", offset);
      offset = pattern.lastIndex;
      if (!/^\s+$/.test(match[0])) tokens.push({ value: match[0], offset: match.index });
      if (tokens.length > LIMITS.nodes * 6 + LIMITS.states * 3 + 8) {
        throw new AksiUIError("UI program has too many tokens", offset);
      }
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
    const states = [];
    const stateNames = new Set();
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
    const identifier = () => {
      const token = take();
      if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(token.value)) {
        throw new AksiUIError("expected a state identifier", token.offset);
      }
      return token.value;
    };
    const scalar = () => {
      const token = take();
      if (token.value.startsWith('"')) {
        const value = decode(token.value, token.offset);
        if (value.length > LIMITS.text) throw new AksiUIError("state string exceeds 2000 characters", token.offset);
        return value;
      }
      if (token.value === "true") return true;
      if (token.value === "false") return false;
      if (token.value === "null") return null;
      if (/^-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/.test(token.value)) {
        const value = Number(token.value);
        if (!Number.isFinite(value)) throw new AksiUIError("state number must be finite", token.offset);
        return value;
      }
      throw new AksiUIError("state initializer must be a string, finite number, boolean, or null", token.offset);
    };

    function node(depth) {
      if (depth > LIMITS.depth) throw new AksiUIError("UI nesting exceeds depth limit");
      nodeCount += 1;
      if (nodeCount > LIMITS.nodes) throw new AksiUIError("UI node budget exceeded");
      const kind = take();
      if (kind.value === "text") return { type: "text", value: string() };
      if (kind.value === "value") return { type: "value", state: string() };
      if (kind.value === "input") {
        const placeholder = string();
        expect("state");
        return { type: "input", placeholder, state: string() };
      }
      if (kind.value === "button") {
        const label = string();
        expect("action");
        const action = string();
        if (!action.trim()) throw new AksiUIError("button action name cannot be empty", kind.offset);
        let effect = null;
        if (peek() === "state") {
          take();
          const state = string();
          expect("add");
          const amountToken = take();
          if (!/^-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$/.test(amountToken.value)) {
            throw new AksiUIError("state add effect requires a finite numeric amount", amountToken.offset);
          }
          const amount = Number(amountToken.value);
          if (!Number.isFinite(amount)) throw new AksiUIError("state add amount must be finite", amountToken.offset);
          effect = { type: "add", state, amount };
        }
        return { type: "button", label, action, effect };
      }
      if (kind.value === "when") {
        const state = string();
        expect("equals");
        const expected = scalar();
        expect("{");
        const children = [];
        while (peek() !== "}") {
          if (peek() === "<EOF>") throw new AksiUIError("unterminated when block", kind.offset);
          children.push(node(depth + 1));
        }
        expect("}");
        return { type: "when", state, expected, children };
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
    let hasUiNode = false;
    while (peek() !== "}") {
      if (peek() === "<EOF>") throw new AksiUIError("unterminated page", rootToken.offset);
      if (peek() === "state") {
        if (hasUiNode) throw new AksiUIError("state declarations must appear before UI nodes", tokens[cursor].offset);
        const stateToken = take();
        if (states.length >= LIMITS.states) throw new AksiUIError("page state budget exceeded", stateToken.offset);
        const stateName = string();
        if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(stateName)) {
          throw new AksiUIError("state name must be a simple identifier", stateToken.offset);
        }
        if (stateNames.has(stateName)) throw new AksiUIError("duplicate state: " + stateName, stateToken.offset);
        expect("=");
        states.push({ name: stateName, value: scalar() });
        stateNames.add(stateName);
      } else {
        hasUiNode = true;
        children.push(node(1));
      }
    }
    expect("}");
    if (peek() !== "<EOF>") throw new AksiUIError("unexpected token: " + peek(), tokens[cursor].offset);

    function validate(nodes) {
      nodes.forEach(item => {
        if ((item.type === "value" || item.type === "input" || item.type === "when") && !stateNames.has(item.state)) {
          throw new AksiUIError("value references undeclared state: " + item.state);
        }
        if (item.type === "input") {
          const target = states.find(state => state.name === item.state);
          if (!target || typeof target.value !== "string") {
            throw new AksiUIError("input requires a declared string state: " + item.state);
          }
        }
        if (item.type === "when") {
          const target = states.find(state => state.name === item.state);
          if (!target || typeof target.value !== typeof item.expected || target.value === null && item.expected !== null) {
            throw new AksiUIError("when comparison must match declared state type: " + item.state);
          }
        }
        if (item.type === "button" && item.effect) {
          const target = states.find(state => state.name === item.effect.state);
          if (!target) throw new AksiUIError("button effect references undeclared state: " + item.effect.state);
          if (typeof target.value !== "number") throw new AksiUIError("add effect requires numeric state: " + item.effect.state);
        }
        if (item.children) validate(item.children);
      });
    }
    validate(children);
    return Object.freeze({
      type: "page", name,
      states: Object.freeze(states.map(state => Object.freeze(state))),
      children: Object.freeze(children.map(freezeNode))
    });
  }

  function freezeNode(node) {
    if (node.children) {
      node.children = Object.freeze(node.children.map(freezeNode));
      Object.freeze(node);
    } else if (node.effect) {
      Object.freeze(node.effect);
      Object.freeze(node);
    } else Object.freeze(node);
    return node;
  }

  function render(ast, doc, onAction) {
    if (!ast || ast.type !== "page" || !Array.isArray(ast.children) || !Array.isArray(ast.states)) {
      throw new AksiUIError("render expects a parsed page AST");
    }
    if (!doc || typeof doc.createElement !== "function") throw new AksiUIError("a DOM document is required");
    if (onAction !== undefined && typeof onAction !== "function") throw new AksiUIError("onAction must be a function");
    const state = new Map(ast.states.map(item => [item.name, item.value]));
    const outputs = new Map();
    const inputs = new Map();
    const conditions = new Map();
    function refresh(name) {
      (outputs.get(name) || []).forEach(output => { output.textContent = String(state.get(name)); });
      (inputs.get(name) || []).forEach(input => { input.value = String(state.get(name)); });
      (conditions.get(name) || []).forEach(update => update());
    }
    function create(node) {
      if (node.type === "text") {
        const p = doc.createElement("p");
        p.textContent = node.value;
        return p;
      }
      if (node.type === "value") {
        const output = doc.createElement("output");
        if (!outputs.has(node.state)) outputs.set(node.state, []);
        outputs.get(node.state).push(output);
        output.textContent = String(state.get(node.state));
        output.dataset.aksiState = node.state;
        return output;
      }
      if (node.type === "input") {
        const input = doc.createElement("input");
        input.type = "text";
        input.placeholder = node.placeholder;
        input.ariaLabel = node.placeholder;
        input.maxLength = LIMITS.text;
        input.value = String(state.get(node.state));
        if (!inputs.has(node.state)) inputs.set(node.state, []);
        inputs.get(node.state).push(input);
        input.addEventListener("input", event => {
          const value = event && event.target ? event.target.value : input.value;
          if (typeof value !== "string" || value.length > LIMITS.text) {
            throw new AksiUIError("input value exceeds text limit");
          }
          state.set(node.state, value);
          refresh(node.state);
        });
        return input;
      }
      if (node.type === "button") {
        const button = doc.createElement("button");
        button.type = "button";
        button.textContent = node.label;
        button.addEventListener("click", () => {
          if (node.effect) {
            const current = state.get(node.effect.state);
            const next = current + node.effect.amount;
            if (!Number.isFinite(next)) throw new AksiUIError("state update is not finite");
            state.set(node.effect.state, next);
            refresh(node.effect.state);
          }
          if (onAction) onAction(node.action, Object.freeze({
            page: ast.name, label: node.label,
            state: Object.freeze(Object.fromEntries(state))
          }));
        });
        return button;
      }
      if (node.type === "when") {
        const section = doc.createElement("section");
        if (typeof section.replaceChildren !== "function") {
          throw new AksiUIError("DOM document must support replaceChildren for conditional UI");
        }
        let visible = null;
        const update = () => {
          const nextVisible = Object.is(state.get(node.state), node.expected);
          if (nextVisible === visible) return;
          visible = nextVisible;
          section.replaceChildren();
          if (visible) node.children.forEach(child => section.appendChild(create(child)));
        };
        if (!conditions.has(node.state)) conditions.set(node.state, []);
        conditions.get(node.state).push(update);
        update();
        return section;
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
