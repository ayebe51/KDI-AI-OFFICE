// ==========================================================
// services/api/src/engineering/control-plane/recovery.service.ts
// Phase 15.5: Startup Recovery, Orphan Reconciler & Failure Classification Engine (§13, §14, §15, §16, §17, §44)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { StructuredLogger } from '@kdi/shared';
import type { ControlPlanePersistenceService } from './control-plane-persistence.service.js';
import type { WorktreeLeaseService } from './worktree-lease.service.js';
import { EngineeringStateMachine } from './state-machine.js';
import type {
  EngineeringTaskRecord,
  RecoveryAssessment,
  TaskRecoveryAction,
  EngineeringLifecycleStatus,
} from './engineering-control-plane.types.js';

const execAsync = promisify(exec);

export class RecoveryService {
  private readonly logger = new StructuredLogger('RecoveryService');

  constructor(
    private readonly persistence: ControlPlanePersistenceService,
    private readonly leaseService: WorktreeLeaseService
  ) {}

  /**
   * Check if a system process PID is currently alive on the host
   */
  public isProcessAlive(pid?: number): boolean {
    if (!pid || pid <= 0) return false;
    try {
      // process.kill(pid, 0) tests whether process exists without sending a fatal signal
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Classify whether a failure is retryable or non-retryable (§15)
   */
  public isRetryableFailure(status: EngineeringLifecycleStatus, error?: string): boolean {
    const nonRetryableStatuses = new Set<EngineeringLifecycleStatus>([
      'AUTH_REQUIRED',
      'PERMISSION_BLOCKED',
      'ANTIGRAVITY_AUTH_REQUIRED',
      'ANTIGRAVITY_PERMISSION_BLOCKED',
      'CANCELLED',
      'APPROVAL_REJECTED',
    ]);

    if (nonRetryableStatuses.has(status)) {
      return false;
    }

    const errLower = (error || '').toLowerCase();
    if (
      errLower.includes('auth') ||
      errLower.includes('login') ||
      errLower.includes('credential') ||
      errLower.includes('permission denied') ||
      errLower.includes('access denied') ||
      errLower.includes('security_violation') ||
      errLower.includes('protected branch')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Reconcile all tasks upon server startup / crash recovery (§14 & §44)
   * Prevents fake success: unverified in-flight tasks become RECOVERY_REQUIRED
   */
  public async reconcileStartup(): Promise<RecoveryAssessment[]> {
    this.logger.info('reconcileStartup', 'Beginning startup recovery reconciliation scan...');
    const allTasks = await this.persistence.listTasks();
    const assessments: RecoveryAssessment[] = [];
    const activeTaskIds = new Set<string>();

    for (const task of allTasks) {
      // Check if task was in-flight when previous process crashed / terminated
      const inFlight = EngineeringStateMachine.isInFlight(task.status) || task.status === 'QUEUED';

      if (!inFlight) {
        continue;
      }

      activeTaskIds.add(task.id);
      const assessment = await this.assessTask(task);
      assessments.push(assessment);

      // Transition task state to RECOVERY_REQUIRED or STALE if process is dead
      if (!assessment.actualProcessAlive) {
        task.status = 'RECOVERY_REQUIRED';
        task.failureReason = `Interrupted by system restart or process termination: ${assessment.reason}`;
        task.updatedAt = new Date().toISOString();
        await this.persistence.saveTask(task);

        await this.persistence.saveEvent({
          id: `ev_rec_${task.id}_${Date.now()}`,
          taskId: task.id,
          type: 'RECOVERY_REQUIRED',
          actor: 'SystemRecovery',
          timestamp: new Date().toISOString(),
          severity: 'WARN',
          message: `Task marked RECOVERY_REQUIRED on startup. Recommendation: ${assessment.recommendedAction}. Reason: ${assessment.reason}`,
          metadata: { assessment },
        });

        this.logger.warn(
          'reconcileStartup',
          `Task ${task.id} reconciled to RECOVERY_REQUIRED. Action recommended: ${assessment.recommendedAction}`
        );
      }
    }

    // Inspect orphaned worktrees on disk (§13)
    const orphans = await this.leaseService.detectOrphanWorktrees(activeTaskIds);
    if (orphans.length > 0) {
      this.logger.info(
        'reconcileStartup',
        `Pruning ${orphans.length} orphaned worktree(s) left over from prior runs...`
      );
      await this.leaseService.pruneOrphans(orphans);
    }

    this.logger.info(
      'reconcileStartup',
      `Startup reconciliation completed: ${assessments.length} in-flight task(s) evaluated.`
    );
    return assessments;
  }

  /**
   * Deeply inspect physical worktree and git state to assess recovery action (§16)
   */
  public async assessTask(task: EngineeringTaskRecord): Promise<RecoveryAssessment> {
    const processAlive = this.isProcessAlive(task.executorPid);
    let worktreeExists = false;
    let gitStatusClean = true;
    let diffPresent = false;
    let details = '';

    if (task.worktree && fs.existsSync(task.worktree)) {
      worktreeExists = true;
      try {
        const { stdout: statusOut } = await execAsync('git status --porcelain', {
          cwd: task.worktree,
        });
        const trimmed = statusOut.trim();
        gitStatusClean = trimmed.length === 0;
        diffPresent = trimmed.length > 0;
      } catch (err: any) {
        details += ` Git status check error: ${err.message};`;
      }
    }

    let recommendedAction: TaskRecoveryAction = 'RETRY';
    let reason = '';

    if (processAlive) {
      recommendedAction = 'RESUME';
      reason = `Executor process PID ${task.executorPid} is still actively running.`;
    } else if (!worktreeExists) {
      recommendedAction = 'RECREATE_WORKTREE';
      reason = 'Executor process terminated and worktree directory no longer exists on disk.';
    } else if (diffPresent) {
      recommendedAction = 'RESUME';
      reason = 'Uncommitted modifications exist in isolated worktree. Can inspect and continue attempt.';
    } else {
      recommendedAction = 'RETRY';
      reason = 'Executor process terminated without completed diff. Clean retry recommended.';
    }

    return {
      taskId: task.id,
      currentStatus: task.status,
      actualProcessAlive: processAlive,
      worktreeExists,
      gitStatusClean,
      diffPresent,
      recommendedAction,
      reason,
    };
  }
}
