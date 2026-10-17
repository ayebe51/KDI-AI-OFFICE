// ==========================================================
// services/api/src/engineering/phase30/phase30-dry-run.test.ts
// Phase 30.2: Local Controller-to-Adapter-to-Executor Dry-Run Test (§16)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as os from 'os';
import { Phase30Controller } from './phase30-controller.js';
import { ReleaseRegistryService } from './release-registry.service.js';
import { Phase30AuditService } from './phase30-audit.service.js';

describe('Phase 30.2: Local Execution Boundary Dry-Run (§16)', () => {
  test('Dry-Run: Executes complete call path with zero mutation and verified audit trail', async () => {
    const tmpStorage = path.join(os.tmpdir(), `kdi-p30-dryrun-reg-${Date.now()}.json`);
    const tmpAudit = path.join(os.tmpdir(), `kdi-p30-dryrun-audit-${Date.now()}.jsonl`);

    const releaseRegistry = new ReleaseRegistryService({ storageFilePath: tmpStorage });
    const auditService = new Phase30AuditService({ ledgerFilePath: tmpAudit });

    // 1. Pre-register verified baseline release to serve as explicit rollback target
    const baseline = releaseRegistry.registerRelease({
      releaseId: 'rel_kdi_v1.0.0_baseline',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN',
      version: '1.0.0',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '0'.repeat(64),
    });
    releaseRegistry.updateReleaseStatus(baseline.releaseId, 'ACTIVE');

    const controller = new Phase30Controller(
      undefined,
      undefined,
      undefined,
      releaseRegistry,
      auditService
    );

    console.log('\n============================================================');
    console.log('KDI PHASE 30.2: LOCAL DRY-RUN EXECUTION TEST');
    console.log('============================================================');

    // 2. Dispatch real dry run execution request
    const result = await controller.handleReleaseRequest({
      requestId: 'req_dry_run_001',
      project: 'KDI',
      service: 'kdi-agent-platform',
      environment: 'LOCAL_DRY_RUN',
      targetId: 'tgt_kdi_local_dry_run',
      version: '1.0.1',
      commitSha: '5242855146b341974a1946947d640e253ce20c00',
      artifactDigestSha256: '1'.repeat(64),
      rollbackTargetReleaseId: 'rel_kdi_v1.0.0_baseline',
      changedFiles: ['services/api/src/engineering/phase30/phase30-policy.ts'],
      isDryRun: true,
      callerIdentity: 'autonomous-engineer-dry-run',
    });

    console.log(`  ✔ Request ID:        ${result.requestId}`);
    console.log(`  ✔ Release ID:        ${result.releaseId}`);
    console.log(`  ✔ Target ID:         ${result.targetId}`);
    console.log(`  ✔ Risk Level:        ${result.riskAssessment.riskLevel}`);
    console.log(`  ✔ Blast Radius:      ${result.riskAssessment.blastRadius}`);
    console.log(`  ✔ Policy Allowed:    ${result.policyEvaluation.allowed}`);
    console.log(`  ✔ Final State:       ${result.finalState}`);
    console.log(`  ✔ Telemetry Status:  ${result.telemetryObservation.status}`);
    console.log(`  ✔ Operation:         ${result.executedOperation}`);
    console.log(`  ✔ Duration:          ${result.durationMs}ms`);
    console.log(`  ✔ Audit Trail:       ${result.auditTrailEvents.join('; ')}`);
    console.log('============================================================\n');

    // 3. Assertions
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.finalState, 'STAGED');
    assert.strictEqual(result.riskAssessment.riskLevel, 'HIGH'); // modified policy/guard file
    assert.strictEqual(result.policyEvaluation.allowed, true);
    assert.strictEqual(result.telemetryObservation.status, 'HEALTHY');
    assert.strictEqual(result.executedOperation, 'EXECUTE_DRY_RUN');

    // 4. Verify Release Registry persistence
    const savedRelease = releaseRegistry.getRelease(result.releaseId);
    assert.strictEqual(savedRelease.status, 'STAGED');
    assert.strictEqual(savedRelease.rollbackTargetReleaseId, 'rel_kdi_v1.0.0_baseline');

    // 5. Verify Audit Persistence & SHA-256 Chaining
    const auditEvents = auditService.getEvents();
    assert.ok(auditEvents.length >= 2, 'Must record audit events');
    const integrity = auditService.verifyLedgerIntegrity();
    assert.strictEqual(integrity.isValid, true, 'Audit log hash-chaining must be cryptographically intact');

    console.log('✔ Phase 30.2 Dry-run call path fully verified from Controller to Executor.\n');

    releaseRegistry.clear();
    auditService.clear();
  });
});
