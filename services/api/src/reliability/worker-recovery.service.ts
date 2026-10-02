import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { WorkerRecoveryRecord, OrphanTaskCheckResult } from '@kdi/types';

@Injectable()
export class WorkerRecoveryService {
  private readonly logger = new StructuredLogger('WorkerRecoveryService');
  private readonly workers = new Map<string, WorkerRecoveryRecord>();
  private readonly staleThresholdMs = 30000; // 30 seconds

  recordHeartbeat(workerId: string, agentRole: string, activeTaskId?: string): void {
    const existing = this.workers.get(workerId);
    if (existing) {
      existing.lastHeartbeatAt = new Date().toISOString();
      existing.activeTaskId = activeTaskId;
      existing.status = 'ACTIVE';
    } else {
      this.workers.set(workerId, {
        workerId,
        agentRole,
        lastHeartbeatAt: new Date().toISOString(),
        activeTaskId,
        status: 'ACTIVE',
      });
    }
  }

  detectAndRecoverOrphans(): {
    orphansDetected: number;
    tasksRecovered: string[];
    records: WorkerRecoveryRecord[];
  } {
    const now = Date.now();
    const tasksRecovered: string[] = [];
    let orphansDetected = 0;

    for (const rec of this.workers.values()) {
      if (rec.status === 'ACTIVE') {
        const lastBeat = new Date(rec.lastHeartbeatAt).getTime();
        if (now - lastBeat > this.staleThresholdMs) {
          rec.status = 'ORPHAN_DETECTED';
          orphansDetected += 1;
          this.logger.warn(
            'detectAndRecoverOrphans',
            `Worker ${rec.workerId} (${rec.agentRole}) lost heartbeat for ${Math.round((now - lastBeat) / 1000)}s.`
          );

          if (rec.activeTaskId) {
            tasksRecovered.push(rec.activeTaskId);
            rec.status = 'RECOVERED';
            rec.recoveredAt = new Date().toISOString();
            this.logger.info(
              'detectAndRecoverOrphans',
              `Recovered orphan task ${rec.activeTaskId} from stale worker ${rec.workerId}. Re-queueing.`
            );
          }
        }
      }
    }

    return {
      orphansDetected,
      tasksRecovered,
      records: Array.from(this.workers.values()),
    };
  }

  getWorkerStatus(workerId: string): WorkerRecoveryRecord | undefined {
    return this.workers.get(workerId);
  }

  getAllWorkers(): WorkerRecoveryRecord[] {
    return Array.from(this.workers.values());
  }

  reset(): void {
    this.workers.clear();
  }
}
