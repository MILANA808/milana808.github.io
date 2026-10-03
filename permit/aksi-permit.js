/**
 * AKSI Action Permit v1.1 — runtime gate for agent tool-calls
 * Tested: ALLOW / BLOCK / verify
 * aksilove@internet.ru
 */
const DEFAULT_MANIFEST = {
  version: '1.1',
  policy: 'strict',
  allowedTools: [
    'weather.fetch', 'http.get', 'search.web',
    'memory.read', 'memory.write', 'report.write'
  ],
  deniedTools: [
    'file.delete', 'shell.exec', 'payment.transfer', 'sys.shutdown'
  ],
  allowedDomains: [
    'wttr.in', 'api.open-meteo.com',
    'wikipedia.org', 'ru.wikipedia.org'
  ],
  maxSpend: 0
};

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(obj).sort().map(function (k) {
    return JSON.stringify(k) + ':' + stableStringify(obj[k]);
  }).join(',') + '}';
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

function b64(buf) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); });
}

let _keyPair = null;
let _publicJwk = null;

async function ensureKeys() {
  if (_keyPair) return _keyPair;
  try {
    const raw = localStorage.getItem('aksi_permit_priv_jwk');
    const pub = localStorage.getItem('aksi_permit_pub_jwk');
    if (raw && pub) {
      const privJwk = JSON.parse(raw);
      const pubJwk = JSON.parse(pub);
      const privateKey = await crypto.subtle.importKey(
        'jwk', privJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']
      );
      const publicKey = await crypto.subtle.importKey(
        'jwk', pubJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']
      );
      _keyPair = { privateKey, publicKey };
      _publicJwk = pubJwk;
      return _keyPair;
    }
  } catch (e) {}
  _keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
  );
  _publicJwk = await crypto.subtle.exportKey('jwk', _keyPair.publicKey);
  try {
    const priv = await crypto.subtle.exportKey('jwk', _keyPair.privateKey);
    localStorage.setItem('aksi_permit_priv_jwk', JSON.stringify(priv));
    localStorage.setItem('aksi_permit_pub_jwk', JSON.stringify(_publicJwk));
  } catch (e) {}
  return _keyPair;
}

async function signPayload(payloadStr) {
  const keys = await ensureKeys();
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.privateKey,
    new TextEncoder().encode(payloadStr)
  );
  return b64(sig);
}

async function createReceipt(gate, toolRequest, context, reasons, policy) {
  await ensureKeys();
  const body = {
    v: 1,
    id: 'rcp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    ts: new Date().toISOString(),
    gate: gate,
    policy: policy,
    tool: (toolRequest && (toolRequest.tool || toolRequest.name)) || null,
    toolRequest: toolRequest,
    context: context,
    reasons: reasons
  };
  const payload = stableStringify(body);
  body.payloadHash = await sha256Hex(payload);
  body.signature = await signPayload(payload);
  body.publicKey = _publicJwk;
  return body;
}

export async function offlineVerifyReceipt(receipt) {
  if (!receipt || !receipt.signature) return { ok: false, error: 'no_signature' };
  const copy = Object.assign({}, receipt);
  const sig = copy.signature;
  const pubJwk = copy.publicKey;
  delete copy.signature;
  delete copy.publicKey;
  delete copy.payloadHash;
  const payload = stableStringify(copy);
  try {
    let publicKey;
    if (pubJwk) {
      publicKey = await crypto.subtle.importKey(
        'jwk', pubJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']
      );
    } else {
      const keys = await ensureKeys();
      publicKey = keys.publicKey;
    }
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      unb64(sig),
      new TextEncoder().encode(payload)
    );
    return { ok: valid };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export class MandateManager {
  constructor(manifest) {
    this.manifest = Object.assign({}, DEFAULT_MANIFEST, manifest || {});
  }
  getPolicy() { return this.manifest.policy || 'strict'; }
  checkTool(tool) {
    var t = String(tool || '');
    if ((this.manifest.deniedTools || []).some(function (d) {
      return t === d || t.indexOf(d + '.') === 0;
    })) return { ok: false, reason: 'tool_denied:' + t };
    if (this.manifest.allowedTools && this.manifest.allowedTools.length) {
      var ok = this.manifest.allowedTools.some(function (a) {
        return t === a || t.indexOf(a) === 0;
      });
      if (!ok) return { ok: false, reason: 'tool_not_in_allowlist:' + t };
    }
    return { ok: true };
  }
  checkDomain(url) {
    if (!url) return { ok: true };
    try {
      var host = new URL(url).hostname.replace(/^www\./, '');
      var ok = (this.manifest.allowedDomains || []).some(function (d) {
        return host === d || host.slice(-(d.length + 1)) === '.' + d;
      });
      return ok ? { ok: true } : { ok: false, reason: 'domain_blocked:' + host };
    } catch (e) {
      return { ok: false, reason: 'bad_url' };
    }
  }
}

export class Exocortex {
  constructor() { this.goal = ''; this.trace = []; }
  setGoal(goal) {
    this.goal = String(goal || '');
    this.trace.push({ t: Date.now(), type: 'goal', goal: this.goal });
  }
  getContextSummary() {
    return { goal: this.goal, lastSteps: this.trace.slice(-5), traceLen: this.trace.length };
  }
}

var DANGEROUS = [
  /delete|unlink|rm\b|wipe/i,
  /transfer|payment|pay\b|wire/i,
  /shutdown|exec|shell|kill/i
];
var GOAL_HINTS = [
  { goal: /погод|weather|forecast/i, tools: /weather|http\.get|search/i },
  { goal: /пицц|еда|заказ|pizza|food|order/i, tools: /http\.|search|memory|report/i },
  { goal: /памят|запомн|memory|note/i, tools: /memory\./i }
];

export class AksiPermit {
  constructor(opts) { this.policy = (opts && opts.policy) || 'strict'; }
  async verifyAction(toolRequest, exocortex, mandate) {
    var reasons = [];
    var tool = String((toolRequest && (toolRequest.tool || toolRequest.name)) || '').trim();
    var params = (toolRequest && (toolRequest.params || toolRequest.args)) || {};
    var url = (toolRequest && toolRequest.url) || params.url || null;
    var goal = (exocortex && exocortex.goal) || '';
    if (!tool) return this._out('BLOCK', toolRequest, exocortex, mandate, ['empty_tool']);
    var tc = mandate.checkTool(tool);
    if (!tc.ok) reasons.push(tc.reason);
    if (url) {
      var dc = mandate.checkDomain(url);
      if (!dc.ok) reasons.push(dc.reason);
    }
    for (var i = 0; i < DANGEROUS.length; i++) {
      if (DANGEROUS[i].test(tool) || DANGEROUS[i].test(JSON.stringify(params))) {
        reasons.push('dangerous_pattern');
        break;
      }
    }
    if (goal && this.policy === 'strict') {
      for (var j = 0; j < GOAL_HINTS.length; j++) {
        if (GOAL_HINTS[j].goal.test(goal) && !GOAL_HINTS[j].tools.test(tool)) {
          reasons.push('intent_mismatch:goal_vs_tool');
          break;
        }
      }
      if (/пицц|pizza/i.test(goal) && /file\.|shell|delete|payment/i.test(tool)) {
        reasons.push('intent_mismatch:goal_vs_tool');
      }
    }
    if (reasons.length) return this._out('BLOCK', toolRequest, exocortex, mandate, reasons);
    return this._out('ALLOW', toolRequest, exocortex, mandate, ['mandate_ok', 'intent_ok']);
  }
  async _out(gate, toolRequest, exocortex, mandate, reasons) {
    var receipt = await createReceipt(
      gate, toolRequest,
      exocortex ? exocortex.getContextSummary() : {},
      reasons, mandate.getPolicy()
    );
    return { gate: gate, reasons: reasons, receipt: receipt };
  }
}

export class SecurityBlockedError extends Error {
  constructor(message, result) {
    super(message);
    this.name = 'SecurityBlockedError';
    this.result = result;
    this.receipt = result && result.receipt;
  }
}

export class AksiKernel {
  constructor(manifest) {
    this.mandate = new MandateManager(manifest);
    this.exocortex = new Exocortex();
    this.permit = new AksiPermit({ policy: this.mandate.getPolicy() });
    this.receipts = [];
  }
  status() {
    return {
      policy: this.mandate.getPolicy(),
      receipts: this.receipts.length,
      goal: this.exocortex.goal || null
    };
  }
  async executeAgentStep(userGoal, proposedToolCall) {
    this.exocortex.setGoal(userGoal);
    var result = await this.permit.verifyAction(
      proposedToolCall, this.exocortex, this.mandate
    );
    this.receipts.push(result.receipt);
    var verify = await offlineVerifyReceipt(result.receipt);
    if (result.gate === 'BLOCK') {
      throw new SecurityBlockedError(
        'AKSI BLOCK: ' + (result.reasons || []).join('; '),
        Object.assign({}, result, { verify: verify })
      );
    }
    return {
      gate: 'ALLOW',
      toolResult: { ok: true, simulated: true, tool: proposedToolCall.tool },
      receipt: result.receipt,
      verify: verify,
      reasons: result.reasons
    };
  }

  /** Wrap a real function — only runs if ALLOW */
  wrapTool(toolName, fn) {
    var self = this;
    return async function (userGoal, params) {
      params = params || {};
      var step = await self.executeAgentStep(userGoal, {
        tool: toolName,
        params: params,
        url: params.url,
        amount: params.amount
      });
      var out = await fn(params);
      return Object.assign({}, step, { toolResult: out });
    };
  }
}

/** Built-in self-test — returns { pass, results[] } */
export async function runSelfTest() {
  var results = [];
  var k = new AksiKernel();
  function ok(name, cond, detail) {
    results.push({ name: name, pass: !!cond, detail: detail || '' });
  }
  try {
    var a = await k.executeAgentStep('Узнай погоду', {
      tool: 'weather.fetch', url: 'https://wttr.in/Moscow'
    });
    ok('ALLOW weather', a.gate === 'ALLOW' && a.verify && a.verify.ok, a.gate);
  } catch (e) {
    ok('ALLOW weather', false, String(e.message || e));
  }
  try {
    await k.executeAgentStep('Заказать пиццу', {
      tool: 'file.delete', params: { path: '/etc/passwd' }
    });
    ok('BLOCK delete', false, 'should throw');
  } catch (e) {
    ok('BLOCK delete', e.name === 'SecurityBlockedError', e.name);
  }
  try {
    await k.executeAgentStep('Узнай погоду', {
      tool: 'http.get', url: 'https://evil.example/x'
    });
    ok('BLOCK domain', false, 'should throw');
  } catch (e) {
    ok('BLOCK domain', e.name === 'SecurityBlockedError', e.name);
  }
  try {
    var r = k.receipts[k.receipts.length - 1];
    var v = await offlineVerifyReceipt(r);
    ok('VERIFY receipt', v.ok, JSON.stringify(v));
  } catch (e) {
    ok('VERIFY receipt', false, String(e.message || e));
  }
  var pass = results.every(function (x) { return x.pass; });
  return { pass: pass, results: results, version: '1.1' };
}

export default {
  AksiKernel, AksiPermit, MandateManager, Exocortex,
  SecurityBlockedError, offlineVerifyReceipt, runSelfTest
};
