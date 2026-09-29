/**
 * AKSI MandateManager — loads and evaluates agent permission manifest.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class MandateManager {
  constructor(source) {
    if (typeof source === 'object' && source !== null) {
      this.manifest = structuredClone(source);
    } else {
      const path = source || join(__dirname, '../manifest/agent-manifest.json');
      if (!existsSync(path)) {
        throw new Error(`MandateManager: manifest not found at ${path}`);
      }
      this.manifest = JSON.parse(readFileSync(path, 'utf8'));
    }
    this._validate();
  }

  _validate() {
    const m = this.manifest;
    if (!m || !Array.isArray(m.allowed_tools)) {
      throw new Error('MandateManager: invalid manifest — allowed_tools required');
    }
    m.denied_tools = m.denied_tools || [];
    m.allowed_domains = m.allowed_domains || [];
    m.allowed_syscalls = m.allowed_syscalls || [];
    m.limits = m.limits || {};
    m.policy = m.policy || 'strict';
  }

  getManifest() {
    return structuredClone(this.manifest);
  }

  getPolicy() {
    return this.manifest.policy;
  }

  getLimits() {
    return { ...this.manifest.limits };
  }

  checkTool(toolName) {
    const name = String(toolName || '').trim().toLowerCase();
    if (!name) return { ok: false, reason: 'empty_tool' };
    const denied = this.manifest.denied_tools.map((t) => t.toLowerCase());
    if (denied.includes(name)) {
      return { ok: false, reason: `tool_denied:${name}` };
    }
    const allowed = this.manifest.allowed_tools.map((t) => t.toLowerCase());
    if (!allowed.includes(name)) {
      return { ok: false, reason: `tool_not_in_manifest:${name}` };
    }
    return { ok: true };
  }

  checkDomain(urlOrHost) {
    if (!urlOrHost) return { ok: true };
    let host = String(urlOrHost);
    try {
      if (host.includes('://')) host = new URL(host).hostname;
    } catch {
      /* keep */
    }
    host = host.toLowerCase().replace(/^www\./, '');
    const allowed = this.manifest.allowed_domains.map((d) => d.toLowerCase());
    const ok = allowed.some((d) => host === d || host.endsWith('.' + d));
    return ok ? { ok: true } : { ok: false, reason: `domain_not_allowed:${host}` };
  }

  checkSyscall(name) {
    const n = String(name || '').toLowerCase();
    const list = this.manifest.allowed_syscalls.map((s) => s.toLowerCase());
    if (!list.includes(n)) return { ok: false, reason: `syscall_denied:${n}` };
    return { ok: true };
  }

  checkSpend(amount) {
    const max = Number(this.manifest.limits.max_spend ?? Infinity);
    const a = Number(amount) || 0;
    if (a > max) return { ok: false, reason: `spend_limit:${a}>${max}` };
    return { ok: true };
  }
}

export default MandateManager;
