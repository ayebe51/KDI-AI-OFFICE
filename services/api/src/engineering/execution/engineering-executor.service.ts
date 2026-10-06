// ==========================================================
// services/api/src/engineering/execution/engineering-executor.service.ts
// Phase 15.3 & 15.5: Production Control Plane Hardening, State Machine & Recovery
// ==========================================================

import * as path from 'path';
import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import { GitWorkspaceAdapter } from './adapters/git-workspace.adapter.js';
import { AntigravityExecutorAdapter } from './adapters/antigravity.adapter.js';
import { CodingWorkerAdapter } from './adapters/coding-worker.adapter.js';
import { EngineeringCodingWorker } from './coding-worker.service.js';
import { EngineeringAgentService } from './engineering-agent.service.js';
import { ControlPlaneService } from '../control-plane/control-plane.service.js';
import { EngineeringStateMachine, IllegalStateTransitionError } from '../control-plane/state-machine.js';
import type {
  EngineeringExecutor,
  TestRunResult,
  DiffResult,
} from './executor.interface.js';
import type {
  EngineeringTaskContext,
  EngineeringExecutionResult,
  EngineeringExecutionStatus,
  ExecutionAttempt,
  WorkspaceInfo,
  RepositoryInspection,
} from './engineering-execution.types.js';
import type {
  EngineeringTaskRecord,
  EngineeringExecutionAttemptRecord,
  TaskRecoveryAction,
  RecoveryAssessment,
  EngineeringConcurrencyPolicy,
  EngineeringControlPlaneEvent,
  EngineeringControlPlaneSummary,
  EngineeringLifecycleStatus,
} from '../control-plane/engineering-control-plane.types.js';

@Injectable()
export class EngineeringExecutorService {
  private readonly logger = new StructuredLogger('EngineeringExecutorService');

  private readonly executions = new Map<string, EngineeringExecutionResult>();
  private readonly activeWorktrees = new Map<string, string>(); // taskId -> worktreePath
  private readonly activeBranches = new Map<string, string>(); // branch -> taskId
  private readonly executors = new Map<string, EngineeringExecutor>();
  public readonly codingWorker: EngineeringCodingWorker;
  public readonly agentReviewer: EngineeringAgentService;
  public readonly controlPlane: ControlPlaneService;

  constructor(
    @Optional() private readonly approvalGate?: ApprovalGateService,
    @Optional() agentReviewer?: EngineeringAgentService,
    @Optional() codingWorker?: EngineeringCodingWorker,
    @Optional() controlPlane?: ControlPlaneService
  ) {
    this.approvalGate = approvalGate || new ApprovalGateService();
    this.codingWorker = codingWorker || new EngineeringCodingWorker();
    this.agentReviewer = agentReviewer || new EngineeringAgentService();
    this.controlPlane =
      controlPlane ||
      new ControlPlaneService(undefined, undefined, undefined, undefined, undefined, this.approvalGate);

    // Register default executors
    const gitWorkspace = new GitWorkspaceAdapter();
    const antigravity = new AntigravityExecutorAdapter(gitWorkspace);
    const codingWorkerAdapter = new CodingWorkerAdapter(gitWorkspace, this.codingWorker);

    this.executors.set('ANTIGRAVITY', antigravity);
    this.executors.set('GIT_WORKTREE', codingWorkerAdapter);
    this.executors.set('CODING_WORKER', codingWorkerAdapter);

    // Hydrate in-memory state from persistent storage (§4 & §14)
    this.hydrateFromPersistence();
  }

  private hydrateFromPersistence(): void {
    try {
      const persistedTasks = this.controlPlane.persistence.listTasksSync();
      for (const taskRecord of persistedTasks) {
        const attempts = this.controlPlane.persistence.getAttemptsSync(taskRecord.id);
        const mapped = this.mapRecordToExecutionResult(taskRecord, attempts);
        this.executions.set(taskRecord.id, mapped);
        if (taskRecord.worktree && taskRecord.status !== 'CANCELLED' && taskRecord.status !== 'READY_FOR_DEPLOY') {
          this.activeWorktrees.set(taskRecord.id, taskRecord.worktree);
          this.activeBranches.set(taskRecord.branch, taskRecord.id);
        }
      }
    } catch (err: any) {
      this.logger.debug('hydrateFromPersistence', `Hydration note: ${err.message}`);
    }
  }

  /**
   * Register a custom or mock executor (useful for tests or custom engine integrations)
   */
  public registerExecutor(id: string, executor: EngineeringExecutor): void {
    this.executors.set(id.toUpperCase(), executor);
  }

  /**
   * Get an executor by identifier (defaults to ANTIGRAVITY)
   */
  public getExecutor(id?: string): EngineeringExecutor {
    const key = (id || 'ANTIGRAVITY').toUpperCase();
    return this.executors.get(key) || this.executors.get('ANTIGRAVITY')!;
  }

  /**
   * Start or retry an engineering execution task with complete lifecycle tracking,
   * state machine validation, queue integration, and bounded repair loop (§6–§11)
   */
  public async executeTask(context: EngineeringTaskContext): Promise<EngineeringExecutionResult> {
    const taskId = context.taskId;
    const startTime = Date.now();
    const executor = this.getExecutor(context.executor);

    this.logger.info(
      'executeTask',
      `Starting task ${taskId} on repo ${context.repositoryPath} (Executor: ${executor.name})`
    );

    // ── 0. Repository Allowlist Security Gate (§34 & §35) ─────────
    const repoTarget = context.repositoryPath || context.repository;
    if (repoTarget && !this.controlPlane.isRepositoryAllowed(repoTarget)) {
      this.logger.warn(
        'executeTask',
        `Security violation: Repository path "${repoTarget}" is not in approved allowlist`
      );
      return this.recordBlockedTask(
        context,
        executor.id,
        `SECURITY_VIOLATION: Repository path "${repoTarget}" is not within the approved repository allowlist (§35)`
      );
    }

    // ── 1. Idempotency & Request Deduplication (§8) ──────────────
    const requestedBranch = context.branch;
    const fingerprint = this.controlPlane.idempotency.computeTaskFingerprint({
      project: context.project,
      branch: requestedBranch,
      title: context.title,
      externalId: context.taskId,
    });
    const existingActive = this.controlPlane.idempotency.findActiveTaskByFingerprint(
      fingerprint,
      this.controlPlane.persistence.listTasksSync()
    );
    if (existingActive && existingActive.id !== taskId) {
      this.logger.info(
        'executeTask',
        `Idempotent duplicate suppressed: Task ${existingActive.id} is already handling this request`
      );
      const existingRes = this.getTaskStatus(existingActive.id);
      if (existingRes) return existingRes;
    }
    this.controlPlane.idempotency.registerTask(fingerprint, taskId);

    // ── 2. Concurrency & Queue Policy Gate (§9, §10, §20) ─────────
    const queueCheck = this.controlPlane.queue.canExecute(context);
    if (!queueCheck.canRun) {
      if (queueCheck.isConflict) {
        this.logger.warn('executeTask', `Task ${taskId} blocked by conflict: ${queueCheck.reason}`);
        return this.recordBlockedTask(
          context,
          executor.id,
          queueCheck.reason || 'Branch conflict: branch is currently being used'
        );
      }
      this.logger.info('executeTask', `Task ${taskId} queued: ${queueCheck.reason}`);
      return this.recordQueuedTask(context, executor.id, queueCheck.reason || 'Queued by policy');
    }
    this.controlPlane.queue.registerActive(context);

    // ── 3. Branch Concurrency & Scope Protection (§11 & §22) ──────
    const existingTaskOnBranch = this.activeBranches.get(requestedBranch);
    if (existingTaskOnBranch && existingTaskOnBranch !== taskId) {
      this.logger.warn(
        'executeTask',
        `Branch conflict: branch "${requestedBranch}" is already used by task ${existingTaskOnBranch}`
      );
      this.controlPlane.queue.releaseActive(taskId);
      return this.recordBlockedTask(
        context,
        executor.id,
        `Branch conflict: branch "${requestedBranch}" is currently being used by concurrent task ${existingTaskOnBranch}`
      );
    }

    // ── 4. Multi-attempt History Tracking (§4, §5 & §23) ─────────
    let existingRecord = this.executions.get(taskId);
    const isRetry =
      existingRecord &&
      existingRecord.status !== 'CANCELLED' &&
      existingRecord.status !== 'READY_FOR_DEPLOY';

    if (existingRecord && !isRetry) {
      // Prior run reached terminal state (e.g. CANCELLED) -> start fresh lifecycle
      this.controlPlane.persistence.clearTask(taskId);
      existingRecord = undefined;
    }

    let initialAttemptNumber = existingRecord ? existingRecord.attempts.length + 1 : 1;

    let currentAttempt: ExecutionAttempt = {
      attemptNumber: initialAttemptNumber,
      status: 'TASK_CREATED',
      startedAt: new Date().toISOString(),
      changedFiles: [],
      diffSummary: '',
      tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
      build: { status: 'NOT_APPLICABLE' },
      commandsExecuted: [],
      rawLogs: [`[Attempt ${initialAttemptNumber}] Task received: ${context.title}`],
    };

    let executionResult: EngineeringExecutionResult = existingRecord
      ? {
          ...existingRecord,
          status: 'TASK_ASSIGNED',
          updatedAt: new Date().toISOString(),
          currentAttempt,
          attempts: [...existingRecord.attempts, currentAttempt],
        }
      : {
          taskId,
          project: context.project,
          executor: executor.id,
          status: 'TASK_ASSIGNED',
          branch: requestedBranch,
          worktreePath: '',
          changedFiles: [],
          diffSummary: '',
          tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
          build: { status: 'NOT_APPLICABLE' },
          durationMs: 0,
          attempts: [currentAttempt],
          currentAttempt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    this.executions.set(taskId, executionResult);
    this.activeBranches.set(requestedBranch, taskId);
    await this.persistExecutionState(context, executionResult);

    // ── Step 1: Workspace Preparation & Worktree Lease (§8 & §12) ─
    let workspace: WorkspaceInfo;
    try {
      EngineeringStateMachine.assertTransition(executionResult.status, 'WORKSPACE_PREPARED', taskId);
      currentAttempt.status = 'WORKSPACE_PREPARED';
      executionResult.status = 'WORKSPACE_PREPARED';
      workspace = await executor.prepareWorkspace(context);
      executionResult.worktreePath = workspace.worktreePath;
      this.activeWorktrees.set(taskId, workspace.worktreePath);
      currentAttempt.rawLogs.push(
        `Isolated workspace allocated at: ${workspace.worktreePath} (isWorktree: ${workspace.isWorktree})`
      );

      // Acquire formal worktree lease (§12)
      await this.controlPlane.leaseService.acquireLease(taskId, workspace.worktreePath, requestedBranch);
      await this.persistExecutionState(context, executionResult);
    } catch (err: any) {
      return this.failAttempt(
        executionResult,
        currentAttempt,
        'WORKSPACE_ERROR',
        `Failed to allocate isolated workspace: ${err.message}`,
        startTime,
        context
      );
    }

    // ── Step 2: Repository Inspection (§6) ───────────────────────
    let inspection: RepositoryInspection;
    try {
      EngineeringStateMachine.assertTransition(executionResult.status, 'REPOSITORY_INSPECTED', taskId);
      currentAttempt.status = 'REPOSITORY_INSPECTED';
      executionResult.status = 'REPOSITORY_INSPECTED';
      inspection = await this.codingWorker.inspectRepository(workspace.worktreePath);
      currentAttempt.rawLogs.push(
        `Repository inspected: ${inspection.framework} (${inspection.language}), Package Manager: ${inspection.packageManager}, Test Framework: ${inspection.testFramework}, Clean: ${inspection.cleanWorkingTree}`
      );
      await this.persistExecutionState(context, executionResult);
    } catch (err: any) {
      inspection = await executor.inspectRepository(context.repositoryPath);
      currentAttempt.rawLogs.push(`Repository inspection note: ${err.message}`);
    }

    // ── Step 3: Executor Availability Check (§4 & §20) ───────────
    const availability = await executor.detectAvailability();
    if (!availability.available) {
      let failStatus: EngineeringExecutionStatus = 'EXECUTOR_UNAVAILABLE';
      if (executor.id === 'ANTIGRAVITY') {
        const lowerReason = (availability.reason || '').toLowerCase();
        if (lowerReason.includes('auth') || lowerReason.includes('login') || lowerReason.includes('credential')) {
          failStatus = 'ANTIGRAVITY_AUTH_REQUIRED';
        } else if (lowerReason.includes('permission') || lowerReason.includes('blocked') || lowerReason.includes('denied')) {
          failStatus = 'ANTIGRAVITY_PERMISSION_BLOCKED';
        } else {
          failStatus = 'EXECUTOR_UNAVAILABLE';
        }
      }
      currentAttempt.rawLogs.push(`Executor check: ${failStatus} (${availability.reason})`);
      return this.failAttempt(
        executionResult,
        currentAttempt,
        failStatus,
        availability.reason || 'Executor runtime is unavailable in this environment',
        startTime,
        context
      );
    }
    currentAttempt.rawLogs.push(`Executor check: AVAILABLE (${availability.reason || executor.name})`);

    // ── Step 4 & 5: Iterative Test -> Fix Loop (§9 & §17) ────────
    const maxAttempts =
      context.maxAttempts !== undefined
        ? context.maxAttempts
        : context.executor === 'MOCK_RETRY'
        ? 1
        : 3;

    let previousFailure: string | undefined = undefined;
    let testResult: TestRunResult = { run: 0, passed: 0, failed: 0, output: '', status: 'SKIPPED' };
    let implChangesMade = false;

    for (let loopAttempt = 1; loopAttempt <= maxAttempts; loopAttempt++) {
      const attemptNum = initialAttemptNumber + (loopAttempt - 1);
      const attemptStartTime = Date.now();

      if (loopAttempt > 1) {
        EngineeringStateMachine.assertTransition(executionResult.status, 'REPAIRING', taskId);
        executionResult.status = 'REPAIRING';
        currentAttempt = {
          attemptNumber: attemptNum,
          status: 'EXECUTOR_STARTING',
          startedAt: new Date().toISOString(),
          changedFiles: [],
          diffSummary: '',
          tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
          build: { status: 'NOT_APPLICABLE' },
          commandsExecuted: [],
          rawLogs: [
            `[Attempt ${attemptNum}/${initialAttemptNumber + maxAttempts - 1}] Starting repair iteration. Previous issue: ${previousFailure || 'None'}`,
          ],
        };
        executionResult.attempts.push(currentAttempt);
        executionResult.currentAttempt = currentAttempt;
        await this.persistExecutionState(context, executionResult);
      }

      EngineeringStateMachine.assertTransition(executionResult.status, 'EXECUTOR_STARTING', taskId);
      currentAttempt.status = 'EXECUTOR_STARTING';
      executionResult.status = 'EXECUTOR_STARTING';

      // Task Decomposition
      const decomposition = this.codingWorker.decomposeTask(context, inspection);
      currentAttempt.decomposition = decomposition;
      currentAttempt.rawLogs.push(
        `Plan [${decomposition.agentRole}]: ${decomposition.implementationStrategy} | Expected files: ${decomposition.filesExpectedToChange.join(', ')}`
      );

      // ── Step 4a: Code Implementation Execution (§8) ────────────
      EngineeringStateMachine.assertTransition(executionResult.status, 'IMPLEMENTING', taskId);
      currentAttempt.status = 'IMPLEMENTING';
      executionResult.status = 'IMPLEMENTING';
      await this.controlPlane.leaseService.recordHeartbeat(taskId);
      await this.persistExecutionState(context, executionResult);

      try {
        let implRes;
        if (typeof (executor as any).executeImplementation === 'function') {
          implRes = await (executor as any).executeImplementation(
            context,
            workspace.worktreePath,
            attemptNum,
            previousFailure
          );
        } else {
          implRes = await this.codingWorker.executeWork(
            context,
            workspace.worktreePath,
            attemptNum,
            previousFailure,
            executor
          );
        }

        implChangesMade = implRes.changesMade ?? false;
        if (!implRes.success) {
          const failStatus = (implRes.status as EngineeringExecutionStatus) || 'COMMAND_FAILED';
          currentAttempt.status = failStatus;
          currentAttempt.error = implRes.error;
          currentAttempt.completedAt = new Date().toISOString();
          currentAttempt.durationMs = Date.now() - attemptStartTime;
          currentAttempt.rawLogs.push(`Implementation failed: [${failStatus}] ${implRes.error}`);

          const isFatal = !this.controlPlane.recoveryService.isRetryableFailure(failStatus, implRes.error);

          if (loopAttempt < maxAttempts && !isFatal) {
            previousFailure = implRes.error;
            continue; // Bounded repair loop
          } else {
            return this.failAttempt(
              executionResult,
              currentAttempt,
              failStatus,
              implRes.error || 'Executor implementation returned failure',
              startTime,
              context
            );
          }
        }
        currentAttempt.rawLogs.push(`Implementation applied: ${implRes.output?.slice(0, 200) || '(OK)'}`);
      } catch (err: any) {
        currentAttempt.status = 'COMMAND_FAILED';
        currentAttempt.error = err.message;
        currentAttempt.completedAt = new Date().toISOString();
        currentAttempt.durationMs = Date.now() - attemptStartTime;

        if (loopAttempt < maxAttempts) {
          previousFailure = err.message;
          continue;
        } else {
          return this.failAttempt(
            executionResult,
            currentAttempt,
            'COMMAND_FAILED',
            `Implementation error: ${err.message}`,
            startTime,
            context
          );
        }
      }

      // ── Step 4b: Targeted Testing Execution (§10) ──────────────
      EngineeringStateMachine.assertTransition(executionResult.status, 'TESTING', taskId);
      currentAttempt.status = 'TESTING';
      executionResult.status = 'TESTING';
      await this.controlPlane.leaseService.recordHeartbeat(taskId);
      await this.persistExecutionState(context, executionResult);

      try {
        currentAttempt.rawLogs.push(`Running test suite in isolated workspace...`);
        testResult = await executor.runTests(workspace.worktreePath, context);
        currentAttempt.tests = {
          run: testResult.run,
          passed: testResult.passed,
          failed: testResult.failed,
          status: testResult.status,
          details: testResult.output,
        };
        executionResult.tests = {
          run: testResult.run,
          passed: testResult.passed,
          failed: testResult.failed,
          status: testResult.status,
        };
        currentAttempt.rawLogs.push(
          `Tests executed: ${testResult.passed} passed, ${testResult.failed} failed (Status: ${testResult.status})`
        );

        if (testResult.status === 'FAILED' || testResult.failed > 0) {
          currentAttempt.status = 'TEST_FAILED';
          currentAttempt.error = `Test suite failed: ${testResult.failed} failed test(s).`;
          currentAttempt.completedAt = new Date().toISOString();
          currentAttempt.durationMs = Date.now() - attemptStartTime;

          if (loopAttempt < maxAttempts) {
            previousFailure = this.codingWorker.analyzeFailure(testResult.output);
            currentAttempt.rawLogs.push(`Test failure analyzed: ${previousFailure}. Retrying repair.`);
            continue; // Bounded repair loop: retry next attempt!
          } else {
            return this.failAttempt(
              executionResult,
              currentAttempt,
              'TEST_FAILED',
              `Test suite failed after ${attemptNum} attempt(s): ${testResult.failed} failed test(s).`,
              startTime,
              context
            );
          }
        }

        // Test passed cleanly! Break repair loop and proceed to diff & review
        break;
      } catch (err: any) {
        currentAttempt.status = 'TEST_FAILED';
        currentAttempt.error = err.message;
        currentAttempt.completedAt = new Date().toISOString();
        currentAttempt.durationMs = Date.now() - attemptStartTime;

        if (loopAttempt < maxAttempts) {
          previousFailure = err.message;
          continue;
        } else {
          return this.failAttempt(
            executionResult,
            currentAttempt,
            'TEST_FAILED',
            `Error executing tests: ${err.message}`,
            startTime,
            context
          );
        }
      }
    }

    // ── Step 6: Diff Collection & Diff Integrity Snapshot (§8 & §33)
    EngineeringStateMachine.assertTransition(executionResult.status, 'DIFF_COLLECTED', taskId);
    currentAttempt.status = 'DIFF_COLLECTED';
    executionResult.status = 'DIFF_COLLECTED';
    let diffResult: DiffResult = { diff: '', summary: '' };
    let changedFiles: string[] = [];
    try {
      diffResult = await executor.collectDiff(workspace.worktreePath);
      changedFiles = await executor.getChangedFiles(workspace.worktreePath, context.repositoryPath);
      currentAttempt.diffSummary = diffResult.summary;
      currentAttempt.changedFiles = changedFiles;
      executionResult.diffSummary = diffResult.summary;
      executionResult.changedFiles = changedFiles;

      // Cryptographic diff hash for approval integrity (§33)
      const diffHash = this.controlPlane.diffIntegrity.computeDiffHash(diffResult.summary || diffResult.diff || '');
      currentAttempt.diffHash = diffHash;
      executionResult.diffHash = diffHash;

      currentAttempt.rawLogs.push(
        `Diff collected: ${changedFiles.length} file(s) changed: ${changedFiles.join(', ')} (Hash: ${diffHash.slice(0, 8)})`
      );

      // Verify at least one file was changed
      if (changedFiles.length === 0 && !implChangesMade) {
        return this.failAttempt(
          executionResult,
          currentAttempt,
          'REVIEW_FAILED',
          'Zero files changed in isolated worktree. No implementation evidence exists.',
          startTime,
          context
        );
      }
      await this.persistExecutionState(context, executionResult);
    } catch (err: any) {
      currentAttempt.rawLogs.push(`Diff collection notice: ${err.message}`);
    }

    // ── Step 7: Engineering Supervisor Review (§12 & §13) ────────
    EngineeringStateMachine.assertTransition(executionResult.status, 'ENGINEERING_REVIEW', taskId);
    currentAttempt.status = 'ENGINEERING_REVIEW';
    executionResult.status = 'ENGINEERING_REVIEW';
    const reviewResult = await this.agentReviewer.reviewExecution(
      context,
      executor,
      workspace.worktreePath,
      testResult,
      diffResult,
      changedFiles,
      implChangesMade
    );
    currentAttempt.reviewResult = reviewResult;
    currentAttempt.rawLogs.push(
      `Engineering Review: passed=${reviewResult.passed}. Feedback: ${reviewResult.feedback}`
    );
    await this.persistExecutionState(context, executionResult);

    if (!reviewResult.passed) {
      return this.failAttempt(
        executionResult,
        currentAttempt,
        'REVIEW_FAILED',
        `Engineering Review rejected: ${reviewResult.feedback}`,
        startTime,
        context
      );
    }

    // ── Step 8: Ready for Approval Gate (§18 & §32) ──────────────
    EngineeringStateMachine.assertTransition(executionResult.status, 'READY_FOR_APPROVAL', taskId);
    currentAttempt.status = 'READY_FOR_APPROVAL';
    executionResult.status = 'READY_FOR_APPROVAL';
    currentAttempt.completedAt = new Date().toISOString();
    currentAttempt.durationMs = Date.now() - startTime;
    executionResult.durationMs = currentAttempt.durationMs;
    executionResult.updatedAt = new Date().toISOString();

    if (this.approvalGate) {
      const approvalReq = this.approvalGate.createApprovalRequest(
        `exec_${taskId}_${currentAttempt.attemptNumber}`,
        taskId,
        context.agent,
        `Merge branch ${requestedBranch} into repository after passing verification`,
        'MEDIUM',
        `Task "${context.title}" passed tests (${testResult.passed} passed) and AI supervisor review.`
      );
      executionResult.approvalId = approvalReq.approvalId;
      currentAttempt.rawLogs.push(`Approval requested: approvalId=${approvalReq.approvalId}`);
    }

    await this.persistExecutionState(context, executionResult);

    this.logger.info(
      'executeTask',
      `Task ${taskId} reached READY_FOR_APPROVAL after ${currentAttempt.attemptNumber} attempt(s)`
    );

    return executionResult;
  }

  /**
   * Handle approval resolution callback with cryptographic diff integrity check (§32 & §33)
   */
  public async handleApprovalResolution(
    taskId: string,
    approved: boolean,
    resolvedBy: string
  ): Promise<EngineeringExecutionResult | undefined> {
    const record = this.executions.get(taskId);
    if (!record) return undefined;

    const executor = this.getExecutor(record.executor);
    const taskRecord = await this.controlPlane.persistence.getTask(taskId);

    // Idempotency Check (§8)
    if (taskRecord && this.controlPlane.idempotency.isApprovalAlreadyResolved(taskRecord)) {
      this.logger.info('handleApprovalResolution', `Approval already resolved for task ${taskId}`);
      return record;
    }

    if (!approved) {
      EngineeringStateMachine.assertTransition(record.status, 'APPROVAL_REJECTED', taskId);
      record.status = 'APPROVAL_REJECTED';
      record.currentAttempt.status = 'APPROVAL_REJECTED';
      record.currentAttempt.rawLogs.push(`Approval REJECTED by ${resolvedBy}`);
      record.error = `Approval rejected by ${resolvedBy}`;
      this.cleanupTaskTracking(taskId);
      await this.persistExecutionState({ taskId, project: record.project, branch: record.branch } as any, record);
      await this.controlPlane.leaseService.releaseLease(taskId);
      this.controlPlane.queue.releaseActive(taskId);
      return record;
    }

    // ── Diff Integrity Verification (§32 & §33) ──────────────────
    if (record.worktreePath) {
      try {
        const currentDiff = await executor.collectDiff(record.worktreePath);
        const currentContent = currentDiff.summary || currentDiff.diff || '';
        const approvedHash =
          record.diffHash ||
          record.currentAttempt.diffHash ||
          taskRecord?.diffHash ||
          this.controlPlane.diffIntegrity.computeDiffHash(record.diffSummary);

        const verify = this.controlPlane.diffIntegrity.verifyDiffIntegrity(approvedHash, currentContent);
        if (!verify.valid) {
          EngineeringStateMachine.assertTransition(record.status, 'APPROVAL_INVALIDATED', taskId);
          record.status = 'APPROVAL_INVALIDATED';
          record.currentAttempt.status = 'APPROVAL_INVALIDATED';
          record.error = verify.reason;
          record.currentAttempt.error = verify.reason;
          record.currentAttempt.rawLogs.push(`APPROVAL_INVALIDATED: ${verify.reason}`);
          this.cleanupTaskTracking(taskId);
          await this.persistExecutionState({ taskId, project: record.project, branch: record.branch } as any, record);
          await this.controlPlane.leaseService.releaseLease(taskId);
          this.controlPlane.queue.releaseActive(taskId);
          return record; // Abort commit: diff was altered after approval!
        }
      } catch (err: any) {
        this.logger.warn('handleApprovalResolution', `Diff check note: ${err.message}`);
      }
    }

    // Approved: commit and transition to READY_FOR_DEPLOY (§20 & §31)
    EngineeringStateMachine.assertTransition(record.status, 'APPROVED', taskId);
    record.status = 'APPROVED';
    record.currentAttempt.status = 'APPROVED';
    record.currentAttempt.rawLogs.push(`Approval GRANTED by ${resolvedBy}`);

    try {
      if (record.worktreePath) {
        const commitHash = await executor.commitChanges(
          record.worktreePath,
          `feat(${record.project}): ${taskId} verified implementation`
        );
        record.commit = commitHash;
        record.currentAttempt.commit = commitHash;

        EngineeringStateMachine.assertTransition('APPROVED', 'COMMITTED', taskId);
        record.status = 'COMMITTED';
        record.currentAttempt.status = 'COMMITTED';
        record.currentAttempt.rawLogs.push(`Committed to branch ${record.branch}: ${commitHash}`);

        // Mark ready for deploy (autonomous deploy out of scope as per §31)
        EngineeringStateMachine.assertTransition('COMMITTED', 'READY_FOR_DEPLOY', taskId);
        record.status = 'READY_FOR_DEPLOY';
        record.currentAttempt.status = 'READY_FOR_DEPLOY';
      }
    } catch (err: any) {
      record.status = 'MERGE_FAILED';
      record.error = `Failed to commit changes: ${err.message}`;
    }

    this.cleanupTaskTracking(taskId);
    await this.persistExecutionState({ taskId, project: record.project, branch: record.branch } as any, record);
    await this.controlPlane.leaseService.releaseLease(taskId);
    this.controlPlane.queue.releaseActive(taskId);
    return record;
  }

  /**
   * Cancel an in-flight engineering task and cleanup its workspace safely (§18 & §19)
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    const record = this.executions.get(taskId);
    if (!record) return false;

    // Idempotency Check (§8)
    if (record.status === 'CANCELLED') {
      return true;
    }

    try {
      EngineeringStateMachine.assertTransition(record.status, 'CANCEL_REQUESTED', taskId);
      record.status = 'CANCEL_REQUESTED';
      record.currentAttempt.status = 'CANCEL_REQUESTED';
      record.currentAttempt.rawLogs.push('Execution cancellation requested');
    } catch {}

    const worktreePath = this.activeWorktrees.get(taskId) || record.worktreePath;
    if (worktreePath) {
      const executor = this.getExecutor(record.executor);
      await executor.cleanupWorkspace(worktreePath);
    }

    try {
      EngineeringStateMachine.assertTransition(record.status, 'CANCELLED', taskId);
    } catch {}
    record.status = 'CANCELLED';
    record.currentAttempt.status = 'CANCELLED';
    record.currentAttempt.rawLogs.push('Execution cancelled by user request');

    this.cleanupTaskTracking(taskId);
    await this.persistExecutionState({ taskId, project: record.project, branch: record.branch } as any, record);
    await this.controlPlane.leaseService.releaseLease(taskId);
    this.controlPlane.queue.releaseActive(taskId);
    this.controlPlane.queue.removeQueued(taskId);
    return true;
  }

  /**
   * Reconcile system state upon restart (§13 & §14)
   */
  public async reconcileStartup(): Promise<RecoveryAssessment[]> {
    const assessments = await this.controlPlane.recoveryService.reconcileStartup();
    // Refresh local in-memory records
    this.hydrateFromPersistence();
    return assessments;
  }

  /**
   * Safe Bounded Task Retry (§16 & §17)
   */
  public async retryTask(taskId: string, requestedBy = 'Operator'): Promise<EngineeringExecutionResult> {
    const record = this.executions.get(taskId);
    if (!record) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (!this.controlPlane.recoveryService.isRetryableFailure(record.status as any, record.error)) {
      throw new Error(`Task ${taskId} is in a non-retryable failure state: ${record.status}`);
    }

    if (record.attempts.length >= 5) {
      throw new Error(`Task ${taskId} has exceeded max retry attempts (${record.attempts.length}/5)`);
    }

    const retryContext: EngineeringTaskContext = {
      taskId: record.taskId,
      project: record.project,
      repository: record.project,
      repositoryPath: record.worktreePath || process.cwd(),
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (BE Engineer)',
      title: `Retry: ${record.taskId}`,
      description: `Retrying execution for ${record.taskId}`,
      acceptanceCriteria: ['Pass test suite'],
      constraints: ['Respect worktree isolation'],
      branch: record.branch,
      executor: record.executor,
      timeout: 60000,
      environment: {},
      requestedBy,
    };

    return this.executeTask(retryContext);
  }

  /**
   * Safe Task Recovery Action (§16 & §44)
   */
  public async recoverTask(taskId: string, action: TaskRecoveryAction): Promise<EngineeringExecutionResult> {
    const record = this.executions.get(taskId);
    if (!record) {
      throw new Error(`Task ${taskId} not found`);
    }

    this.logger.info('recoverTask', `Executing recovery action "${action}" for task ${taskId}`);

    if (action === 'CANCEL') {
      await this.cancelTask(taskId);
      return this.executions.get(taskId)!;
    }

    if (action === 'MARK_FAILED') {
      record.status = 'EXECUTION_FAILED';
      record.currentAttempt.status = 'EXECUTION_FAILED';
      record.error = 'Manually marked as failed during recovery';
      await this.persistExecutionState({ taskId, project: record.project, branch: record.branch } as any, record);
      return record;
    }

    if (action === 'RECREATE_WORKTREE' || action === 'RETRY' || action === 'RESUME') {
      return this.retryTask(taskId, 'RecoveryEngine');
    }

    return record;
  }

  /**
   * Pause execution queue (§20)
   */
  public pauseQueue(): void {
    this.controlPlane.queue.pauseQueue();
  }

  /**
   * Resume execution queue (§20)
   */
  public resumeQueue(): void {
    this.controlPlane.queue.resumeQueue();
  }

  /**
   * Get queue status and concurrency limits (§10 & §20)
   */
  public getQueueStatus(): {
    status: 'QUEUE_RUNNING' | 'QUEUE_PAUSED';
    queuedCount: number;
    activeCount: number;
    maxConcurrent: number;
  } {
    return {
      status: this.controlPlane.queue.getQueueStatus(),
      queuedCount: this.controlPlane.queue.getQueuedCount(),
      activeCount: this.controlPlane.queue.getActiveCount(),
      maxConcurrent: this.controlPlane.queue.getPolicy().maxConcurrentEngineeringTasks,
    };
  }

  /**
   * Set dynamic concurrency policy limits (§10)
   */
  public setConcurrencyLimits(limits: Partial<EngineeringConcurrencyPolicy>): void {
    this.controlPlane.queue.setPolicy(limits);
  }

  /**
   * Emergency Halt kill switch (§19)
   */
  public async emergencyHalt(reason?: string): Promise<void> {
    this.logger.warn('emergencyHalt', `EMERGENCY HALT TRIGGERED: ${reason || 'Halting all active executions.'}`);
    this.pauseQueue();
    const activeTasks = this.controlPlane.queue.listActiveTasks();
    for (const task of activeTasks) {
      await this.cancelTask(task.taskId);
    }
  }

  /**
   * Get audit trail for task or entire control plane (§27)
   */
  public async getAuditTrail(taskId?: string): Promise<EngineeringControlPlaneEvent[]> {
    return this.controlPlane.persistence.getEvents(taskId);
  }

  /**
   * Get execution status of a task
   */
  public getTaskStatus(taskId: string): EngineeringExecutionResult | undefined {
    let result = this.executions.get(taskId);
    if (!result) {
      const persisted = this.controlPlane.persistence.getTaskSync(taskId);
      if (persisted) {
        const attempts = this.controlPlane.persistence.getAttemptsSync(taskId);
        result = this.mapRecordToExecutionResult(persisted, attempts);
        this.executions.set(taskId, result);
      }
    }
    return result;
  }

  /**
   * List all execution results
   */
  public listTasks(): EngineeringExecutionResult[] {
    return Array.from(this.executions.values());
  }

  /**
   * Format human-friendly Telegram summary according to §17 & §29
   */
  public formatTelegramSummary(record: EngineeringExecutionResult): string {
    const testStatus =
      record.tests.status === 'PASSED'
        ? `PASSED (${record.tests.passed} tests)`
        : record.tests.status === 'FAILED'
        ? `FAILED (${record.tests.failed} failed)`
        : record.tests.status;

    const approvalStatus =
      record.status === 'APPROVED' || record.status === 'COMMITTED' || record.status === 'READY_FOR_DEPLOY'
        ? 'APPROVED'
        : record.approvalId
        ? `PENDING (${record.approvalId})`
        : 'NONE';

    const reviewRes = record.currentAttempt.reviewResult;
    const acSummary = reviewRes?.acceptanceCriteriaResults
      ? `${reviewRes.acceptanceCriteriaResults.filter((a) => a.status === 'PASS').length}/${reviewRes.acceptanceCriteriaResults.length} PASS`
      : 'PASS';

    return (
      `⚙️ *${record.project} — Engineering Execution*\n\n` +
      `*Task ID:* \`${record.taskId}\`\n` +
      `*Status:* ${record.status}\n` +
      `*Executor:* ${record.executor}\n` +
      `*Branch:* \`${record.branch}\`\n` +
      (record.worktreePath ? `*Worktree:* \`${path.basename(record.worktreePath)}\`\n` : '') +
      `*Attempt:* #${record.currentAttempt.attemptNumber}\n\n` +
      `*Changed Files:* ${record.changedFiles.length} file(s)\n` +
      (record.changedFiles.length > 0
        ? record.changedFiles.slice(0, 5).map((f) => `  • \`${f}\``).join('\n') + '\n'
        : '') +
      `*Tests:* ${testStatus}\n` +
      (reviewRes ? `*Review:* ${reviewRes.passed ? 'PASSED ✅' : 'FAILED ❌'}\n` : '') +
      (reviewRes?.securityAssessment ? `*Security:* ${reviewRes.securityAssessment.includes('PASSED') ? 'PASSED ✅' : 'FLAGGED 🚨'}\n` : '') +
      `*Acceptance Criteria:* ${acSummary}\n` +
      (record.commit ? `*Commit:* \`${record.commit.slice(0, 8)}\`\n` : '') +
      `*Approval:* ${approvalStatus}\n` +
      (record.error ? `\n*Error / Reason:*\n_${record.error}_\n` : '') +
      (record.status === 'READY_FOR_APPROVAL'
        ? `\n_Ready for review. Use /approvals to approve or reject._`
        : record.status === 'READY_FOR_DEPLOY'
        ? `\n_Task verified and committed. Ready for deployment._`
        : '')
    );
  }

  private async persistExecutionState(
    context: EngineeringTaskContext,
    record: EngineeringExecutionResult
  ): Promise<void> {
    try {
      const taskRecord: EngineeringTaskRecord = {
        id: record.taskId,
        externalId: context.taskId,
        project: record.project,
        repository: context.repositoryPath || context.repository,
        taskType: context.taskType || 'FEATURE',
        domain: context.domain,
        agent: context.agent || 'AGT_SOFTWARE_ENGINEER',
        executor: record.executor,
        status: record.status as EngineeringLifecycleStatus,
        priority: 'MEDIUM',
        branch: record.branch,
        worktree: record.worktreePath,
        acceptanceCriteria: context.acceptanceCriteria || [],
        constraints: context.constraints || [],
        diffHash: record.diffHash || record.currentAttempt.diffHash,
        commitHash: record.commit,
        approvalId: record.approvalId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        startedAt: record.currentAttempt.startedAt,
        completedAt: record.status === 'READY_FOR_DEPLOY' ? record.updatedAt : undefined,
        cancelledAt: record.status === 'CANCELLED' ? record.updatedAt : undefined,
        failureReason: record.error,
      };
      await this.controlPlane.persistence.saveTask(taskRecord);

      const attemptRecord: EngineeringExecutionAttemptRecord = {
        id: `att_${record.taskId}_${record.currentAttempt.attemptNumber}`,
        taskId: record.taskId,
        attemptNumber: record.currentAttempt.attemptNumber,
        executor: record.executor,
        status: record.currentAttempt.status as EngineeringLifecycleStatus,
        startedAt: record.currentAttempt.startedAt,
        completedAt: record.currentAttempt.completedAt,
        durationMs: record.currentAttempt.durationMs,
        exitCode: record.currentAttempt.exitCode,
        changedFiles: record.currentAttempt.changedFiles,
        diffSummary: record.currentAttempt.diffSummary,
        diffHash: record.currentAttempt.diffHash,
        testResult: record.currentAttempt.tests,
        buildResult: record.currentAttempt.build,
        reviewResult: record.currentAttempt.reviewResult,
        error: record.currentAttempt.error,
        diagnostics: record.currentAttempt.decomposition ? { decomposition: record.currentAttempt.decomposition } : undefined,
        rawLogs: record.currentAttempt.rawLogs,
        commandsExecuted: record.currentAttempt.commandsExecuted,
      };
      await this.controlPlane.persistence.saveAttempt(attemptRecord);
    } catch (err: any) {
      this.logger.debug('persistExecutionState', `Persistence note: ${err.message}`);
    }
  }

  private mapRecordToExecutionResult(
    task: EngineeringTaskRecord,
    attempts: EngineeringExecutionAttemptRecord[]
  ): EngineeringExecutionResult {
    const mappedAttempts: ExecutionAttempt[] = attempts.map((a) => ({
      attemptNumber: a.attemptNumber,
      status: a.status as EngineeringExecutionStatus,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      durationMs: a.durationMs,
      exitCode: a.exitCode,
      changedFiles: a.changedFiles,
      diffSummary: a.diffSummary,
      diffHash: a.diffHash,
      tests: a.testResult,
      build: a.buildResult || { status: 'NOT_APPLICABLE' },
      reviewResult: a.reviewResult,
      error: a.error,
      rawLogs: a.rawLogs || [],
      commandsExecuted: a.commandsExecuted,
    }));

    const currentAttempt: ExecutionAttempt = mappedAttempts[mappedAttempts.length - 1] || {
      attemptNumber: 1,
      status: task.status as EngineeringExecutionStatus,
      startedAt: task.startedAt || task.createdAt,
      changedFiles: [],
      diffSummary: '',
      tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
      build: { status: 'NOT_APPLICABLE' },
      rawLogs: [],
    };

    return {
      taskId: task.id,
      project: task.project,
      executor: task.executor,
      status: task.status as EngineeringExecutionStatus,
      branch: task.branch,
      worktreePath: task.worktree || '',
      changedFiles: currentAttempt.changedFiles || [],
      diffSummary: currentAttempt.diffSummary || '',
      diffHash: task.diffHash || currentAttempt.diffHash,
      tests: {
        run: currentAttempt.tests?.run || 0,
        passed: currentAttempt.tests?.passed || 0,
        failed: currentAttempt.tests?.failed || 0,
        status: currentAttempt.tests?.status || 'SKIPPED',
      },
      build: {
        status: currentAttempt.build?.status || 'NOT_APPLICABLE',
      },
      commit: task.commitHash,
      durationMs: currentAttempt.durationMs || 0,
      error: task.failureReason,
      attempts: mappedAttempts,
      currentAttempt,
      approvalId: task.approvalId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private failAttempt(
    executionResult: EngineeringExecutionResult,
    attempt: ExecutionAttempt,
    failureStatus: EngineeringExecutionStatus,
    errorMessage: string,
    startTime: number,
    context?: EngineeringTaskContext
  ): EngineeringExecutionResult {
    attempt.status = failureStatus;
    attempt.error = errorMessage;
    attempt.completedAt = new Date().toISOString();
    attempt.durationMs = Date.now() - startTime;
    attempt.rawLogs.push(`FAILED: [${failureStatus}] ${errorMessage}`);

    executionResult.status = failureStatus;
    executionResult.error = errorMessage;
    executionResult.durationMs = attempt.durationMs;
    executionResult.updatedAt = new Date().toISOString();

    this.logger.warn('executeTask', `Task ${executionResult.taskId} failed: [${failureStatus}] ${errorMessage}`);
    this.cleanupTaskTracking(executionResult.taskId);
    if (context) {
      this.persistExecutionState(context, executionResult);
    }
    return executionResult;
  }

  private recordBlockedTask(
    context: EngineeringTaskContext,
    executorId: string,
    reason: string
  ): EngineeringExecutionResult {
    const attempt: ExecutionAttempt = {
      attemptNumber: 1,
      status: 'BLOCKED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      changedFiles: [],
      diffSummary: '',
      tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
      build: { status: 'NOT_APPLICABLE' },
      error: reason,
      rawLogs: [`Task blocked immediately: ${reason}`],
    };

    const res: EngineeringExecutionResult = {
      taskId: context.taskId,
      project: context.project,
      executor: executorId,
      status: 'BLOCKED',
      branch: context.branch,
      worktreePath: '',
      changedFiles: [],
      diffSummary: '',
      tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
      build: { status: 'NOT_APPLICABLE' },
      durationMs: 0,
      error: reason,
      attempts: [attempt],
      currentAttempt: attempt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.executions.set(context.taskId, res);
    this.persistExecutionState(context, res);
    return res;
  }

  private recordQueuedTask(
    context: EngineeringTaskContext,
    executorId: string,
    reason: string
  ): EngineeringExecutionResult {
    const attempt: ExecutionAttempt = {
      attemptNumber: 1,
      status: 'QUEUED',
      startedAt: new Date().toISOString(),
      changedFiles: [],
      diffSummary: '',
      tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
      build: { status: 'NOT_APPLICABLE' },
      error: reason,
      rawLogs: [`Task queued: ${reason}`],
    };

    const res: EngineeringExecutionResult = {
      taskId: context.taskId,
      project: context.project,
      executor: executorId,
      status: 'QUEUED',
      branch: context.branch,
      worktreePath: '',
      changedFiles: [],
      diffSummary: '',
      tests: { run: 0, passed: 0, failed: 0, status: 'SKIPPED' },
      build: { status: 'NOT_APPLICABLE' },
      durationMs: 0,
      error: reason,
      attempts: [attempt],
      currentAttempt: attempt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.executions.set(context.taskId, res);
    this.persistExecutionState(context, res);
    return res;
  }

  private cleanupTaskTracking(taskId: string): void {
    const record = this.executions.get(taskId);
    if (record) {
      this.activeBranches.delete(record.branch);
    }
    this.activeWorktrees.delete(taskId);
  }
}
