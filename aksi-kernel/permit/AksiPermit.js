/**
 * AKSI Permit — fail-closed gate: mandate + contextual intent + receipt.
 */
import { createReceipt, offlineVerifyReceipt, ensureKeyPair } from '../receipt/Receipt.js';

const DANGEROUS_PATTERNS = [
  /delete|unlink|rm\b|remove|wipe|format/i,
  /transfer|wire|payment|pay\b|spend|crypto\.|bank\./i,
  /shutdown|reboot|kill|exec|shell/i,
  /exfil|leak|steal/i,
];

const GOAL_TOOL_HINTS = [
  { goal: /погод|weather|forecast|температур/i, tools: /weather|http\.get|search/i },
  { goal: /пицц|еда|заказ|купить еду|food|pizza|order/i, tools: /http\.(get|post)|search|memory/i },
  { goal: /памят|запомн|memory|note|запис/i, tools: /memory\./i },
  { goal: /поиск|search|найди|wikipedia/i, tools: /search|http\.get|memory\.read/i },
  { goal: /прочит|read|файл|file/i, tools: /file\.read|memory\.read|http\.get/i },
];

export class AksiPermit {
  constructor(options = {}) {
    this.defaultPolicy = options.policy || 'strict';
    ensureKeyPair();
  }

  verifyAction(toolRequest, exocortex, mandateManager) {
    const policy = mandateManager.getPolicy?.() || this.defaultPolicy;
    const tool = String(toolRequest?.tool || toolRequest?.name || '').trim();
    const params = toolRequest?.params || toolRequest?.args || {};
    const url = toolRequest?.url || params.url || params.endpoint || null;
    const amount = toolRequest?.amount ?? params.amount ?? params.spend ?? null;

    if (!tool) {
      return this._block(toolRequest, exocortex, mandateManager, ['empty_tool'], policy);
    }

    const toolCheck = mandateManager.checkTool(tool);
    if (!toolCheck.ok) {
      return this._block(toolRequest, exocortex, mandateManager, [toolCheck.reason], policy);
    }

    if (/^http\.|weather\.|search\./i.test(tool) && url) {
      const dom = mandateManager.checkDomain(url);
      if (!dom.ok) {
        return this._block(toolRequest, exocortex, mandateManager, [dom.reason], policy);
      }
    }

    if (amount != null) {
      const sp = mandateManager.checkSpend(amount);
      if (!sp.ok) {
        return this._block(toolRequest, exocortex, mandateManager, [sp.reason], policy);
      }
    }

    const ctx = exocortex.getContextSummary();
    const goal = ctx.userGoal || '';
    const intent = this._intentCheck(goal, tool, toolRequest);
    if (!intent.ok) {
      return this._block(toolRequest, exocortex, mandateManager, intent.reasons, policy);
    }

    if (this._isDangerous(tool, toolRequest) && !this._goalAllowsDanger(goal, tool)) {
      return this._block(
        toolRequest,
        exocortex,
        mandateManager,
        ['dangerous_action_vs_goal', `goal=${goal.slice(0, 80)}`, `tool=${tool}`],
        policy
      );
    }

    return this._allow(toolRequest, exocortex, mandateManager, ['mandate_ok', 'intent_ok'], policy);
  }

  _intentCheck(goal, tool, toolRequest) {
    if (!goal) {
      if (/^memory\./i.test(tool)) return { ok: true };
      return { ok: false, reasons: ['no_user_goal'] };
    }
    for (const hint of GOAL_TOOL_HINTS) {
      if (hint.goal.test(goal)) {
        if (!hint.tools.test(tool)) {
          if (/^memory\./i.test(tool)) continue;
          return {
            ok: false,
            reasons: ['intent_mismatch', `goal_pattern=${hint.goal}`, `tool=${tool}`],
          };
        }
        return { ok: true };
      }
    }
    const blob = tool + JSON.stringify(toolRequest || {});
    if (/перевод|деньг|bitcoin|wallet/i.test(blob)) {
      if (!/оплат|перевод|money|pay|buy|купить/i.test(goal)) {
        return { ok: false, reasons: ['financial_intent_mismatch'] };
      }
    }
    return { ok: true };
  }

  _isDangerous(tool, toolRequest) {
    const blob = `${tool} ${JSON.stringify(toolRequest || {})}`;
    return DANGEROUS_PATTERNS.some((re) => re.test(blob));
  }

  _goalAllowsDanger(goal) {
    return /allow.?danger|lab.?mode/i.test(goal || '');
  }

  _allow(toolRequest, exocortex, mandateManager, reasons, policy) {
    const receipt = createReceipt({
      toolRequest,
      contextFingerprint: exocortex.contextFingerprint(),
      gate: 'ALLOW',
      reasons,
      policy,
      sessionId: exocortex.sessionId,
    });
    return { allowed: true, gate: 'ALLOW', reasons, policy, receipt, toolRequest };
  }

  _block(toolRequest, exocortex, mandateManager, reasons, policy) {
    const receipt = createReceipt({
      toolRequest,
      contextFingerprint: exocortex.contextFingerprint(),
      gate: 'BLOCK',
      reasons,
      policy,
      sessionId: exocortex.sessionId,
    });
    return { allowed: false, gate: 'BLOCK', reasons, policy, receipt, toolRequest };
  }
}

export { offlineVerifyReceipt };
export default AksiPermit;
