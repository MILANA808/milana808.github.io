/**
 * AKSI Kernel — orchestrates Mandate → Exocortex → Permit → Receipts → Tool.
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MandateManager } from '../mandate/MandateManager.js';
import { Exocortex } from '../exocortex/Exocortex.js';
import { AksiPermit, offlineVerifyReceipt } from '../permit/AksiPermit.js';
import { createReceipt, ensureKeyPair } from '../receipt/Receipt.js';
import { ResultVerifier } from '../verify/ResultVerifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECEIPTS_DIR = join(__dirname, '../receipts');

export class SecurityBlockedError extends Error {
  constructor(result) {
    super(`AKSI Security BLOCK: ${(result.reasons || []).join(', ')}`);
    this.name = 'SecurityBlockedError';
    this.result = result;
    this.gate = 'BLOCK';
    this.receipt = result.receipt;
  }
}

export class AksiKernel {
  constructor(opts = {}) {
    ensureKeyPair();
    this.mandate = new MandateManager(opts.manifest);
    this.exocortex = new Exocortex(opts.sessionId);
    this.permit = new AksiPermit({ policy: this.mandate.getPolicy() });
    this.receiptLog = [];
    this.resultVerifier = new ResultVerifier();
    if (!existsSync(RECEIPTS_DIR)) mkdirSync(RECEIPTS_DIR, { recursive: true });
  }

  async executeAgentStep(userGoal, proposedToolCall, options = {}) {
    if (userGoal) this.exocortex.setGoal(userGoal);

    this.exocortex.addThought('propose', {
      tool: proposedToolCall?.tool,
      note: JSON.stringify(proposedToolCall?.params || {}).slice(0, 120),
    });

    const decision = this.permit.verifyAction(
      proposedToolCall,
      this.exocortex,
      this.mandate
    );

    this._storeReceipt(decision.receipt);
    this.exocortex.addThought('gate', {
      tool: proposedToolCall?.tool,
      gate: decision.gate,
      note: (decision.reasons || []).join('|'),
    });

    if (!decision.allowed) {
      throw new SecurityBlockedError(decision);
    }

    if (options.mode === 'real' && typeof options.executor !== 'function') {
      throw new Error('AKSI real execution requires an explicit executor');
    }

    const toolResult = typeof options.executor === 'function'
      ? await options.executor(proposedToolCall)
      : this._simulateTool(proposedToolCall);
    const verification = options.expectedResult !== undefined
      ? this.resultVerifier.verify(options.expectedResult, toolResult)
      : { status: 'NOT_REQUESTED', reason: 'no_expected_result' };
    const executionReceipt = createReceipt({
      toolRequest: proposedToolCall,
      contextFingerprint: this.exocortex.contextFingerprint(),
      gate: 'ALLOW',
      reasons: ['execution_complete', verification.status.toLowerCase()],
      policy: this.mandate.getPolicy(),
      sessionId: this.exocortex.sessionId,
      expectedResult: options.expectedResult,
      actualResult: toolResult,
      verification,
    });
    this._storeReceipt(executionReceipt);
    this.exocortex.addThought('execute', {
      tool: proposedToolCall?.tool,
      note: String(toolResult).slice(0, 160),
    });

    return {
      ok: true,
      gate: 'ALLOW',
      tool: proposedToolCall?.tool,
      toolResult,
      receipt: decision.receipt,
      executionReceipt,
      verification,
      context: this.exocortex.getContextSummary(),
      verify: offlineVerifyReceipt(decision.receipt),
    };
  }

  _simulateTool(call) {
    const tool = call?.tool || 'unknown';
    const params = call?.params || {};
    if (tool === 'weather.fetch' || tool === 'http.get') {
      const q = params.city || params.q || call?.url || 'local';
      return { simulated: true, tool, data: { location: q, temp_c: 18, condition: 'clear', source: 'offline-sim' } };
    }
    if (tool === 'memory.write') {
      return { simulated: true, tool, stored: params.value || params.text || true };
    }
    if (tool === 'memory.read') {
      return { simulated: true, tool, value: this.exocortex.getGoal() };
    }
    if (tool === 'search.web') {
      return { simulated: true, tool, hits: [{ title: 'offline stub', q: params.q }] };
    }
    if (tool === 'file.read') {
      return { simulated: true, tool, path: params.path, content: '[offline simulated read]' };
    }
    return { simulated: true, tool, params };
  }

  _storeReceipt(receipt) {
    this.receiptLog.push(receipt);
    const file = join(RECEIPTS_DIR, `${receipt.id}.json`);
    writeFileSync(file, JSON.stringify(receipt, null, 2), 'utf8');
  }

  listReceipts() {
    if (!existsSync(RECEIPTS_DIR)) return [];
    return readdirSync(RECEIPTS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(RECEIPTS_DIR, f), 'utf8')));
  }

  getPublicKeyPem() {
    return ensureKeyPair().publicKeyPem;
  }

  status() {
    return {
      agent: this.mandate.manifest.agent_id,
      policy: this.mandate.getPolicy(),
      session: this.exocortex.sessionId,
      goal: this.exocortex.getGoal(),
      receipts: this.receiptLog.length,
      principle: 'technology_serves_human',
    };
  }
}

export default AksiKernel;
