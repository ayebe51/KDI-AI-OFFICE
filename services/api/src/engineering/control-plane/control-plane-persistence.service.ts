// ==========================================================
// services/api/src/engineering/control-plane/control-plane-persistence.service.ts
// Phase 15.5: Control Plane Persistent Storage (§4, §5, §25, §26, §27)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import { StructuredLogger } from '@kdi/shared';
import type { PostgresService } from '../../database/postgres.service.js';
import type {
  EngineeringTaskRecord,
  EngineeringExecutionAttemptRecord,
  WorktreeLeaseRecord,
  EngineeringControlPlaneEvent,
  EngineeringLifecycleStatus,
} from './engineering-control-plane.types.js';

export class ControlPlanePersistenceService {
  private readonly logger = new StructuredLogger('ControlPlanePersistenceService');

  // In-memory fast cache
  private readonly tasks = new Map<string, EngineeringTaskRecord>();
  private readonly attempts = new Map<string, EngineeringExecutionAttemptRecord[]>(); // taskId -> attempts
  private readonly leases = new Map<string, WorktreeLeaseRecord>(); // leaseId or path -> lease
  private readonly events = new Map<string, EngineeringControlPlaneEvent[]>(); // taskId -> events

  private readonly storageDir: string;
  private readonly tasksFile: string;
  private readonly attemptsFile: string;
  private readonly leasesFile: string;
  private readonly eventsFile: string;

  constructor(
    private readonly postgresService?: PostgresService,
    storageDir?: string
  ) {
    this.storageDir = storageDir || path.resolve(process.cwd(), '.worktrees', 'control-plane');
    this.tasksFile = path.join(this.storageDir, 'tasks.json');
    this.attemptsFile = path.join(this.storageDir, 'attempts.json');
    this.leasesFile = path.join(this.storageDir, 'leases.json');
    this.eventsFile = path.join(this.storageDir, 'events.json');

    this.ensureStorageDir();
    this.loadFromDisk();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch (err: any) {
        this.logger.debug('ensureStorageDir', `Storage dir warning: ${err.message}`);
      }
    }
  }

  /**
   * Load state from durable disk file upon initialization (§4 & §14)
   */
  public loadFromDisk(): void {
    try {
      if (fs.existsSync(this.tasksFile)) {
        const data = JSON.parse(fs.readFileSync(this.tasksFile, 'utf-8'));
        if (Array.isArray(data)) {
          for (const item of data) {
            this.tasks.set(item.id, item);
          }
        }
      }

      if (fs.existsSync(this.attemptsFile)) {
        const data = JSON.parse(fs.readFileSync(this.attemptsFile, 'utf-8'));
        if (typeof data === 'object' && data !== null) {
          for (const [taskId, list] of Object.entries(data)) {
            if (Array.isArray(list)) {
              this.attempts.set(taskId, list as EngineeringExecutionAttemptRecord[]);
            }
          }
        }
      }

      if (fs.existsSync(this.leasesFile)) {
        const data = JSON.parse(fs.readFileSync(this.leasesFile, 'utf-8'));
        if (Array.isArray(data)) {
          for (const lease of data) {
            this.leases.set(lease.leaseId, lease);
          }
        }
      }

      if (fs.existsSync(this.eventsFile)) {
        const data = JSON.parse(fs.readFileSync(this.eventsFile, 'utf-8'));
        if (typeof data === 'object' && data !== null) {
          for (const [taskId, list] of Object.entries(data)) {
            if (Array.isArray(list)) {
              this.events.set(taskId, list as EngineeringControlPlaneEvent[]);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn('loadFromDisk', `Error restoring persistent state from disk: ${err.message}`);
    }
  }

  private flushTasksToDisk(): void {
    try {
      this.ensureStorageDir();
      const list = Array.from(this.tasks.values());
      const tempPath = `${this.tasksFile}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.tasksFile);
    } catch (err: any) {
      this.logger.debug('flushTasksToDisk', `Disk flush warning: ${err.message}`);
    }
  }

  private flushAttemptsToDisk(): void {
    try {
      this.ensureStorageDir();
      const obj: Record<string, EngineeringExecutionAttemptRecord[]> = {};
      for (const [k, v] of this.attempts.entries()) {
        obj[k] = v;
      }
      const tempPath = `${this.attemptsFile}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(obj, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.attemptsFile);
    } catch (err: any) {
      this.logger.debug('flushAttemptsToDisk', `Disk flush warning: ${err.message}`);
    }
  }

  private flushLeasesToDisk(): void {
    try {
      this.ensureStorageDir();
      const list = Array.from(this.leases.values());
      const tempPath = `${this.leasesFile}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.leasesFile);
    } catch (err: any) {
      this.logger.debug('flushLeasesToDisk', `Disk flush warning: ${err.message}`);
    }
  }

  private flushEventsToDisk(): void {
    try {
      this.ensureStorageDir();
      const obj: Record<string, EngineeringControlPlaneEvent[]> = {};
      for (const [k, v] of this.events.entries()) {
        obj[k] = v;
      }
      const tempPath = `${this.eventsFile}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(obj, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.eventsFile);
    } catch (err: any) {
      this.logger.debug('flushEventsToDisk', `Disk flush warning: ${err.message}`);
    }
  }

  // ── Task CRUD (§4) ──────────────────────────────────────────

  public async saveTask(task: EngineeringTaskRecord): Promise<void> {
    this.tasks.set(task.id, task);
    this.flushTasksToDisk();

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO engineering_control_tasks (
             id, external_id, project, repository, task_type, domain, agent,
             executor, status, priority, branch, worktree, acceptance_criteria,
             constraints, diff_hash, commit_hash, approval_id, created_at, updated_at,
             started_at, completed_at, cancelled_at, failure_reason, metadata
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
             $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
           ) ON CONFLICT (id) DO UPDATE SET
             status = $9, updated_at = $19, diff_hash = $15, commit_hash = $16,
             completed_at = $21, cancelled_at = $22, failure_reason = $23, metadata = $24`,
          [
            task.id,
            task.externalId || null,
            task.project,
            task.repository,
            task.taskType,
            task.domain || null,
            task.agent,
            task.executor,
            task.status,
            task.priority,
            task.branch,
            task.worktree || null,
            JSON.stringify(task.acceptanceCriteria),
            JSON.stringify(task.constraints),
            task.diffHash || null,
            task.commitHash || null,
            task.approvalId || null,
            task.createdAt,
            task.updatedAt,
            task.startedAt || null,
            task.completedAt || null,
            task.cancelledAt || null,
            task.failureReason || null,
            JSON.stringify(task.metadata || {}),
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveTask', `PostgreSQL task write fallback: ${err.message}`);
      }
    }
  }

  public async getTask(taskId: string): Promise<EngineeringTaskRecord | undefined> {
    return this.tasks.get(taskId);
  }

  public getTaskSync(taskId: string): EngineeringTaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  public async listTasks(filter?: {
    project?: string;
    status?: EngineeringLifecycleStatus;
  }): Promise<EngineeringTaskRecord[]> {
    return this.listTasksSync(filter);
  }

  public listTasksSync(filter?: {
    project?: string;
    status?: EngineeringLifecycleStatus;
  }): EngineeringTaskRecord[] {
    let result = Array.from(this.tasks.values());
    if (filter?.project) {
      result = result.filter((t) => t.project === filter.project);
    }
    if (filter?.status) {
      result = result.filter((t) => t.status === filter.status);
    }
    return result;
  }

  public getAttemptsSync(taskId: string): EngineeringExecutionAttemptRecord[] {
    return this.attempts.get(taskId) || [];
  }

  // ── Execution Attempt Persistence (§5) ───────────────────────

  public async saveAttempt(attempt: EngineeringExecutionAttemptRecord): Promise<void> {
    const list = this.attempts.get(attempt.taskId) || [];
    const existingIndex = list.findIndex((a) => a.attemptNumber === attempt.attemptNumber);
    if (existingIndex >= 0) {
      list[existingIndex] = attempt;
    } else {
      list.push(attempt);
    }
    this.attempts.set(attempt.taskId, list);
    this.flushAttemptsToDisk();

    const pool = this.postgresService?.getPool();
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO engineering_execution_attempts (
             id, task_id, attempt_number, executor, status, started_at,
             completed_at, duration_ms, exit_code, changed_files, diff_summary,
             diff_hash, tests_result, error, diagnostics, raw_logs
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO UPDATE SET
             status = $5, completed_at = $7, duration_ms = $8, exit_code = $9,
             changed_files = $10, diff_summary = $11, tests_result = $13, error = $14`,
          [
            attempt.id,
            attempt.taskId,
            attempt.attemptNumber,
            attempt.executor,
            attempt.status,
            attempt.startedAt,
            attempt.completedAt || null,
            attempt.durationMs || null,
            attempt.exitCode || null,
            JSON.stringify(attempt.changedFiles),
            attempt.diffSummary,
            attempt.diffHash || null,
            JSON.stringify(attempt.testResult),
            attempt.error || null,
            JSON.stringify(attempt.diagnostics || {}),
            JSON.stringify(attempt.rawLogs),
          ]
        );
      } catch (err: any) {
        this.logger.debug('saveAttempt', `PostgreSQL attempt write fallback: ${err.message}`);
      }
    }
  }

  public async getAttempts(taskId: string): Promise<EngineeringExecutionAttemptRecord[]> {
    return this.attempts.get(taskId) || [];
  }

  // ── Worktree Lease Persistence (§12) ─────────────────────────

  public async saveLease(lease: WorktreeLeaseRecord): Promise<void> {
    this.leases.set(lease.leaseId, lease);
    this.flushLeasesToDisk();
  }

  public async getLease(leaseId: string): Promise<WorktreeLeaseRecord | undefined> {
    return this.leases.get(leaseId);
  }

  public async getLeaseByPath(worktreePath: string): Promise<WorktreeLeaseRecord | undefined> {
    const norm = path.normalize(worktreePath).toLowerCase();
    for (const l of this.leases.values()) {
      if (path.normalize(l.path).toLowerCase() === norm) {
        return l;
      }
    }
    return undefined;
  }

  public async getLeaseByTaskId(taskId: string): Promise<WorktreeLeaseRecord | undefined> {
    for (const l of this.leases.values()) {
      if (l.taskId === taskId) {
        return l;
      }
    }
    return undefined;
  }

  public async listLeases(): Promise<WorktreeLeaseRecord[]> {
    return Array.from(this.leases.values());
  }

  // ── Structured Events & Audit Trail (§25, §26, §27) ──────────

  public async saveEvent(event: EngineeringControlPlaneEvent): Promise<void> {
    const list = this.events.get(event.taskId) || [];
    list.push(event);
    this.events.set(event.taskId, list);
    this.flushEventsToDisk();
  }

  public async getEvents(taskId?: string): Promise<EngineeringControlPlaneEvent[]> {
    if (taskId) {
      return this.events.get(taskId) || [];
    }
    const all: EngineeringControlPlaneEvent[] = [];
    for (const list of this.events.values()) {
      all.push(...list);
    }
    return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ── Administrative / Testing Cleanup (§27 & §39) ──────────────

  public clearTask(taskId: string): void {
    this.tasks.delete(taskId);
    this.attempts.delete(taskId);
    this.events.delete(taskId);
    this.flushTasksToDisk();
    this.flushAttemptsToDisk();
    this.flushEventsToDisk();
  }

  public clearAll(): void {
    this.tasks.clear();
    this.attempts.clear();
    this.leases.clear();
    this.events.clear();
    this.flushTasksToDisk();
    this.flushAttemptsToDisk();
    this.flushLeasesToDisk();
    this.flushEventsToDisk();
  }
}
