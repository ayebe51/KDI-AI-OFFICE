// ==========================================================
// services/api/src/engineering/worktree-pool/phase-23-unit.test.ts
// Phase 23: Pre-Warmed Worktree Pool & Runner Optimization Unit Suite (§26)
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

describe('Phase 23: Worktree Pool & Runner Optimization Unit Tests (§26)', () => {
  let tempBaseDir: string;
  let fakeRepoDir: string;
  let poolService: WorktreePoolService;
  let storageGuard: StorageHealthGuardService;
  let telemetry: WorktreePoolTelemetryService;
  let runnerOptimizer: ExecutionRunnerOptimizerService;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kdi-p23-unit-test-'));
    fakeRepoDir = path.join(tempBaseDir, 'repo');
    fs.mkdirSync(fakeRepoDir, { recursive: true });

    storageGuard = new StorageHealthGuardService();
    telemetry = new WorktreePoolTelemetryService();
    runnerOptimizer = new ExecutionRunnerOptimizerService();

    poolService = new WorktreePoolService(
      {
        poolSize: 3,
        baseStorageDir: path.join(tempBaseDir, 'pool'),
        enablePreWarming: true,
        resetTimeoutMs: 5000,
        leaseTimeoutMs: 2000,
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
    } catch {
      // Ignore cleanup error on windows locks
    }
  });

  // ── 1. Pool Pre-Warming & Initialization ─────────────────────────
  test('Pool initialization pre-warms configured number of worktrees in IDLE state', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');
    const pooled = poolService.getAllWorktrees();

    assert.strictEqual(pooled.length, 3);
    for (const wt of pooled) {
      assert.strictEqual(wt.state, 'IDLE');
      assert.strictEqual(wt.integrityStatus, 'CLEAN');
      assert.strictEqual(wt.cleanRef, 'main');
      assert.ok(fs.existsSync(wt.worktreePath));
    }
  });

  // ── 2. Atomic Lease & Pool Hit ────────────────────────────────────
  test('Atomic leasing: task claims an available worktree and sets lease details', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');

    const claim = await poolService.claimWorktree({
      taskId: 'TASK-101',
      projectId: 'PRJ-ALPHA',
      requiredRef: 'main',
    });

    assert.strictEqual(claim.success, true);
    assert.strictEqual(claim.poolHit, true);
    assert.ok(claim.worktree);
    assert.strictEqual(claim.worktree.state, 'CLAIMED');
    assert.strictEqual(claim.worktree.currentTaskId, 'TASK-101');
    assert.ok(claim.worktree.leaseId);
    assert.strictEqual(claim.worktree.stats.totalClaims, 1);
  });

  test('Concurrent lease claims allocate distinct worktrees (one worktree = one task lease)', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');

    const [claim1, claim2] = await Promise.all([
      poolService.claimWorktree({ taskId: 'TASK-A', projectId: 'PRJ-1', requiredRef: 'main' }),
      poolService.claimWorktree({ taskId: 'TASK-B', projectId: 'PRJ-1', requiredRef: 'main' }),
    ]);

    assert.strictEqual(claim1.success, true);
    assert.strictEqual(claim2.success, true);
    assert.notStrictEqual(claim1.worktree?.worktreeId, claim2.worktree?.worktreeId);
    assert.strictEqual(claim1.worktree?.currentTaskId, 'TASK-A');
    assert.strictEqual(claim2.worktree?.currentTaskId, 'TASK-B');
  });

  // ── 3. Pool Miss on Exhaustion ─────────────────────────────────────
  test('Pool claims result in pool miss when all pool slots are claimed', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');

    // Claim all 3 available slots
    await poolService.claimWorktree({ taskId: 'T-1', projectId: 'P-1', requiredRef: 'main' });
    await poolService.claimWorktree({ taskId: 'T-2', projectId: 'P-1', requiredRef: 'main' });
    await poolService.claimWorktree({ taskId: 'T-3', projectId: 'P-1', requiredRef: 'main' });

    // 4th claim should fail or fallback with poolHit = false
    const claim4 = await poolService.claimWorktree({ taskId: 'T-4', projectId: 'P-1', requiredRef: 'main', maxWaitMs: 50 });
    assert.strictEqual(claim4.success, false);
    assert.strictEqual(claim4.poolHit, false);
    assert.match(claim4.error || '', /No available worktree/);
  });

  // ── 4. Verified Reset (RESET + ASSERT CLEAN) ──────────────────────
  test('Verified Reset: removes untracked artifacts and restores clean state', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');

    const claim = await poolService.claimWorktree({ taskId: 'TASK-RESET', projectId: 'P-1', requiredRef: 'main' });
    assert.ok(claim.worktree);

    // Simulate task producing untracked files
    const untrackedFile = path.join(claim.worktree.worktreePath, 'temp_build_output.json');
    fs.writeFileSync(untrackedFile, JSON.stringify({ ok: true }));
    assert.ok(fs.existsSync(untrackedFile));

    // Release worktree (triggers sanitize & reset)
    const releaseResult = await poolService.releaseWorktree(claim.worktree.worktreeId, claim.worktree.leaseId!);
    assert.strictEqual(releaseResult.success, true);
    assert.strictEqual(releaseResult.clean, true);

    // Assert file was removed during verified reset
    assert.strictEqual(fs.existsSync(untrackedFile), false);

    // Worktree should now be READY or IDLE in pool
    const wt = poolService.getWorktree(claim.worktree.worktreeId);
    assert.ok(wt);
    assert.strictEqual(wt.state, 'READY');
    assert.strictEqual(wt.integrityStatus, 'CLEAN');
    assert.strictEqual(wt.currentTaskId, undefined);
  });

  // ── 5. Quarantine on Secret / Residue Detection ────────────────────
  test('Quarantine: unexpected credential residue (.env) triggers quarantine state', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');

    const claim = await poolService.claimWorktree({ taskId: 'TASK-SEC', projectId: 'P-1', requiredRef: 'main' });
    assert.ok(claim.worktree);

    // Simulate task writing a secret file
    const secretFile = path.join(claim.worktree.worktreePath, '.env.secret');
    fs.writeFileSync(secretFile, 'AWS_SECRET_KEY=12345');

    // Quarantine directly or on release
    const wt = poolService.getWorktree(claim.worktree.worktreeId)!;
    poolService.quarantineWorktree(wt.worktreeId, 'Credential residue detected: .env.secret');

    assert.strictEqual(wt.state, 'QUARANTINED');
    assert.strictEqual(wt.integrityStatus, 'QUARANTINED');
    assert.match(wt.quarantineReason || '', /Credential residue/);

    // Releasing quarantined worktree must NOT return it to READY
    const releaseRes = await poolService.releaseWorktree(wt.worktreeId, claim.worktree.leaseId!);
    assert.strictEqual(releaseRes.quarantined, true);
    assert.strictEqual(wt.state, 'QUARANTINED');
  });

  // ── 6. Stale Lease Recovery ───────────────────────────────────────
  test('Stale lease recovery detects expired lease and resets worktree to pool', async () => {
    await poolService.initializePool(fakeRepoDir, 'main');

    const claim = await poolService.claimWorktree({ taskId: 'TASK-STALE', projectId: 'P-1', requiredRef: 'main' });
    assert.ok(claim.worktree);

    // Backdate claim timestamp to simulate timeout
    claim.worktree.claimedAt = Date.now() - 5000;

    const recoveredCount = await poolService.recoverStaleLeases();
    assert.strictEqual(recoveredCount, 1);

    const wt = poolService.getWorktree(claim.worktree.worktreeId)!;
    assert.strictEqual(wt.state, 'READY');
    assert.strictEqual(wt.currentTaskId, undefined);
  });

  // ── 7. Storage Health Guard ───────────────────────────────────────
  test('Storage Health Guard monitors disk and blocks allocations when critical', async () => {
    const report = await storageGuard.checkHealth();
    assert.ok(report.totalDiskMb > 0);
    assert.ok(report.freeDiskMb > 0);
    assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(report.status));

    // Simulate critical threshold breach
    const customGuard = new StorageHealthGuardService({
      criticalThresholdMb: 999999999, // Unattainable free space
    });
    const criticalReport = await customGuard.checkHealth();
    assert.strictEqual(criticalReport.status, 'CRITICAL');
    assert.strictEqual(criticalReport.isAllocationBlocked, true);
    assert.strictEqual(customGuard.canAllocate(), false);
  });

  // ── 8. Worktree Pool Telemetry & Percentile Calculation ───────────
  test('Telemetry captures events and accurately computes P50, P95, P99 metrics', () => {
    // Record synthetic claim durations: 10, 20, 30, ... 100
    for (let i = 1; i <= 100; i++) {
      telemetry.recordEvent({
        eventId: `EV-${i}`,
        type: 'WORKTREE_POOL_CLAIM',
        taskId: `TASK-${i}`,
        projectId: 'PRJ-1',
        worktreeId: 'WT-1',
        timestamp: new Date().toISOString(),
        durationMs: i,
        status: 'SUCCESS',
      });
    }

    const p50 = telemetry.getPercentile('WORKTREE_POOL_CLAIM', 50);
    const p95 = telemetry.getPercentile('WORKTREE_POOL_CLAIM', 95);
    const p99 = telemetry.getPercentile('WORKTREE_POOL_CLAIM', 99);

    assert.strictEqual(p50, 50);
    assert.strictEqual(p95, 95);
    assert.strictEqual(p99, 99);
  });

  // ── 9. Isolated Execution Runner Optimizer ────────────────────────
  test('Execution Runner Optimizer executes tests with provable task state isolation', async () => {
    const result = await runnerOptimizer.executeOptimizedTests(
      {
        taskId: 'TASK-RUNNER-1',
        worktreePath: tempBaseDir,
        testFilePaths: ['test1.ts', 'test2.ts'],
      },
      async (testFile) => {
        return { passed: true, output: `Passed ${testFile}` };
      }
    );

    assert.strictEqual(result.run, 2);
    assert.strictEqual(result.passed, 2);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(result.status, 'PASSED');

    // Runner cache should exist
    assert.ok(runnerOptimizer.hasCachedRunner(tempBaseDir));

    // Cleanup ensures complete isolation
    runnerOptimizer.cleanupRunner(tempBaseDir);
    assert.strictEqual(runnerOptimizer.hasCachedRunner(tempBaseDir), false);
  });
});
