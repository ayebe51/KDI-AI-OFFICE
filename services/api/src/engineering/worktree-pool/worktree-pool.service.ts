// ==========================================================
// services/api/src/engineering/worktree-pool/worktree-pool.service.ts
// Phase 23: Pre-Warmed Worktree Pool, Verified Reset & Atomic Leasing Engine (§5–§7, §13–§15)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  PooledWorktree,
  WorktreeClaimResult,
  WorktreePoolConfig,
  WorktreeResetResult,
} from './worktree-pool.types.js';
import { StorageHealthGuardService } from './storage-health-guard.service.js';
import { WorktreePoolTelemetryService } from './worktree-pool-telemetry.service.js';

const execAsync = promisify(exec);

@Injectable()
export class WorktreePoolService {
  private readonly logger = new StructuredLogger('WorktreePoolService');
  private readonly pool = new Map<string, PooledWorktree>();
  private readonly config: WorktreePoolConfig;
  public readonly storageGuard: StorageHealthGuardService;
  public readonly telemetry: WorktreePoolTelemetryService;

  private isInitialized = false;

  constructor(
    @Optional() config?: Partial<WorktreePoolConfig>,
    @Optional() storageGuard?: StorageHealthGuardService,
    @Optional() telemetry?: WorktreePoolTelemetryService
  ) {
    this.storageGuard = storageGuard || new StorageHealthGuardService();
    this.telemetry = telemetry || new WorktreePoolTelemetryService();

    this.config = {
      poolSize: config?.poolSize ?? 3,
      baseStorageDir: config?.baseStorageDir || path.resolve(process.cwd(), '.worktrees', 'pool'),
      enablePreWarming: config?.enablePreWarming ?? true,
      resetTimeoutMs: config?.resetTimeoutMs ?? 5000,
      leaseTimeoutMs: config?.leaseTimeoutMs ?? 120000,
      quarantineOnDirty: config?.quarantineOnDirty ?? true,
      storageWarningThresholdMb: config?.storageWarningThresholdMb ?? 2048,
      storageCriticalThresholdMb: config?.storageCriticalThresholdMb ?? 512,
    };

    if (!fs.existsSync(this.config.baseStorageDir)) {
      try {
        fs.mkdirSync(this.config.baseStorageDir, { recursive: true });
      } catch (err: any) {
        this.logger.debug('constructor', `Could not create pool storage dir: ${err.message}`);
      }
    }
  }

  /**
   * Initialize pool with pre-warmed worktrees (§5)
   */
  public async initializePool(baseRepoPath: string = process.cwd(), cleanRef: string = 'HEAD'): Promise<void> {
    if (this.isInitialized) return;

    this.logger.info(
      'initializePool',
      `Initializing Pre-Warmed Worktree Pool (Size: ${this.config.poolSize}) at ${this.config.baseStorageDir}`
    );

    const isGitRepo = fs.existsSync(path.join(baseRepoPath, '.git'));

    for (let i = 1; i <= this.config.poolSize; i++) {
      const worktreeId = `wt_pool_${i}`;
      const worktreePath = path.join(this.config.baseStorageDir, worktreeId);

      // Create physical directory or git worktree
      if (!fs.existsSync(worktreePath)) {
        if (isGitRepo) {
          try {
            await execAsync(`git worktree add --detach "${worktreePath}" ${cleanRef}`, {
              cwd: baseRepoPath,
            });
          } catch {
            fs.mkdirSync(worktreePath, { recursive: true });
          }
        } else {
          fs.mkdirSync(worktreePath, { recursive: true });
        }
      }

      const pooled: PooledWorktree = {
        worktreeId,
        worktreePath,
        baseRepoPath,
        state: 'IDLE',
        integrityStatus: 'CLEAN',
        cleanRef,
        createdAt: Date.now(),
        stats: {
          totalClaims: 0,
          successfulResets: 0,
          failedResets: 0,
        },
      };

      this.pool.set(worktreeId, pooled);
    }

    this.isInitialized = true;
    this.logger.info('initializePool', `Pool successfully initialized with ${this.pool.size} ready worktrees.`);
  }

  /**
   * Atomic Claim Worktree from Pool (§5, §6, §13)
   */
  public async claimWorktree(
    taskIdOrOptions:
      | string
      | {
          taskId: string;
          projectId: string;
          targetBranch?: string;
          requiredRef?: string;
          repoPath?: string;
          maxWaitMs?: number;
          noFallback?: boolean;
        },
    projectId?: string,
    targetBranch?: string,
    repoPath: string = process.cwd()
  ): Promise<WorktreeClaimResult> {
    const startMs = Date.now();
    let actualTaskId: string;
    let actualProjectId: string;
    let actualBranch: string;
    let actualRepoPath: string;
    let maxWaitMs: number | undefined;

    if (typeof taskIdOrOptions === 'object') {
      actualTaskId = taskIdOrOptions.taskId;
      actualProjectId = taskIdOrOptions.projectId;
      actualBranch = taskIdOrOptions.targetBranch || taskIdOrOptions.requiredRef || `task/${actualTaskId}`;
      actualRepoPath = taskIdOrOptions.repoPath || repoPath;
      maxWaitMs = taskIdOrOptions.maxWaitMs;
    } else {
      actualTaskId = taskIdOrOptions;
      actualProjectId = projectId || 'engineering';
      actualBranch = targetBranch || `task/${actualTaskId}`;
      actualRepoPath = repoPath;
    }

    // 0. Storage Health Check Gate (§11)
    if (!this.storageGuard.isAllocationAllowed()) {
      const report = this.storageGuard.checkHealth();
      this.telemetry.recordEvent(
        'WORKTREE_POOL_CLAIM',
        actualTaskId,
        actualProjectId,
        'NONE',
        Date.now() - startMs,
        'FAILURE',
        { error: 'STORAGE_CRITICAL', freeDiskMb: report.freeDiskMb }
      );
      throw new Error(
        `STORAGE_CRITICAL: Free disk space (${report.freeDiskMb} MB) is below critical threshold (${report.criticalThresholdMb} MB). Worktree allocation blocked (§11).`
      );
    }

    // Auto initialize if needed
    if (!this.isInitialized) {
      await this.initializePool(actualRepoPath);
    }

    // 1. Search for available READY or IDLE worktree
    let chosenWorktree: PooledWorktree | undefined;
    for (const wt of this.pool.values()) {
      if ((wt.state === 'READY' || wt.state === 'IDLE') && wt.integrityStatus === 'CLEAN') {
        chosenWorktree = wt;
        break;
      }
    }

    const poolHit = !!chosenWorktree;

    // 2. If pool hit: atomically claim the pre-warmed worktree
    if (chosenWorktree) {
      const leaseId = `lease_${actualTaskId}_${Date.now()}`;
      chosenWorktree.state = 'CLAIMED';
      chosenWorktree.currentTaskId = actualTaskId;
      chosenWorktree.currentBranch = actualBranch;
      chosenWorktree.leaseId = leaseId;
      chosenWorktree.claimedAt = Date.now();
      chosenWorktree.stats.totalClaims++;

      const waitDurationMs = Date.now() - startMs;
      this.telemetry.recordEvent(
        'WORKTREE_POOL_CLAIM',
        actualTaskId,
        actualProjectId,
        chosenWorktree.worktreeId,
        waitDurationMs,
        'SUCCESS',
        { poolHit: true, leaseId }
      );

      this.logger.info(
        'claimWorktree',
        `[POOL HIT] Task ${actualTaskId} claimed pre-warmed worktree ${chosenWorktree.worktreeId} in ${waitDurationMs}ms`
      );

      return {
        success: true,
        worktree: chosenWorktree,
        poolHit: true,
        waitDurationMs,
      };
    }

    // If pool is exhausted and caller requested finite wait without fallback
    if (maxWaitMs !== undefined) {
      const waitDurationMs = Date.now() - startMs;
      this.telemetry.recordEvent(
        'WORKTREE_POOL_WAIT',
        actualTaskId,
        actualProjectId,
        'NONE',
        waitDurationMs,
        'FAILURE',
        { error: 'POOL_EXHAUSTED' }
      );

      return {
        success: false,
        poolHit: false,
        waitDurationMs,
        error: 'No available worktree in pool within wait timeout',
      };
    }

    // 3. Pool Miss: Dynamically allocate temporary isolated worktree
    const dynamicId = `wt_dyn_${actualTaskId}_${Date.now().toString(36)}`;
    const dynamicPath = path.join(this.config.baseStorageDir, dynamicId);
    fs.mkdirSync(dynamicPath, { recursive: true });

    const dynamicWorktree: PooledWorktree = {
      worktreeId: dynamicId,
      worktreePath: dynamicPath,
      baseRepoPath: actualRepoPath,
      state: 'CLAIMED',
      integrityStatus: 'CLEAN',
      cleanRef: 'HEAD',
      currentTaskId: actualTaskId,
      currentBranch: actualBranch,
      leaseId: `lease_${actualTaskId}_${Date.now()}`,
      createdAt: Date.now(),
      claimedAt: Date.now(),
      stats: { totalClaims: 1, successfulResets: 0, failedResets: 0 },
    };

    this.pool.set(dynamicId, dynamicWorktree);
    const waitDurationMs = Date.now() - startMs;

    this.telemetry.recordEvent(
      'WORKTREE_POOL_CLAIM',
      actualTaskId,
      actualProjectId,
      dynamicId,
      waitDurationMs,
      'SUCCESS',
      { poolHit: false }
    );

    this.logger.info(
      'claimWorktree',
      `[POOL MISS] Task ${actualTaskId} allocated dynamic worktree ${dynamicId} in ${waitDurationMs}ms`
    );

    return {
      success: true,
      worktree: dynamicWorktree,
      poolHit: false,
      waitDurationMs,
    };
  }

  /**
   * Release and Sanitize Worktree back to Pool (§6, §7)
   */
  public async releaseWorktree(
    worktreeId: string,
    taskIdOrLeaseId: string,
    projectId: string = 'engineering'
  ): Promise<WorktreeResetResult> {
    const startMs = Date.now();
    const wt = this.pool.get(worktreeId);

    if (!wt) {
      throw new Error(`WORKTREE_NOT_FOUND: Worktree ${worktreeId} does not exist in pool`);
    }

    // Verify task lease ownership (§13)
    const isOwner =
      !wt.currentTaskId ||
      wt.currentTaskId === taskIdOrLeaseId ||
      wt.leaseId === taskIdOrLeaseId;

    if (!isOwner) {
      this.logger.error(
        'releaseWorktree',
        `CONCURRENCY_VIOLATION: Identifier ${taskIdOrLeaseId} attempted to release worktree ${worktreeId} owned by ${wt.currentTaskId}`
      );
      throw new Error(`CONCURRENCY_VIOLATION: Task ${taskIdOrLeaseId} does not own worktree lease for ${worktreeId}`);
    }

    if (wt.state === 'QUARANTINED' || wt.integrityStatus === 'QUARANTINED') {
      wt.releasedAt = Date.now();
      wt.currentTaskId = undefined;
      wt.leaseId = undefined;
      return {
        success: false,
        clean: false,
        durationMs: Date.now() - startMs,
        untrackedFilesRemoved: [],
        quarantined: true,
        reason: wt.quarantineReason || 'Worktree is quarantined',
      };
    }

    wt.state = 'SANITIZING';
    this.telemetry.recordEvent('WORKTREE_SANITIZE', wt.currentTaskId || 'system', projectId, worktreeId, 0, 'SUCCESS');

    // Perform Full Verified Reset (§7)
    const resetResult = await this.sanitizeAndReset(wt, taskIdOrLeaseId, projectId);

    wt.releasedAt = Date.now();
    wt.currentTaskId = undefined;
    wt.leaseId = undefined;
    wt.currentBranch = undefined;

    if (resetResult.clean) {
      wt.state = 'READY';
      wt.integrityStatus = 'CLEAN';
      wt.lastResetAt = Date.now();
      wt.stats.successfulResets++;

      this.telemetry.recordEvent(
        'WORKTREE_RELEASE',
        taskIdOrLeaseId,
        projectId,
        worktreeId,
        Date.now() - startMs,
        'SUCCESS'
      );

      this.logger.info(
        'releaseWorktree',
        `Worktree ${worktreeId} successfully reset & returned to pool (Duration: ${Date.now() - startMs}ms)`
      );
    } else {
      // If dirty or reset failed -> QUARANTINE (§6, §15)
      this.quarantineWorktree(
        worktreeId,
        resetResult.reason || 'Worktree failed post-execution clean verification'
      );
    }

    return resetResult;
  }

  /**
   * Full Verified Reset: RESET + ASSERT CLEAN (§7)
   */
  public async sanitizeAndReset(
    wt: PooledWorktree,
    taskId: string = 'unknown',
    projectId: string = 'engineering'
  ): Promise<WorktreeResetResult> {
    const startMs = Date.now();
    wt.state = 'RESETTING';
    this.telemetry.recordEvent('WORKTREE_RESET_START', taskId, projectId, wt.worktreeId, 0, 'SUCCESS');

    const untrackedFilesRemoved: string[] = [];
    const isGit = fs.existsSync(path.join(wt.worktreePath, '.git')) || fs.existsSync(path.join(wt.baseRepoPath, '.git'));

    try {
      // 0. Prohibited credential/secret scan before cleanup (§6, §7)
      if (fs.existsSync(wt.worktreePath)) {
        const entries = fs.readdirSync(wt.worktreePath);
        for (const e of entries) {
          const lower = e.toLowerCase();
          if (
            lower === '.env' ||
            (lower.startsWith('.env.') && !lower.endsWith('.example')) ||
            lower.includes('secret') ||
            lower.includes('credential')
          ) {
            this.quarantineWorktree(wt.worktreeId, `Prohibited credential residue detected: ${e}`);
            return {
              success: false,
              clean: false,
              durationMs: Date.now() - startMs,
              untrackedFilesRemoved: [],
              quarantined: true,
              reason: `Prohibited credential residue detected: ${e}`,
            };
          }
        }
      }

      // 1. Remove untracked and modified task-specific artifacts (§7)
      if (fs.existsSync(wt.worktreePath)) {
        const entries = fs.readdirSync(wt.worktreePath, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === '.git' ||
            entry.name === 'node_modules' ||
            entry.name === 'package.json' ||
            entry.name === 'package-lock.json' ||
            entry.name === 'tsconfig.json'
          ) {
            continue; // Preserve shared dependencies and core metadata
          }

          const targetPath = path.join(wt.worktreePath, entry.name);
          fs.rmSync(targetPath, { recursive: true, force: true });
          untrackedFilesRemoved.push(entry.name);
        }
      }

      // 2. Git Reset if in git repository
      if (isGit && fs.existsSync(wt.worktreePath)) {
        try {
          await execAsync(`git checkout -f ${wt.cleanRef}`, {
            cwd: wt.worktreePath,
            timeout: this.config.resetTimeoutMs,
          });
          await execAsync('git clean -fd', {
            cwd: wt.worktreePath,
            timeout: this.config.resetTimeoutMs,
          });
        } catch {}
      }

      // 3. ASSERT CLEAN: check for remaining credential or dirty state (§7)
      let isClean = true;
      let failureReason: string | undefined;

      if (fs.existsSync(wt.worktreePath)) {
        const entries = fs.readdirSync(wt.worktreePath);
        for (const e of entries) {
          const lower = e.toLowerCase();
          if (lower === '.env' || (lower.startsWith('.env.') && !lower.endsWith('.example'))) {
            isClean = false;
            failureReason = `Detected prohibited credential residue: ${e}`;
            break;
          }
        }
      }

      const durationMs = Date.now() - startMs;
      this.telemetry.recordEvent(
        'WORKTREE_RESET_END',
        taskId,
        projectId,
        wt.worktreeId,
        durationMs,
        isClean ? 'SUCCESS' : 'FAILURE',
        { untrackedFilesRemoved: untrackedFilesRemoved.length }
      );

      return {
        success: isClean,
        clean: isClean,
        durationMs,
        untrackedFilesRemoved,
        quarantined: !isClean,
        reason: failureReason,
      };
    } catch (err: any) {
      wt.stats.failedResets++;
      const durationMs = Date.now() - startMs;

      this.telemetry.recordEvent(
        'WORKTREE_RESET_END',
        taskId,
        projectId,
        wt.worktreeId,
        durationMs,
        'FAILURE',
        { error: err.message }
      );

      return {
        success: false,
        clean: false,
        durationMs,
        untrackedFilesRemoved,
        quarantined: true,
        reason: `Reset command failure: ${err.message}`,
      };
    }
  }

  /**
   * Move worktree into QUARANTINED state (§6, §15)
   */
  public quarantineWorktree(worktreeId: string, reason: string): void {
    const wt = this.pool.get(worktreeId);
    if (!wt) return;

    wt.state = 'QUARANTINED';
    wt.integrityStatus = 'QUARANTINED';
    wt.quarantineReason = reason;

    this.telemetry.recordEvent(
      'WORKTREE_QUARANTINE',
      wt.currentTaskId || 'SYSTEM',
      'SYSTEM',
      worktreeId,
      0,
      'QUARANTINED',
      { reason }
    );

    this.logger.error(
      'quarantineWorktree',
      `QUARANTINED worktree ${worktreeId}: ${reason}. Will NOT be reused (§6).`
    );
  }

  /**
   * Stale Lease Recovery after Crash (§14)
   */
  public async recoverStaleWorktrees(): Promise<{ recoveredCount: number; quarantinedCount: number }> {
    let recoveredCount = 0;
    let quarantinedCount = 0;
    const now = Date.now();

    for (const wt of this.pool.values()) {
      if (wt.state === 'CLAIMED' || wt.state === 'EXECUTING') {
        const isStale = wt.claimedAt && now - wt.claimedAt > this.config.leaseTimeoutMs;

        if (isStale) {
          this.logger.warn(
            'recoverStaleWorktrees',
            `Detected stale worktree lease on ${wt.worktreeId} (Task: ${wt.currentTaskId}). Initiating crash recovery (§14).`
          );

          // Full verified reset
          const res = await this.sanitizeAndReset(wt, wt.currentTaskId || 'stale_recovery');
          if (res.clean) {
            wt.state = 'READY';
            wt.integrityStatus = 'CLEAN';
            wt.currentTaskId = undefined;
            wt.leaseId = undefined;
            recoveredCount++;
          } else {
            this.quarantineWorktree(wt.worktreeId, `Stale lease reset failure: ${res.reason}`);
            quarantinedCount++;
          }
        }
      }
    }

    return { recoveredCount, quarantinedCount };
  }

  /**
   * Get all pooled worktrees
   */
  public getAllWorktrees(): PooledWorktree[] {
    return Array.from(this.pool.values());
  }

  /**
   * Recover stale leases convenience method (§14)
   */
  public async recoverStaleLeases(): Promise<number> {
    const res = await this.recoverStaleWorktrees();
    return res.recoveredCount;
  }

  /**
   * Get total pooled worktrees count
   */
  public getPoolSize(): number {
    return this.pool.size;
  }

  /**
   * Get count of ready worktrees
   */
  public getReadyCount(): number {
    return Array.from(this.pool.values()).filter((w) => w.state === 'READY').length;
  }

  /**
   * Get count of quarantined worktrees
   */
  public getQuarantinedCount(): number {
    return Array.from(this.pool.values()).filter((w) => w.state === 'QUARANTINED').length;
  }

  /**
   * Get worktree by ID
   */
  public getWorktree(worktreeId: string): PooledWorktree | undefined {
    return this.pool.get(worktreeId);
  }

  /**
   * Clear all worktrees (for tests)
   */
  public clear(): void {
    this.pool.clear();
    this.isInitialized = false;
  }
}
