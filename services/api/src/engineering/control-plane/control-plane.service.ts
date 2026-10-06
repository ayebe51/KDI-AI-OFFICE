// ==========================================================
// services/api/src/engineering/control-plane/control-plane.service.ts
// Phase 15.5: Unified Engineering Control Plane Service
// ==========================================================

import * as path from 'path';
import * as fs from 'fs';
import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import { ControlPlanePersistenceService } from './control-plane-persistence.service.js';
import { EngineeringStateMachine } from './state-machine.js';
import { EngineeringQueueService } from './queue.service.js';
import { WorktreeLeaseService } from './worktree-lease.service.js';
import { RecoveryService } from './recovery.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { DiffIntegrityService } from './diff-integrity.service.js';
import { EngineeringHostService } from '../execution/engineering-host.service.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import type {
  EngineeringTaskRecord,
  EngineeringExecutionAttemptRecord,
  EngineeringControlPlaneEvent,
  EngineeringControlPlaneSummary,
  EngineeringLifecycleStatus,
  TaskRecoveryAction,
  RecoveryAssessment,
} from './engineering-control-plane.types.js';
import type { EngineeringTaskContext } from '../execution/engineering-execution.types.js';

@Injectable()
export class ControlPlaneService {
  private readonly logger = new StructuredLogger('ControlPlaneService');

  public readonly persistence: ControlPlanePersistenceService;
  public readonly queue: EngineeringQueueService;
  public readonly leaseService: WorktreeLeaseService;
  public readonly recoveryService: RecoveryService;
  public readonly idempotency: IdempotencyService;
  public readonly diffIntegrity: DiffIntegrityService;
  public readonly hostService: EngineeringHostService;
  public readonly approvalGate: ApprovalGateService;

  // Repository Allowlist (§35)
  private readonly approvedRepositories = new Set<string>();

  constructor(
    @Optional() persistence?: ControlPlanePersistenceService,
    @Optional() queue?: EngineeringQueueService,
    @Optional() leaseService?: WorktreeLeaseService,
    @Optional() recoveryService?: RecoveryService,
    @Optional() hostService?: EngineeringHostService,
    @Optional() approvalGate?: ApprovalGateService
  ) {
    this.persistence = persistence || new ControlPlanePersistenceService();
    this.queue = queue || new EngineeringQueueService();
    this.leaseService = leaseService || new WorktreeLeaseService(this.persistence);
    this.recoveryService = recoveryService || new RecoveryService(this.persistence, this.leaseService);
    this.idempotency = new IdempotencyService();
    this.diffIntegrity = new DiffIntegrityService();
    this.hostService = hostService || new EngineeringHostService();
    this.approvalGate = approvalGate || new ApprovalGateService();

    // Auto-register demo and workspace repos from current directory or workspace root
    const cur = process.cwd();
    this.registerApprovedRepository(cur);

    // Locate workspace root if run from subfolder
    let root = path.resolve(cur);
    while (root !== path.dirname(root)) {
      if (fs.existsSync(path.join(root, 'fixtures', 'demo-calc-repo'))) {
        this.registerApprovedRepository(root);
        break;
      }
      root = path.dirname(root);
    }

    const demoPath = path.resolve(root, 'fixtures/demo-calc-repo');
    if (fs.existsSync(demoPath)) {
      this.registerApprovedRepository(demoPath);
    }
    const aiEngPath = path.resolve(root, 'fixtures/ai-engineering-repo');
    if (fs.existsSync(aiEngPath)) {
      this.registerApprovedRepository(aiEngPath);
    }
  }

  /**
   * Register an approved repository path (§35)
   */
  public registerApprovedRepository(repoPath: string): void {
    const norm = path.normalize(repoPath).toLowerCase();
    this.approvedRepositories.add(norm);
  }

  /**
   * Validate whether a target repository path is on the approved allowlist (§35)
   */
  public isRepositoryAllowed(repoPath: string): boolean {
    const norm = path.normalize(repoPath).toLowerCase();
    for (const approved of this.approvedRepositories) {
      if (norm === approved || norm.startsWith(approved)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Audit log event creator helper (§25 & §26)
   */
  public async recordEvent(event: Omit<EngineeringControlPlaneEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: EngineeringControlPlaneEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    await this.persistence.saveEvent(fullEvent);
  }

  /**
   * Emit state transition with strict validation and audit logging (§7 & §26)
   */
  public async transitionTaskStatus(
    taskId: string,
    targetStatus: EngineeringLifecycleStatus,
    actor = 'System',
    reason?: string
  ): Promise<EngineeringTaskRecord> {
    const task = await this.persistence.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in control plane persistence`);
    }

    EngineeringStateMachine.assertTransition(task.status, targetStatus, taskId);

    const oldStatus = task.status;
    task.status = targetStatus;
    task.updatedAt = new Date().toISOString();
    if (reason) {
      task.failureReason = reason;
    }
    if (targetStatus === 'CANCELLED') {
      task.cancelledAt = new Date().toISOString();
    }
    if (targetStatus === 'READY_FOR_DEPLOY') {
      task.completedAt = new Date().toISOString();
    }

    await this.persistence.saveTask(task);

    await this.recordEvent({
      taskId,
      type: `STATUS_${targetStatus}`,
      actor,
      severity: targetStatus.includes('FAIL') || targetStatus.includes('ERROR') ? 'ERROR' : 'INFO',
      message: `Task transitioned from ${oldStatus} to ${targetStatus}${reason ? `: ${reason}` : ''}`,
      metadata: { oldStatus, targetStatus, reason },
    });

    return task;
  }

  /**
   * Get complete control plane status summary (§28 & §45)
   */
  public async getSummary(): Promise<EngineeringControlPlaneSummary> {
    const allTasks = await this.persistence.listTasks();
    let running = 0;
    let queued = this.queue.getQueuedCount();
    let awaitingApproval = 0;
    let failed = 0;
    let recoverable = 0;
    let blocked = 0;

    for (const t of allTasks) {
      if (EngineeringStateMachine.isInFlight(t.status)) {
        running++;
      } else if (t.status === 'READY_FOR_APPROVAL') {
        awaitingApproval++;
      } else if (
        t.status === 'EXECUTION_FAILED' ||
        t.status === 'TEST_FAILED' ||
        t.status === 'COMMAND_FAILED' ||
        t.status === 'ANTIGRAVITY_FAILED'
      ) {
        failed++;
      } else if (t.status === 'RECOVERY_REQUIRED' || t.status === 'STALE') {
        recoverable++;
      } else if (t.status === 'BLOCKED') {
        blocked++;
      }
    }

    const hostStatus = await this.hostService.getHostStatus();

    return {
      running,
      queued,
      awaitingApproval,
      failed,
      recoverable,
      blocked,
      queueStatus: this.queue.getQueueStatus(),
      activeExecutors: hostStatus.availableExecutors,
      activeHosts: 1,
    };
  }

  /**
   * Format human-friendly Telegram control center card (§28)
   */
  public async formatTelegramControlSummary(): Promise<string> {
    const s = await this.getSummary();
    return (
      `⚙️ *ENGINEERING CONTROL*\n\n` +
      `*Running:* ${s.running}\n` +
      `*Queued:* ${s.queued}\n` +
      `*Awaiting Approval:* ${s.awaitingApproval}\n` +
      `*Failed:* ${s.failed}\n` +
      `*Recoverable:* ${s.recoverable}\n` +
      `*Blocked:* ${s.blocked}\n\n` +
      `*Queue State:* ${s.queueStatus === 'QUEUE_RUNNING' ? 'RUNNING 🟢' : 'PAUSED ⏸️'}\n` +
      `*Available Executors:* ${s.activeExecutors.join(', ')}\n\n` +
      `_Use /engineering status <taskId> for detailed operational card._`
    );
  }
}
