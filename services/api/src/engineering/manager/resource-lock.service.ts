// ==========================================================
// services/api/src/engineering/manager/resource-lock.service.ts
// Phase 17: Repository Lock & Scope Concurrency Control
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  LockAcquireResult,
  ScopeLock,
} from './engineering-manager.types.js';

@Injectable()
export class ResourceLockService {
  private readonly logger = new StructuredLogger('ResourceLockService');
  private readonly locks = new Map<string, ScopeLock>(); // lockKey -> ScopeLock

  /**
   * Acquire a repository or sensitive scope lock (§25 & §26)
   */
  public acquireLock(
    lockKey: string,
    taskId: string,
    projectSlug: string,
    reason: string,
    ttlMs = 300000 // 5 minutes default
  ): LockAcquireResult {
    const normKey = lockKey.toLowerCase().trim();
    const existing = this.locks.get(normKey);

    // Clean up expired lock
    if (existing) {
      if (new Date(existing.expiresAt).getTime() < Date.now()) {
        this.logger.info('acquireLock', `Lock ${normKey} expired, releasing from ${existing.lockedByTaskId}`);
        this.locks.delete(normKey);
      } else if (existing.lockedByTaskId === taskId) {
        // Re-entrant lock by same task
        return { acquired: true, lockKey: normKey, reason: 'Lock re-acquired by same task' };
      } else {
        // Conflicting task holds the lock
        this.logger.warn(
          'acquireLock',
          `Lock contention on "${normKey}": held by task ${existing.lockedByTaskId}, requested by ${taskId}`
        );
        return {
          acquired: false,
          lockKey: normKey,
          conflictingTaskId: existing.lockedByTaskId,
          reason: `Resource "${normKey}" is currently locked by concurrent task ${existing.lockedByTaskId} (${existing.reason})`,
        };
      }
    }

    const newLock: ScopeLock = {
      lockKey: normKey,
      lockedByTaskId: taskId,
      projectSlug,
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      reason,
    };

    this.locks.set(normKey, newLock);
    this.logger.info('acquireLock', `Acquired lock "${normKey}" for task ${taskId} [${projectSlug}]`);
    return { acquired: true, lockKey: normKey, reason: 'Lock successfully acquired' };
  }

  /**
   * Release specific lock for task (§26)
   */
  public releaseLock(lockKey: string, taskId: string): boolean {
    const normKey = lockKey.toLowerCase().trim();
    const existing = this.locks.get(normKey);
    if (existing && existing.lockedByTaskId === taskId) {
      this.locks.delete(normKey);
      this.logger.info('releaseLock', `Released lock "${normKey}" held by task ${taskId}`);
      return true;
    }
    return false;
  }

  /**
   * Release all locks held by a task upon completion or cancellation (§26)
   */
  public releaseAllForTask(taskId: string): number {
    let count = 0;
    for (const [key, lock] of this.locks.entries()) {
      if (lock.lockedByTaskId === taskId) {
        this.locks.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.info('releaseAllForTask', `Released ${count} lock(s) held by task ${taskId}`);
    }
    return count;
  }

  public isLocked(lockKey: string): boolean {
    const normKey = lockKey.toLowerCase().trim();
    const lock = this.locks.get(normKey);
    if (!lock) return false;
    if (new Date(lock.expiresAt).getTime() < Date.now()) {
      this.locks.delete(normKey);
      return false;
    }
    return true;
  }

  public listActiveLocks(): ScopeLock[] {
    const now = Date.now();
    const active: ScopeLock[] = [];
    for (const [key, lock] of this.locks.entries()) {
      if (new Date(lock.expiresAt).getTime() > now) {
        active.push(lock);
      } else {
        this.locks.delete(key);
      }
    }
    return active;
  }
}
