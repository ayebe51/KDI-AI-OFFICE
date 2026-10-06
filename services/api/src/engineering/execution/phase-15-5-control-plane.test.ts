// ==========================================================
// services/api/src/engineering/execution/phase-15-5-control-plane.test.ts
// Phase 15.5: Engineering Control Plane Hardening & Recovery Test Suite
// ==========================================================

process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'node:child_process';
import {
  EngineeringStateMachine,
  IllegalStateTransitionError,
} from '../control-plane/state-machine.js';
import { ControlPlanePersistenceService } from '../control-plane/control-plane-persistence.service.js';
import { ControlPlaneService } from '../control-plane/control-plane.service.js';
import { EngineeringQueueService } from '../control-plane/queue.service.js';
import { IdempotencyService } from '../control-plane/idempotency.service.js';
import { DiffIntegrityService } from '../control-plane/diff-integrity.service.js';
import { WorktreeLeaseService } from '../control-plane/worktree-lease.service.js';
import { RecoveryService } from '../control-plane/recovery.service.js';
import { EngineeringExecutorService } from './engineering-executor.service.js';
import { AntigravityExecutorAdapter } from './adapters/antigravity.adapter.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import { EngineeringAgentService } from './engineering-agent.service.js';
import type { EngineeringTaskContext, EngineeringExecutionResult } from './engineering-execution.types.js';

function getDemoRepoPath(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, 'fixtures/demo-calc-repo');
    if (fs.existsSync(candidate)) return candidate;
    cur = path.dirname(cur);
  }
  return path.resolve(process.cwd(), 'fixtures/demo-calc-repo');
}

function ensureAiRepoGit(aiRepo: string): void {
  const gitDir = path.join(aiRepo, '.git');
  if (!fs.existsSync(gitDir)) {
    try {
      execSync('git init && git config user.name "AI Fixture" && git config user.email "fixture@kdi.ai" && git add -A && git commit -m "init: initial fixture repository" && git branch -M main', { cwd: aiRepo, stdio: 'pipe' });
    } catch {}
  }
}

function getAiRepoPath(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, 'fixtures/ai-engineering-repo');
    if (fs.existsSync(candidate)) {
      ensureAiRepoGit(candidate);
      return candidate;
    }
    cur = path.dirname(cur);
  }
  const fallback = path.resolve(process.cwd(), 'fixtures/ai-engineering-repo');
  ensureAiRepoGit(fallback);
  return fallback;
}

test('Phase 15.5: Engineering Control Plane Hardening & Recovery Suite', async (suite) => {
  const demoRepo = getDemoRepoPath();
  assert.ok(fs.existsSync(demoRepo), `demo-calc-repo fixture must exist at ${demoRepo}`);

  const testStorageDir = path.resolve(
    process.cwd(),
    `.test-storage-cp-${Date.now()}`
  );

  suite.after(() => {
    try {
      if (fs.existsSync(testStorageDir)) {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ==========================================================
  // 1. STATE MACHINE & TRANSITION GUARDS (§6 & §7)
  // ==========================================================

  await suite.test('Unit: State Machine allows legal transitions and guards progression', () => {
    // Valid forward transitions
    assert.strictEqual(EngineeringStateMachine.canTransition('TASK_CREATED', 'TASK_ASSIGNED'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('TASK_ASSIGNED', 'WORKSPACE_PREPARING'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('WORKSPACE_PREPARING', 'WORKSPACE_PREPARED'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('WORKSPACE_PREPARED', 'EXECUTOR_STARTING'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('EXECUTOR_STARTING', 'EXECUTING'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('EXECUTING', 'TESTING'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('TESTING', 'DIFF_COLLECTED'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('DIFF_COLLECTED', 'REVIEWING'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('REVIEWING', 'READY_FOR_APPROVAL'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('READY_FOR_APPROVAL', 'APPROVED'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('APPROVED', 'COMMITTED'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('COMMITTED', 'READY_FOR_DEPLOY'), true);

    // Self transitions are idempotent
    assert.strictEqual(EngineeringStateMachine.canTransition('EXECUTING', 'EXECUTING'), true);
    assert.strictEqual(EngineeringStateMachine.canTransition('READY_FOR_APPROVAL', 'READY_FOR_APPROVAL'), true);

    // Assert transition succeeds without error
    assert.doesNotThrow(() => {
      EngineeringStateMachine.assertTransition('TASK_CREATED', 'TASK_ASSIGNED', 'ENG-TEST-1');
    });
  });

  await suite.test('Unit: State Machine strictly blocks illegal jumps (§7)', () => {
    // Direct leap from TASK_CREATED to COMMITTED must be rejected
    assert.strictEqual(EngineeringStateMachine.canTransition('TASK_CREATED', 'COMMITTED'), false);
    assert.throws(
      () => {
        EngineeringStateMachine.assertTransition('TASK_CREATED', 'COMMITTED', 'ENG-ILLEGAL-1');
      },
      IllegalStateTransitionError
    );

    // Direct leap from READY_FOR_DEPLOY to EXECUTING must be rejected (terminal state)
    assert.strictEqual(EngineeringStateMachine.canTransition('READY_FOR_DEPLOY', 'EXECUTING'), false);
    assert.throws(
      () => {
        EngineeringStateMachine.assertTransition('READY_FOR_DEPLOY', 'EXECUTING', 'ENG-TERMINAL-1');
      },
      IllegalStateTransitionError
    );

    // CANCELLED is terminal
    assert.strictEqual(EngineeringStateMachine.canTransition('CANCELLED', 'EXECUTING'), false);
  });

  // ==========================================================
  // 2. PERSISTENCE & SURVIVAL ACROSS RESTART (§4, §5 & §14)
  // ==========================================================

  await suite.test('Persistence: Task, execution attempts, and events survive restart (§4, §5 & §14)', async () => {
    const persistence1 = new ControlPlanePersistenceService(undefined, testStorageDir);

    const taskId = `ENG-PERSIST-${Date.now()}`;
    await persistence1.saveTask({
      id: taskId,
      externalId: taskId,
      project: 'SIMMACI',
      repository: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      executor: 'ANTIGRAVITY',
      status: 'READY_FOR_APPROVAL',
      priority: 'HIGH',
      branch: 'fix/persist-test',
      worktree: '/tmp/fake-worktree',
      acceptanceCriteria: ['Tests pass'],
      constraints: ['Protected'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await persistence1.saveAttempt({
      id: `att_${taskId}_1`,
      taskId,
      attemptNumber: 1,
      executor: 'ANTIGRAVITY',
      status: 'READY_FOR_APPROVAL',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 1250,
      changedFiles: ['src/calculator.js'],
      diffSummary: '+ function add(a, b) { return a + b; }',
      diffHash: 'sha256_mock_hash_123',
      testResult: { run: 1, passed: 1, failed: 0, status: 'PASSED' },
      rawLogs: ['Attempt 1 passed'],
    });

    await persistence1.saveEvent({
      id: `ev_${taskId}_1`,
      taskId,
      attemptId: `att_${taskId}_1`,
      type: 'APPROVAL_REQUESTED',
      actor: 'AI Engineer',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      message: 'Task reached approval gate',
    });

    // Verify written to disk
    assert.ok(fs.existsSync(path.join(testStorageDir, 'tasks.json')));
    assert.ok(fs.existsSync(path.join(testStorageDir, 'attempts.json')));
    assert.ok(fs.existsSync(path.join(testStorageDir, 'events.json')));

    // Simulate complete process restart by instantiating new Persistence instance pointing to same storage
    const persistence2 = new ControlPlanePersistenceService(undefined, testStorageDir);
    const loadedTask = persistence2.getTaskSync(taskId);
    assert.ok(loadedTask, 'Task must be hydrated from disk after restart');
    assert.strictEqual(loadedTask.id, taskId);
    assert.strictEqual(loadedTask.status, 'READY_FOR_APPROVAL');
    assert.strictEqual(loadedTask.branch, 'fix/persist-test');

    const loadedAttempts = persistence2.getAttemptsSync(taskId);
    assert.strictEqual(loadedAttempts.length, 1);
    assert.strictEqual(loadedAttempts[0].diffHash, 'sha256_mock_hash_123');

    const loadedEvents = await persistence2.getEvents(taskId);
    assert.strictEqual(loadedEvents.length, 1);
    assert.strictEqual(loadedEvents[0].type, 'APPROVAL_REQUESTED');
  });

  // ==========================================================
  // 3. IDEMPOTENCY & DEDUPLICATION (§8)
  // ==========================================================

  await suite.test('Idempotency: Duplicate task requests suppress double execution (§8)', () => {
    const idempotency = new IdempotencyService();

    const fp1 = idempotency.computeTaskFingerprint({
      project: 'SIMMACI',
      branch: 'fix/auth-leak',
      title: 'Fix authentication leak',
    });

    const fp2 = idempotency.computeTaskFingerprint({
      project: 'SIMMACI',
      branch: 'fix/auth-leak',
      title: 'Fix authentication leak',
    });

    assert.strictEqual(fp1, fp2, 'Fingerprints of identical requests must match exactly');

    // Register active task
    idempotency.registerTask(fp1, 'ENG-AUTH-100');

    // Duplicate incoming request detected
    const isDup = idempotency.isDuplicate(fp2);
    assert.strictEqual(isDup, true);
    assert.strictEqual(idempotency.getExistingTaskId(fp2), 'ENG-AUTH-100');

    // Different task request has different fingerprint
    const fpDiff = idempotency.computeTaskFingerprint({
      project: 'SIMMACI',
      branch: 'feature/new-dashboard',
      title: 'Add new dashboard',
    });
    assert.notStrictEqual(fp1, fpDiff);
    assert.strictEqual(idempotency.isDuplicate(fpDiff), false);
  });

  // ==========================================================
  // 4. QUEUE & CONCURRENCY POLICY (§9, §10 & §20)
  // ==========================================================

  await suite.test('Queue: Priority ordering and concurrency limits enforced (§9 & §10)', () => {
    const queue = new EngineeringQueueService({
      maxConcurrentEngineeringTasks: 2,
      maxConcurrentAntigravityJobs: 1,
      maxTasksPerHost: 2,
    });

    const ctx1: EngineeringTaskContext = {
      taskId: 'ENG-Q-1',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan',
      title: 'Task 1',
      description: 'First job',
      acceptanceCriteria: [],
      constraints: [],
      branch: 'fix/q-1',
      executor: 'ANTIGRAVITY',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    const ctx2: EngineeringTaskContext = {
      ...ctx1,
      taskId: 'ENG-Q-2',
      branch: 'fix/q-2',
    };

    const ctx3: EngineeringTaskContext = {
      ...ctx1,
      taskId: 'ENG-Q-3',
      branch: 'fix/q-3',
    };

    // Task 1 can run
    const check1 = queue.canExecute(ctx1);
    assert.strictEqual(check1.canRun, true);
    queue.registerActive(ctx1);

    // Task 2 requesting ANTIGRAVITY hits maxConcurrentAntigravityJobs (1)
    const check2 = queue.canExecute(ctx2);
    assert.strictEqual(check2.canRun, false);
    assert.match(check2.reason!, /Max concurrent Antigravity jobs reached/);

    // When Task 1 finishes and releases
    queue.releaseActive(ctx1.taskId);
    assert.strictEqual(queue.getActiveCount(), 0);

    // Task 2 can now run
    const check2After = queue.canExecute(ctx2);
    assert.strictEqual(check2After.canRun, true);
  });

  await suite.test('Queue: Pause and resume control plane operations (§20)', () => {
    const queue = new EngineeringQueueService();
    assert.strictEqual(queue.getQueueStatus(), 'QUEUE_RUNNING');

    queue.pauseQueue();
    assert.strictEqual(queue.getQueueStatus(), 'QUEUE_PAUSED');

    const ctx: EngineeringTaskContext = {
      taskId: 'ENG-PAUSE-1',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'FEATURE',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan',
      title: 'New task during pause',
      description: 'Should be held',
      acceptanceCriteria: [],
      constraints: [],
      branch: 'feature/pause',
      executor: 'ANTIGRAVITY',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    const check = queue.canExecute(ctx);
    assert.strictEqual(check.canRun, false);
    assert.match(check.reason!, /Queue is currently paused/);

    queue.resumeQueue();
    assert.strictEqual(queue.getQueueStatus(), 'QUEUE_RUNNING');
    assert.strictEqual(queue.canExecute(ctx).canRun, true);
  });

  // ==========================================================
  // 5. DIFF INTEGRITY & APPROVAL INVALIDATION (§32 & §33)
  // ==========================================================

  await suite.test('Integrity: SHA-256 diff hash detects tamper and invalidates approval (§32 & §33)', () => {
    const diffIntegrity = new DiffIntegrityService();

    const originalDiff = `diff --git a/src/calculator.js b/src/calculator.js
--- a/src/calculator.js
+++ b/src/calculator.js
@@ -1,3 +1,4 @@
+function multiply(a, b) { return a * b; }
`;

    const diffHash = diffIntegrity.computeDiffHash(originalDiff);
    assert.ok(diffHash.startsWith('sha256:'));

    // 1. Untampered diff matches
    const verifyOriginal = diffIntegrity.verifyDiffIntegrity(diffHash, originalDiff);
    assert.strictEqual(verifyOriginal.valid, true);

    // 2. Tampered diff (code injected after approval) is caught
    const tamperedDiff = originalDiff + '\n+process.exit(1); // Malicious injection';
    const verifyTampered = diffIntegrity.verifyDiffIntegrity(diffHash, tamperedDiff);
    assert.strictEqual(verifyTampered.valid, false);
    assert.match(verifyTampered.reason!, /Code changes were modified after approval/);
  });

  // ==========================================================
  // 6. WORKTREE LEASE & ORPHAN WORKTREE DETECTION (§12 & §13)
  // ==========================================================

  await suite.test('Worktree: Worktree lease lifecycle and orphan worktree detection (§12 & §13)', async () => {
    const persistence = new ControlPlanePersistenceService(undefined, testStorageDir);
    const leaseService = new WorktreeLeaseService(persistence);

    // Acquire valid lease
    const lease = await leaseService.acquireLease(
      'ENG-LEASE-1',
      path.resolve(process.cwd(), '.worktrees/ws_valid_1'),
      'feature/lease-1'
    );
    assert.strictEqual(lease.status, 'ACTIVE');

    // Heartbeat updates lastHeartbeat
    const updated = await leaseService.heartbeat('ENG-LEASE-1');
    assert.ok(updated);

    // Release lease
    const released = await leaseService.releaseLease('ENG-LEASE-1');
    assert.ok(released);
    assert.strictEqual(released.status, 'CLEANED');

    // Create a dummy orphaned folder in .worktrees
    const orphanPath = path.resolve(process.cwd(), '.worktrees/ws_test_orphan_dummy');
    fs.mkdirSync(orphanPath, { recursive: true });

    // Orphan detection should identify untracked folder
    const orphans = await leaseService.detectOrphanWorktrees();
    const foundDummy = orphans.find((o) => o.includes('ws_test_orphan_dummy'));
    assert.ok(foundDummy, 'Orphan worktree scan must detect untracked worktree folder');

    // Cleanup orphan folder
    fs.rmSync(orphanPath, { recursive: true, force: true });
  });

  // ==========================================================
  // 7. STARTUP RECONCILIATION & HONEST RECOVERY (§13, §14 & §44)
  // ==========================================================

  await suite.test('Recovery: Startup reconciliation marks interrupted tasks as RECOVERY_REQUIRED (§13, §14 & §44)', async () => {
    const persistence = new ControlPlanePersistenceService(undefined, testStorageDir);
    const leaseService = new WorktreeLeaseService(persistence);
    const recovery = new RecoveryService(persistence, leaseService);

    // Simulate task interrupted mid-execution when KDI was killed
    const interruptedTaskId = `ENG-CRASH-${Date.now()}`;
    await persistence.saveTask({
      id: interruptedTaskId,
      externalId: interruptedTaskId,
      project: 'SIMMACI',
      repository: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      executor: 'ANTIGRAVITY',
      status: 'EXECUTING', // In-flight when crash happened!
      priority: 'MEDIUM',
      branch: 'fix/crash-recovery',
      worktree: path.resolve(process.cwd(), '.worktrees', `ws_${interruptedTaskId}`),
      acceptanceCriteria: ['Pass test'],
      constraints: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Run startup reconciliation
    const assessments = await recovery.reconcileStartup();
    const targetAssessment = assessments.find((a) => a.taskId === interruptedTaskId);

    assert.ok(targetAssessment, 'Reconciliation must detect interrupted task');
    // Must NOT fake success! (§44)
    assert.notStrictEqual(targetAssessment.recommendedAction, 'MARK_FAILED');
    assert.strictEqual(
      targetAssessment.recommendedAction === 'RETRY' ||
        targetAssessment.recommendedAction === 'RESUME' ||
        targetAssessment.recommendedAction === 'RECREATE_WORKTREE',
      true
    );

    // Status updated in persistence
    const reloaded = persistence.getTaskSync(interruptedTaskId);
    assert.ok(reloaded);
    assert.strictEqual(
      reloaded.status,
      'RECOVERY_REQUIRED',
      'Interrupted in-flight task must become RECOVERY_REQUIRED, never marked completed'
    );
  });

  // ==========================================================
  // 8. REPOSITORY ALLOWLIST SECURITY GATE (§34 & §35)
  // ==========================================================

  await suite.test('Security: Repository allowlist blocks execution on arbitrary external paths (§35)', async () => {
    const approvalGate = new ApprovalGateService();
    const service = new EngineeringExecutorService(approvalGate);

    const forbiddenPath = process.platform === 'win32' ? 'C:\\Windows\\System32' : '/etc/shadow';

    const maliciousContext: EngineeringTaskContext = {
      taskId: 'ENG-MALICIOUS-1',
      project: 'EXTERNAL_ATTACK',
      repository: forbiddenPath,
      repositoryPath: forbiddenPath,
      taskType: 'BUG',
      domain: 'SECURITY',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan',
      title: 'Tamper System Files',
      description: 'Attempting to execute outside approved repo allowlist',
      acceptanceCriteria: [],
      constraints: [],
      branch: 'malicious/exploit',
      executor: 'ANTIGRAVITY',
      timeout: 10000,
      environment: {},
      requestedBy: 'Attacker',
    };

    const res = await service.executeTask(maliciousContext);
    assert.strictEqual(res.status, 'BLOCKED');
    assert.match(res.error!, /SECURITY_VIOLATION.*allowlist/);
  });

  // ==========================================================
  // 9. HUMAN CANCELLATION & KILL SWITCH (§18 & §19)
  // ==========================================================

  await suite.test('Control: Emergency halt pauses queue, cancels active tasks, and disables executor (§19)', async () => {
    const approvalGate = new ApprovalGateService();
    const service = new EngineeringExecutorService(approvalGate);

    const mockExecutor = new AntigravityExecutorAdapter();
    mockExecutor.setDelegate(async () => ({ success: true, changesMade: true }));
    service.registerExecutor('MOCK_HALT', mockExecutor);

    // Trigger emergency halt
    await service.emergencyHalt('Owner requested emergency halt due to production maintenance');

    assert.strictEqual(service.getQueueStatus().status, 'QUEUE_PAUSED');

    // Executing new task should now be blocked
    const ctx: EngineeringTaskContext = {
      taskId: 'ENG-AFTER-HALT',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan',
      title: 'Task after halt',
      description: 'Must be queued / rejected',
      acceptanceCriteria: [],
      constraints: [],
      branch: 'fix/halt-test',
      executor: 'MOCK_HALT',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    const res = await service.executeTask(ctx);
    assert.strictEqual(res.status, 'QUEUED');
    assert.match(res.error!, /Queue is currently paused/);

    // Resume queue
    service.resumeQueue();
    assert.strictEqual(service.getQueueStatus().status, 'QUEUE_RUNNING');
  });

  // ==========================================================
  // 10. FULL CONTROL PLANE E2E INTEGRATION & APPROVAL DIFF INTEGRITY (§32, §33, §41)
  // ==========================================================

  await suite.test('E2E: Full loop with diff verification and approval invalidation upon post-approval tampering (§32 & §33)', async () => {
    const approvalGate = new ApprovalGateService();
    const service = new EngineeringExecutorService(approvalGate);

    let activeWorktree: string = '';
    const mockExecutor = new AntigravityExecutorAdapter();
    mockExecutor.setDelegate(async (_prompt, _ctx, worktree) => {
      activeWorktree = worktree;
      const targetFile = path.join(worktree, 'src/calculator.js');
      if (fs.existsSync(targetFile)) {
        fs.appendFileSync(targetFile, '\n// Legitimate AI change for approval verification\n');
      }
      return { success: true, changesMade: true };
    });
    service.registerExecutor('MOCK_DIFF_INTEGRITY', mockExecutor);

    const taskId = `ENG-INTEGRITY-${Date.now()}`;
    const context: EngineeringTaskContext = {
      taskId,
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'FEATURE',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Diff integrity verification',
      description: 'Ensure modified diff invalidates approval',
      acceptanceCriteria: ['Tests pass'],
      constraints: [],
      branch: `feature/diff-verify-${Date.now()}`,
      executor: 'MOCK_DIFF_INTEGRITY',
      timeout: 30000,
      environment: {},
      requestedBy: 'Owner',
    };

    // 1. Task executes and reaches READY_FOR_APPROVAL
    const res = await service.executeTask(context);
    assert.strictEqual(res.status, 'READY_FOR_APPROVAL');
    assert.ok(res.approvalId);
    assert.ok(res.diffHash, 'Diff hash must be captured upon reaching READY_FOR_APPROVAL');

    // 2. Tamper the worktree after approval request was generated!
    assert.ok(activeWorktree && fs.existsSync(activeWorktree));
    const targetFile = path.join(activeWorktree, 'src/calculator.js');
    fs.appendFileSync(targetFile, '\n// UNAUTHORIZED TAMPERING AFTER APPROVAL WAS REQUESTED\n');

    // 3. Human resolves approval -> System MUST detect diff alteration and transition to APPROVAL_INVALIDATED (§32 & §33)
    const resolvedResult = await service.handleApprovalResolution(taskId, true, 'Budi (Owner)');
    assert.ok(resolvedResult);
    assert.strictEqual(
      resolvedResult.status,
      'APPROVAL_INVALIDATED',
      'Tampered diff must invalidate approval and strictly block commit (§32 & §33)'
    );
    assert.match(resolvedResult.error!, /Code changes were modified after approval/);

    // Cleanup
    await service.cancelTask(taskId);
  });
});
