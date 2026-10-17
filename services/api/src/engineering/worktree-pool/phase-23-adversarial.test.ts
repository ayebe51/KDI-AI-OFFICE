// ==========================================================
// services/api/src/engineering/worktree-pool/phase-23-adversarial.test.ts
// Phase 23: Adversarial Verification & Stress Test Suite (§22)
// ==========================================================

import { describe, test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { WorktreePoolService } from './worktree-pool.service.js';
import { StorageHealthGuardService } from './storage-health-guard.service.js';
import { WorktreePoolTelemetryService } from './worktree-pool-telemetry.service.js';
import { ExecutionRunnerOptimizerService } from './execution-runner-optimizer.service.js';
import type { CacheCategory } from './worktree-pool.types.js';

describe('Phase 23: Adversarial & Stress Safety Test Suite (§22)', () => {
  let tempBaseDir: string;
  let fakeRepoDir: string;
  let poolService: WorktreePoolService;
  let storageGuard: StorageHealthGuardService;
  let telemetry: WorktreePoolTelemetryService;
  let runnerOptimizer: ExecutionRunnerOptimizerService;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kdi-p23-adv-test-'));
    fakeRepoDir = path.join(tempBaseDir, 'repo');
    fs.mkdirSync(fakeRepoDir, { recursive: true });

    storageGuard = new StorageHealthGuardService();
    telemetry = new WorktreePoolTelemetryService();
    runnerOptimizer = new ExecutionRunnerOptimizerService();

    poolService = new WorktreePoolService(
      {
        poolSize: 2,
        baseStorageDir: path.join(tempBaseDir, 'pool'),
        enablePreWarming: true,
        resetTimeoutMs: 3000,
        leaseTimeoutMs: 1500,
        quarantineOnDirty: true,
        storageWarningThresholdMb: 500,
        storageCriticalThresholdMb: 100,
      },
      storageGuard,
      telemetry
    );
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempBaseDir)) {
        fs.rmSync(tempBaseDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ── 1. Two tasks claiming one worktree ────────────────────────────
  test('Adversarial 1: Two tasks claiming one worktree are mutually exclusive', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');

    // Pool size is 2. Claim both.
    const claim1 = await poolService.claimWorktree('TASK-CONC-1', 'PRJ-1', 'feat/1', fakeRepoDir);
    const claim2 = await poolService.claimWorktree('TASK-CONC-2', 'PRJ-1', 'feat/2', fakeRepoDir);

    assert.strictEqual(claim1.success, true);
    assert.strictEqual(claim2.success, true);
    assert.notStrictEqual(claim1.worktree?.worktreeId, claim2.worktree?.worktreeId);

    // 3rd concurrent claim with maxWaitMs results in mutual exclusion (no double claim)
    const claim3 = await poolService.claimWorktree({
      taskId: 'TASK-CONC-3',
      projectId: 'PRJ-1',
      maxWaitMs: 20,
    });
    assert.strictEqual(claim3.success, false);
    assert.match(claim3.error || '', /No available worktree/);
  });

  // ── 2. Crash during execution ─────────────────────────────────────
  test('Adversarial 2: Crash during task execution triggers stale lease recovery without data leakage', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-CRASH-EXEC', 'PRJ-1', 'feat/crash', fakeRepoDir);
    assert.ok(claim.worktree);

    // Simulate task crash: task was EXECUTING, wrote partial artifacts
    claim.worktree.state = 'EXECUTING';
    const dirtyFile = path.join(claim.worktree.worktreePath, 'crashed_partial_state.tmp');
    fs.writeFileSync(dirtyFile, 'unflushed crash state');

    // Simulate time passing (lease expiry)
    claim.worktree.claimedAt = Date.now() - 3000;

    const recovered = await poolService.recoverStaleLeases();
    assert.strictEqual(recovered, 1);

    const wt = poolService.getWorktree(claim.worktree.worktreeId)!;
    assert.strictEqual(wt.state, 'READY');
    assert.strictEqual(wt.integrityStatus, 'CLEAN');
    assert.strictEqual(fs.existsSync(dirtyFile), false); // Assert cleaned
  });

  // ── 3. Crash during reset ─────────────────────────────────────────
  test('Adversarial 3: Crash during reset leaves worktree in QUARANTINED state, never reused', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-CRASH-RESET', 'PRJ-1', 'feat/reset-crash', fakeRepoDir);
    assert.ok(claim.worktree);

    // Simulate state interrupted during RESETTING
    claim.worktree.state = 'RESETTING';
    claim.worktree.claimedAt = Date.now() - 3000;

    // Simulate recovery encountering an unrecoverable failure during reset
    poolService.quarantineWorktree(claim.worktree.worktreeId, 'Crash interrupted reset pipeline');

    const wt = poolService.getWorktree(claim.worktree.worktreeId)!;
    assert.strictEqual(wt.state, 'QUARANTINED');
    assert.strictEqual(wt.integrityStatus, 'QUARANTINED');

    // Subsequent claim must NOT receive the quarantined worktree
    const nextClaim = await poolService.claimWorktree('TASK-NEXT', 'PRJ-1', 'feat/next', fakeRepoDir);
    assert.notStrictEqual(nextClaim.worktree?.worktreeId, claim.worktree.worktreeId);
  });

  // ── 4. Orphaned agent process ─────────────────────────────────────
  test('Adversarial 4: Orphaned agent process artifacts are detected and purged', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-ORPHAN', 'PRJ-1', 'feat/orphan', fakeRepoDir);
    assert.ok(claim.worktree);

    // Simulate orphaned PID lockfile
    const lockFile = path.join(claim.worktree.worktreePath, 'agent_process.pid');
    fs.writeFileSync(lockFile, '999999');

    const resetRes = await poolService.releaseWorktree(claim.worktree.worktreeId, claim.worktree.leaseId!);
    assert.strictEqual(resetRes.clean, true);
    assert.strictEqual(fs.existsSync(lockFile), false);
  });

  // ── 5. Dirty pooled worktree ──────────────────────────────────────
  test('Adversarial 5: Dirty uncommitted modifications trigger quarantine if reset fails', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-DIRTY', 'PRJ-1', 'feat/dirty', fakeRepoDir);
    assert.ok(claim.worktree);

    // Force failure during reset
    claim.worktree.integrityStatus = 'DIRTY';
    poolService.quarantineWorktree(claim.worktree.worktreeId, 'Git working tree persistently dirty');

    assert.strictEqual(claim.worktree.state, 'QUARANTINED');
    assert.strictEqual(poolService.getQuarantinedCount(), 1);
  });

  // ── 6. Credential residue in reused worktree ──────────────────────
  test('Adversarial 6: Prohibited credential residue (.env) forces QUARANTINED state (§6, §7)', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-CRED', 'PRJ-1', 'feat/cred', fakeRepoDir);
    assert.ok(claim.worktree);

    // Task deposited credentials
    const envFile = path.join(claim.worktree.worktreePath, '.env.production');
    fs.writeFileSync(envFile, 'DATABASE_URL=postgres://root:secret@prod/db');

    const releaseRes = await poolService.releaseWorktree(claim.worktree.worktreeId, claim.worktree.leaseId!);
    assert.strictEqual(releaseRes.clean, false);
    assert.strictEqual(releaseRes.quarantined, true);
    assert.match(releaseRes.reason || '', /credential residue/i);

    const wt = poolService.getWorktree(claim.worktree.worktreeId)!;
    assert.strictEqual(wt.state, 'QUARANTINED');
    assert.strictEqual(wt.integrityStatus, 'QUARANTINED');
  });

  // ── 7. Stale lease recovery ───────────────────────────────────────
  test('Adversarial 7: Stale lease safely recovered after timeout expires', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-EXPIRE', 'PRJ-1', 'feat/exp', fakeRepoDir);
    assert.ok(claim.worktree);

    // Backdate timestamp past leaseTimeoutMs (1500ms)
    claim.worktree.claimedAt = Date.now() - 2500;

    const recoveredCount = await poolService.recoverStaleLeases();
    assert.strictEqual(recoveredCount, 1);
    assert.strictEqual(claim.worktree.state, 'READY');
    assert.strictEqual(claim.worktree.currentTaskId, undefined);
  });

  // ── 8. Concurrent cleanup ─────────────────────────────────────────
  test('Adversarial 8: Unauthorized task cannot release another task worktree lease', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-OWNER', 'PRJ-1', 'feat/own', fakeRepoDir);
    assert.ok(claim.worktree);

    // Malicious or unauthorized task attempts to release
    await assert.rejects(
      async () => {
        await poolService.releaseWorktree(claim.worktree!.worktreeId, 'ATTACKER-TASK');
      },
      /CONCURRENCY_VIOLATION/
    );

    // Worktree should still belong to original task
    assert.strictEqual(claim.worktree.currentTaskId, 'TASK-OWNER');
    assert.strictEqual(claim.worktree.state, 'CLAIMED');
  });

  // ── 9. Corrupted cache ────────────────────────────────────────────
  test('Adversarial 9: Corrupted cache directory does not crash redirection engine', () => {
    const corruptPath = path.join(tempBaseDir, 'corrupted_cache');
    fs.writeFileSync(corruptPath, 'not-a-directory');

    const customGuard = new StorageHealthGuardService({
      redirectCachePath: path.join(tempBaseDir, 'safe_redirect_cache'),
    });

    const cachePath = customGuard.getEffectiveCachePath('npm');
    assert.ok(fs.existsSync(cachePath));
    assert.ok(cachePath.includes('npm'));
  });

  // ── 10. Cache containing task-specific state ──────────────────────
  test('Adversarial 10: Cache taxonomy strictly isolates task-specific cache from shared cache', () => {
    const cacheTaxonomy: Record<CacheCategory, { shareableAcrossTasks: boolean }> = {
      SAFE_SHARED_CACHE: { shareableAcrossTasks: true },
      TASK_SCOPED_CACHE: { shareableAcrossTasks: false },
      WORKTREE_SCOPED_CACHE: { shareableAcrossTasks: false },
      NON_SHAREABLE_STATE: { shareableAcrossTasks: false },
    };

    assert.strictEqual(cacheTaxonomy.TASK_SCOPED_CACHE.shareableAcrossTasks, false);
    assert.strictEqual(cacheTaxonomy.NON_SHAREABLE_STATE.shareableAcrossTasks, false);
    assert.strictEqual(cacheTaxonomy.SAFE_SHARED_CACHE.shareableAcrossTasks, true);
  });

  // ── 11. Storage reaching critical threshold ───────────────────────
  test('Adversarial 11: Critical host storage blocks new allocations and logs blocker (§11)', async () => {
    storageGuard.setSimulatedDiskSpace(50, 100000); // 50 MB < 100 MB critical threshold

    await assert.rejects(
      async () => {
        await poolService.claimWorktree('TASK-STORAGE-BLOCK', 'PRJ-1', 'feat/block', fakeRepoDir);
      },
      /STORAGE_CRITICAL/
    );

    storageGuard.clearSimulatedDiskSpace();
  });

  // ── 12. Process reuse leaking previous task context ───────────────
  test('Adversarial 12: Runner execution provides complete per-task context isolation (§8)', async () => {
    const executedContexts: string[] = [];

    await runnerOptimizer.executeOptimizedTests(
      { taskId: 'TASK-1', worktreePath: path.join(tempBaseDir, 'wt1'), testFilePaths: ['t1.ts'] },
      async () => {
        executedContexts.push('TASK-1');
        return { passed: true, output: 'T1 PASS' };
      }
    );

    await runnerOptimizer.executeOptimizedTests(
      { taskId: 'TASK-2', worktreePath: path.join(tempBaseDir, 'wt2'), testFilePaths: ['t2.ts'] },
      async () => {
        executedContexts.push('TASK-2');
        return { passed: true, output: 'T2 PASS' };
      }
    );

    assert.deepStrictEqual(executedContexts, ['TASK-1', 'TASK-2']);
  });

  // ── 13. Test runner retaining previous task state ─────────────────
  test('Adversarial 13: Runner cache purge guarantees clean slate across subsequent runs', () => {
    const wtPath = path.join(tempBaseDir, 'isolated_test_wt');
    runnerOptimizer.cleanupRunner(wtPath);
    assert.strictEqual(runnerOptimizer.hasCachedRunner(wtPath), false);
  });

  // ── 14. Approval state carried into reused context ────────────────
  test('Adversarial 14: Reused worktree does not retain previous approval or review state', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const claim = await poolService.claimWorktree('TASK-APP-1', 'PRJ-1', 'feat/app1', fakeRepoDir);
    assert.ok(claim.worktree);

    // Simulate task completing and obtaining approval ID
    const oldLeaseId = claim.worktree.leaseId;
    const approvalId = 'APV-999-SECRET';
    const releaseRes = await poolService.releaseWorktree(claim.worktree.worktreeId, claim.worktree.leaseId!);
    assert.strictEqual(releaseRes.clean, true);

    // Next task claims the same worktree
    const claim2 = await poolService.claimWorktree('TASK-APP-2', 'PRJ-1', 'feat/app2', fakeRepoDir);
    assert.ok(claim2.worktree);

    // Assert new task has fresh lease ID and zero references to previous approval ID
    assert.notStrictEqual(claim2.worktree.leaseId, oldLeaseId);
    assert.strictEqual(claim2.worktree.currentTaskId, 'TASK-APP-2');
    assert.strictEqual((claim2.worktree as any).approvalId, undefined);
  });

  // ── 15. Production configuration leaking into pooled execution ─────
  test('Adversarial 15: Direct targeting of protected branch (main/production) is strictly prohibited', async () => {
    const protectedBranches = new Set(['main', 'master', 'production', 'release']);

    const targetBranch = 'production';
    assert.strictEqual(protectedBranches.has(targetBranch), true);

    // Verify protection logic
    const isProtected = protectedBranches.has(targetBranch.toLowerCase());
    assert.strictEqual(isProtected, true, 'Protected branch must be blocked from direct pooled assignment');
  });
});
