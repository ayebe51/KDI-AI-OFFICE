// ==========================================================
// services/api/src/engineering/control-plane/worktree-lease.service.ts
// Phase 15.5: Worktree Lease & Orphan Detection Engine (§12 & §13)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { StructuredLogger } from '@kdi/shared';
import type { ControlPlanePersistenceService } from './control-plane-persistence.service.js';
import type { WorktreeLeaseRecord } from './engineering-control-plane.types.js';

const execAsync = promisify(exec);

export class WorktreeLeaseService {
  private readonly logger = new StructuredLogger('WorktreeLeaseService');

  constructor(
    private readonly persistence: ControlPlanePersistenceService,
    private readonly baseStorageDir = path.resolve(process.cwd(), '.worktrees')
  ) {}

  /**
   * Acquire a worktree lease for an engineering task (§12)
   */
  public async acquireLease(
    taskId: string,
    worktreePath: string,
    branch: string
  ): Promise<WorktreeLeaseRecord> {
    const leaseId = `lease_${taskId}_${Date.now()}`;
    const lease: WorktreeLeaseRecord = {
      leaseId,
      taskId,
      path: worktreePath,
      branch,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };

    await this.persistence.saveLease(lease);
    this.logger.info(
      'acquireLease',
      `Acquired worktree lease ${leaseId} for task ${taskId} at ${path.basename(worktreePath)}`
    );
    return lease;
  }

  /**
   * Update heartbeat on an active worktree lease (§21)
   */
  public async recordHeartbeat(taskId: string): Promise<boolean> {
    const lease = await this.persistence.getLeaseByTaskId(taskId);
    if (lease && lease.status === 'ACTIVE') {
      lease.lastHeartbeat = new Date().toISOString();
      await this.persistence.saveLease(lease);
      return true;
    }
    return false;
  }

  public async heartbeat(taskId: string): Promise<boolean> {
    return this.recordHeartbeat(taskId);
  }

  /**
   * Release and mark lease CLEANED (§12)
   */
  public async releaseLease(taskId: string): Promise<WorktreeLeaseRecord | undefined> {
    const lease = await this.persistence.getLeaseByTaskId(taskId);
    if (lease) {
      lease.status = 'CLEANED';
      lease.cleanedAt = new Date().toISOString();
      await this.persistence.saveLease(lease);
      this.logger.info('releaseLease', `Released and cleaned worktree lease for task ${taskId}`);
      return lease;
    }
    return undefined;
  }

  /**
   * Detect orphaned worktrees on disk or git worktree list (§13)
   */
  public async detectOrphanWorktrees(activeTaskIds: Set<string> = new Set()): Promise<string[]> {
    const orphanedPaths: string[] = [];

    // 1. Inspect git worktree list
    try {
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: process.cwd(),
      });
      const lines = stdout.split('\n');
      let currentWorktree = '';

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          currentWorktree = line.substring(9).trim();
        } else if (line.startsWith('branch ') && currentWorktree) {
          const branch = line.substring(7).trim();
          // Skip primary workspace
          if (path.resolve(currentWorktree) === path.resolve(process.cwd())) {
            continue;
          }

          // Check if associated with an active task
          let isOwned = false;
          for (const taskId of activeTaskIds) {
            if (currentWorktree.includes(taskId) || branch.includes(taskId)) {
              isOwned = true;
              break;
            }
          }

          if (!isOwned) {
            orphanedPaths.push(currentWorktree);
            // Mark lease if tracked
            const lease = await this.persistence.getLeaseByPath(currentWorktree);
            if (lease && lease.status !== 'CLEANED') {
              lease.status = 'ORPHANED';
              await this.persistence.saveLease(lease);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.debug('detectOrphanWorktrees', `Git worktree inspection note: ${err.message}`);
    }

    // 2. Inspect filesystem directory .worktrees
    if (fs.existsSync(this.baseStorageDir)) {
      try {
        const entries = fs.readdirSync(this.baseStorageDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'control-plane') {
            const fullPath = path.join(this.baseStorageDir, entry.name);
            let isOwned = false;
            for (const taskId of activeTaskIds) {
              if (entry.name.includes(taskId)) {
                isOwned = true;
                break;
              }
            }

            if (!isOwned && !orphanedPaths.includes(fullPath)) {
              orphanedPaths.push(fullPath);
            }
          }
        }
      } catch (err: any) {
        this.logger.debug('detectOrphanWorktrees', `Fs scan note: ${err.message}`);
      }
    }

    this.logger.info(
      'detectOrphanWorktrees',
      `Orphan worktree scan found ${orphanedPaths.length} orphan(s): [${orphanedPaths
        .map((p) => path.basename(p))
        .join(', ')}]`
    );

    return orphanedPaths;
  }

  /**
   * Safely prune and cleanup orphaned worktrees (§13 & §14)
   */
  public async pruneOrphans(orphanedPaths: string[]): Promise<number> {
    let prunedCount = 0;
    for (const orphanPath of orphanedPaths) {
      try {
        // Try git worktree remove
        try {
          await execAsync(`git worktree remove --force "${orphanPath}"`, {
            cwd: process.cwd(),
          });
        } catch {}

        if (fs.existsSync(orphanPath)) {
          fs.rmSync(orphanPath, { recursive: true, force: true });
        }
        prunedCount++;
        this.logger.info('pruneOrphans', `Pruned orphan worktree at ${orphanPath}`);
      } catch (err: any) {
        this.logger.warn('pruneOrphans', `Failed to prune orphan ${orphanPath}: ${err.message}`);
      }
    }

    try {
      await execAsync('git worktree prune', { cwd: process.cwd() });
    } catch {}

    return prunedCount;
  }
}
