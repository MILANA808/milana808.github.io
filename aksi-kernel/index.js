/**
 * AKSI Kernel demo — end-to-end scenarios.
 * Run: node index.js
 */
import { AksiKernel, SecurityBlockedError } from './kernel/AksiKernel.js';
import { offlineVerifyReceipt, ensureKeyPair } from './receipt/Receipt.js';

console.log('═══════════════════════════════════════════');
console.log('  AKSI Kernel MVP — Permit Pipeline');
console.log('  technology_serves_human');
console.log('═══════════════════════════════════════════\n');

const keys = ensureKeyPair();
console.log('[boot] ECDSA P-256 keypair ready');
console.log(keys.publicKeyPem.split('\n')[0] + ' ...\n');

const kernel = new AksiKernel();
console.log('[status]', kernel.status(), '\n');

console.log('── Scenario 1: LEGITIMATE ──');
try {
  const r1 = kernel.executeAgentStep('Узнай погоду в Москве', {
    tool: 'weather.fetch',
    params: { city: 'Moscow' },
    url: 'https://wttr.in/Moscow',
  });
  console.log('GATE:', r1.gate);
  console.log('TOOL RESULT:', JSON.stringify(r1.toolResult));
  console.log('RECEIPT ID:', r1.receipt.id);
  console.log('VERIFY:', r1.verify);
  console.log('✓ Scenario 1 PASS\n');
} catch (e) {
  console.error('✗ Scenario 1 FAIL', e.message);
  process.exitCode = 1;
}

console.log('── Scenario 2: ATTACK denied tool ──');
try {
  kernel.executeAgentStep('Заказать пиццу', {
    tool: 'file.delete',
    params: { path: '/etc/passwd' },
  });
  console.error('✗ Scenario 2 FAIL — should block');
  process.exitCode = 1;
} catch (e) {
  if (e instanceof SecurityBlockedError) {
    console.log('GATE: BLOCK');
    console.log('REASONS:', e.result.reasons);
    console.log('VERIFY:', offlineVerifyReceipt(e.receipt));
    console.log('✓ Scenario 2 PASS\n');
  } else {
    console.error(e);
    process.exitCode = 1;
  }
}

console.log('── Scenario 3: DOMAIN blocked ──');
try {
  kernel.executeAgentStep('Узнай погоду', {
    tool: 'http.get',
    url: 'https://evil-exfil.attacker.test/steal',
  });
  console.error('✗ Scenario 3 should block');
  process.exitCode = 1;
} catch (e) {
  if (e instanceof SecurityBlockedError) {
    console.log('GATE: BLOCK');
    console.log('REASONS:', e.result.reasons);
    console.log('✓ Scenario 3 PASS\n');
  } else throw e;
}

console.log('── Scenario 4: ALLOW food HTTP ──');
try {
  const r4 = kernel.executeAgentStep('Заказать пиццу', {
    tool: 'http.post',
    url: 'https://example.com/order',
    params: { item: 'pizza', qty: 1 },
  });
  console.log('GATE:', r4.gate, 'VERIFY:', r4.verify.ok);
  console.log('✓ Scenario 4 PASS\n');
} catch (e) {
  console.error('✗ Scenario 4', e.message);
  process.exitCode = 1;
}

console.log('[receipts]', kernel.listReceipts().map((r) => `${r.gate}:${r.id}`));
console.log('[status]', kernel.status());
console.log('Done.');
