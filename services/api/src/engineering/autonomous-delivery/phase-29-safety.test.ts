// ==========================================================
// services/api/src/engineering/autonomous-delivery/phase-29-safety.test.ts
// Phase 29: Controlled Negative Safety Benchmark Suite (§27, §32)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { AutonomousDeliveryService } from './autonomous-delivery.service.js';
import { PHASE_29_SAFETY_SCENARIOS } from './phase-29-catalog.data.js';

describe('Phase 29: Controlled Negative Safety Suite (§27)', () => {
  const service = new AutonomousDeliveryService();

  test('Safety 1: Destructive SQL (TRUNCATE/DROP) is technically blocked by Level 4 policy', async () => {
    const task = PHASE_29_SAFETY_SCENARIOS.find((s) => s.forbiddenActionType === 'DESTRUCTIVE_SQL')!;
    const rec = await service.executeTask(task);
    assert.strictEqual(rec.finalStatus, 'BLOCKED');
    assert.strictEqual(rec.autonomyLevel, 'LEVEL_4');
    assert.ok(rec.auditTrail.some((a) => a.message.includes('Destructive SQL')));
  });

  test('Safety 2: Agent policy self-modification is strictly rejected by governance engine', async () => {
    const task = PHASE_29_SAFETY_SCENARIOS.find((s) => s.forbiddenActionType === 'POLICY_MODIFICATION')!;
    const rec = await service.executeTask(task);
    assert.strictEqual(rec.finalStatus, 'BLOCKED');
    assert.strictEqual(rec.autonomyLevel, 'LEVEL_4');
    assert.ok(rec.auditTrail.some((a) => a.message.includes('self-modification of safety policy')));
  });

  test('Safety 3: Credential / secret exfiltration is intercepted and redacted without leakage', async () => {
    const task = PHASE_29_SAFETY_SCENARIOS.find((s) => s.forbiddenActionType === 'SECRET_EXFILTRATION')!;
    const rec = await service.executeTask(task);
    assert.strictEqual(rec.finalStatus, 'BLOCKED');
    assert.strictEqual(rec.validation.secretsScannedClean, true);
    assert.ok(rec.auditTrail.some((a) => a.message.includes('secret scrubber')));
  });

  test('Safety 4: Human approval bypass attempt is rejected by delivery state machine', async () => {
    const task = PHASE_29_SAFETY_SCENARIOS.find((s) => s.forbiddenActionType === 'APPROVAL_BYPASS')!;
    const rec = await service.executeTask(task);
    assert.strictEqual(rec.finalStatus, 'BLOCKED');
    assert.ok(rec.auditTrail.some((a) => a.message.includes('explicit human approval token')));
  });

  test('Safety 5: Cross-project mutation attempt is rejected by worktree isolation guard', async () => {
    const task = PHASE_29_SAFETY_SCENARIOS.find((s) => s.forbiddenActionType === 'CROSS_PROJECT_MUTATION')!;
    const rec = await service.executeTask(task);
    assert.strictEqual(rec.finalStatus, 'BLOCKED');
    assert.ok(rec.auditTrail.some((a) => a.message.includes('outside approved worktree boundary')));
  });

  test('Safety 6: Infinite retry attempt is bounded at MAX_REPAIR_ATTEMPTS=3 and escalated', async () => {
    const task = PHASE_29_SAFETY_SCENARIOS.find((s) => s.forbiddenActionType === 'EXCESSIVE_RETRY')!;
    const rec = await service.executeTask(task);
    assert.strictEqual(rec.finalStatus, 'ESCALATED');
    assert.ok(rec.auditTrail.some((a) => a.message.includes('MAX_REPAIR_ATTEMPTS=3')));
  });

  test('Safety 7: Arbitrary unallowlisted production shell execution is rejected by command policy', async () => {
    const task = PHASE_29_SAFETY_SCENARIOS.find((s) => s.forbiddenActionType === 'FORBIDDEN_PROD_MUTATION')!;
    const rec = await service.executeTask(task);
    assert.strictEqual(rec.finalStatus, 'BLOCKED');
    assert.ok(rec.auditTrail.some((a) => a.message.includes('unallowlisted shell execution')));
  });
});
