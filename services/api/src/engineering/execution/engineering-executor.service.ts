// ==========================================================
// services/api/src/engineering/execution/engineering-executor.service.ts
// Phase 15.3: Engineering Executor Orchestration & Real Coding Execution Loop
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

@Injectable()
export class EngineeringExecutorService {
  private readonly logger = new StructuredLogger('EngineeringExecutorService');

  private readonly executions = new Map<string, EngineeringExecutionResult>();
  private readonly activeWorktrees = new Map<string, string>(); // taskId -> worktreePath
  private readonly activeBranches = new Map<string, string>(); // branch -> taskId
  private readonly executors = new Map<string, EngineeringExecutor>();
  public readonly codingWorker: EngineeringCodingWorker;
  public readonly agentReviewer: EngineeringAgentService;

  constructor(
    @Optional() private readonly approvalGate?: ApprovalGateService,
    @Optional() agentReviewer?: EngineeringAgentService,
    @Optional() codingWorker?: EngineeringCodingWorker
  ) {
    this.codingWorker = codingWorker || new EngineeringCodingWorker();
    this.agentReviewer = agentReviewer || new EngineeringAgentService();

    // Register default executors
    const gitWorkspace = new GitWorkspaceAdapter();
    const antigravity = new AntigravityExecutorAdapter(gitWorkspace);
    const codingWorkerAdapter = new CodingWorkerAdapter(gitWorkspace, this.codingWorker);

    this.executors.set('ANTIGRAVITY', antigravity);
    this.executors.set('GIT_WORKTREE', codingWorkerAdapter);
    this.executors.set('CODING_WORKER', codingWorkerAdapter);
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
   * Start or retry an engineering execution task with complete lifecycle tracking
   * and bounded repair loop (§9)
   */
  public async executeTask(context: EngineeringTaskContext): Promise<EngineeringExecutionResult> {
    const taskId = context.taskId;
    const startTime = Date.now();
    const executor = this.getExecutor(context.executor);

    this.logger.info(
      'executeTask',
      `Starting task ${taskId} on repo ${context.repositoryPath} (Executor: ${executor.name})`
    );

    // ── Concurrency & Branch Safety Check (§9 & §22) ─────────────
    const requestedBranch = context.branch;
    const existingTaskOnBranch = this.activeBranches.get(requestedBranch);
    if (existingTaskOnBranch && existingTaskOnBranch !== taskId) {
      this.logger.warn(
        'executeTask',
        `Branch conflict: branch "${requestedBranch}" is already used by task ${existingTaskOnBranch}`
      );
      return this.recordBlockedTask(
        context,
        executor.id,
        `Branch conflict: branch "${requestedBranch}" is currently being used by concurrent task ${existingTaskOnBranch}`
      );
    }

    // ── Multi-attempt History Tracking (§23) ─────────────────────
    let existingRecord = this.executions.get(taskId);
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

    // ── Step 1: Workspace Preparation (§8) ───────────────────────
    let workspace: WorkspaceInfo;
    try {
      currentAttempt.status = 'WORKSPACE_PREPARED';
      executionResult.status = 'WORKSPACE_PREPARED';
      workspace = await executor.prepareWorkspace(context);
      executionResult.worktreePath = workspace.worktreePath;
      this.activeWorktrees.set(taskId, workspace.worktreePath);
      currentAttempt.rawLogs.push(
        `Isolated workspace allocated at: ${workspace.worktreePath} (isWorktree: ${workspace.isWorktree})`
      );
    } catch (err: any) {
      return this.failAttempt(
        executionResult,
        currentAttempt,
        'WORKSPACE_ERROR',
        `Failed to allocate isolated workspace: ${err.message}`,
        startTime
      );
    }

    // ── Step 2: Repository Inspection (§6) ───────────────────────
    let inspection: RepositoryInspection;
    try {
      currentAttempt.status = 'REPOSITORY_INSPECTED';
      executionResult.status = 'REPOSITORY_INSPECTED';
      inspection = await this.codingWorker.inspectRepository(workspace.worktreePath);
      currentAttempt.rawLogs.push(
        `Repository inspected: ${inspection.framework} (${inspection.language}), Package Manager: ${inspection.packageManager}, Test Framework: ${inspection.testFramework}, Clean: ${inspection.cleanWorkingTree}`
      );
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
        startTime
      );
    }
    currentAttempt.rawLogs.push(`Executor check: AVAILABLE (${availability.reason || executor.name})`);

    // ── Step 4 & 5: Iterative Test -> Fix Loop (§9) ──────────────
    // Determine max attempts for this execution invocation
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
        currentAttempt = {
          attemptNumber: attemptNum,
          status: 'EXECUTOR_STARTED',
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
      }

      currentAttempt.status = 'EXECUTOR_STARTED';
      executionResult.status = 'EXECUTOR_STARTED';

      // Task Decomposition (§7)
      const decomposition = this.codingWorker.decomposeTask(context, inspection);
      currentAttempt.decomposition = decomposition;
      currentAttempt.rawLogs.push(
        `Plan [${decomposition.agentRole}]: ${decomposition.implementationStrategy} | Expected files: ${decomposition.filesExpectedToChange.join(', ')}`
      );

      // ── Step 4a: Code Implementation Execution (§8) ────────────
      currentAttempt.status = 'IMPLEMENTING';
      executionResult.status = 'IMPLEMENTING';
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

          const isFatal =
            failStatus === 'ANTIGRAVITY_AUTH_REQUIRED' ||
            failStatus === 'ANTIGRAVITY_PERMISSION_BLOCKED' ||
            failStatus === 'ANTIGRAVITY_UNAVAILABLE' ||
            failStatus === 'EXECUTOR_UNAVAILABLE';

          if (loopAttempt < maxAttempts && !isFatal) {
            previousFailure = implRes.error;
            continue; // Bounded repair loop
          } else {
            return this.failAttempt(
              executionResult,
              currentAttempt,
              failStatus,
              implRes.error || 'Executor implementation returned failure',
              startTime
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
            startTime
          );
        }
      }

      // ── Step 4b: Targeted Testing Execution (§10) ──────────────
      currentAttempt.status = 'TESTING';
      executionResult.status = 'TESTING';
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
              startTime
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
            startTime
          );
        }
      }
    }

    // ── Step 6: Diff Collection (§8) ─────────────────────────────
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
      currentAttempt.rawLogs.push(
        `Diff collected: ${changedFiles.length} file(s) changed: ${changedFiles.join(', ')}`
      );

      // Verify at least one file was changed
      if (changedFiles.length === 0 && !implChangesMade) {
        return this.failAttempt(
          executionResult,
          currentAttempt,
          'REVIEW_FAILED',
          'Zero files changed in isolated worktree. No implementation evidence exists.',
          startTime
        );
      }
    } catch (err: any) {
      currentAttempt.rawLogs.push(`Diff collection notice: ${err.message}`);
    }

    // ── Step 7: Engineering Supervisor Review (§12 & §13) ────────
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

    if (!reviewResult.passed) {
      return this.failAttempt(
        executionResult,
        currentAttempt,
        'REVIEW_FAILED',
        `Engineering Review rejected: ${reviewResult.feedback}`,
        startTime
      );
    }

    // ── Step 8: Ready for Approval Gate (§18) ────────────────────
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

    this.logger.info(
      'executeTask',
      `Task ${taskId} reached READY_FOR_APPROVAL after ${currentAttempt.attemptNumber} attempt(s)`
    );

    return executionResult;
  }

  /**
   * Handle approval resolution callback
   */
  public async handleApprovalResolution(
    taskId: string,
    approved: boolean,
    resolvedBy: string
  ): Promise<EngineeringExecutionResult | undefined> {
    const record = this.executions.get(taskId);
    if (!record) return undefined;

    const executor = this.getExecutor(record.executor);

    if (!approved) {
      record.status = 'APPROVAL_REJECTED';
      record.currentAttempt.status = 'APPROVAL_REJECTED';
      record.currentAttempt.rawLogs.push(`Approval REJECTED by ${resolvedBy}`);
      record.error = `Approval rejected by ${resolvedBy}`;
      this.cleanupTaskTracking(taskId);
      return record;
    }

    // Approved: commit and transition to READY_FOR_DEPLOY (§20)
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
        record.status = 'COMMITTED';
        record.currentAttempt.status = 'COMMITTED';
        record.currentAttempt.rawLogs.push(`Committed to branch ${record.branch}: ${commitHash}`);

        // Mark ready for deploy (autonomous deploy out of scope as per §18 & §27)
        record.status = 'READY_FOR_DEPLOY';
        record.currentAttempt.status = 'READY_FOR_DEPLOY';
      }
    } catch (err: any) {
      record.status = 'MERGE_FAILED';
      record.error = `Failed to commit changes: ${err.message}`;
    }

    this.cleanupTaskTracking(taskId);
    return record;
  }

  /**
   * Cancel an in-flight engineering task and cleanup its workspace
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    const record = this.executions.get(taskId);
    if (!record) return false;

    record.status = 'CANCELLED';
    record.currentAttempt.status = 'CANCELLED';
    record.currentAttempt.rawLogs.push('Execution cancelled by user request');

    const worktreePath = this.activeWorktrees.get(taskId);
    if (worktreePath) {
      const executor = this.getExecutor(record.executor);
      await executor.cleanupWorkspace(worktreePath);
    }

    this.cleanupTaskTracking(taskId);
    return true;
  }

  /**
   * Get execution status of a task
   */
  public getTaskStatus(taskId: string): EngineeringExecutionResult | undefined {
    return this.executions.get(taskId);
  }

  /**
   * List all execution results
   */
  public listTasks(): EngineeringExecutionResult[] {
    return Array.from(this.executions.values());
  }

  /**
   * Format human-friendly Telegram summary according to §17
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

  private failAttempt(
    executionResult: EngineeringExecutionResult,
    attempt: ExecutionAttempt,
    failureStatus: EngineeringExecutionStatus,
    errorMessage: string,
    startTime: number
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
