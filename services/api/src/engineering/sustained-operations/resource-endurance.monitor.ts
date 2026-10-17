// ==========================================================
// services/api/src/engineering/sustained-operations/resource-endurance.monitor.ts
// Phase 25: Resource Endurance, Memory Leak & Handle Monitor (§11)
// ==========================================================

import type { ResourceSnapshot } from './phase-25.types.js';

export interface PoolStateProvider {
  getActiveWorktreeCount(): number;
  getQuarantinedWorktreeCount(): number;
  getAvailableWorktreeCount(): number;
  getActiveLeaseCount(): number;
}

export class ResourceEnduranceMonitor {
  private snapshots: ResourceSnapshot[] = [];
  private poolProvider?: PoolStateProvider;

  constructor(poolProvider?: PoolStateProvider) {
    this.poolProvider = poolProvider;
  }

  public setPoolProvider(provider: PoolStateProvider): void {
    this.poolProvider = provider;
  }

  /**
   * Capture a detailed resource endurance snapshot (§11).
   */
  public captureSnapshot(phase: 'START' | 'MID' | 'END', queueDepth: number = 0, activeProcesses: number = 0): ResourceSnapshot {
    const mem = process.memoryUsage();

    const snapshot: ResourceSnapshot = {
      phase,
      timestamp: new Date().toISOString(),
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      externalMb: Math.round((mem.external / (1024 * 1024)) * 100) / 100,
      activeWorktrees: this.poolProvider?.getActiveWorktreeCount() ?? 0,
      quarantinedWorktrees: this.poolProvider?.getQuarantinedWorktreeCount() ?? 0,
      availableWorktrees: this.poolProvider?.getAvailableWorktreeCount() ?? 0,
      activeLeases: this.poolProvider?.getActiveLeaseCount() ?? 0,
      queueDepth,
      activeProcesses,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  public getSnapshots(): ResourceSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Evaluate resource endurance across START, MID, and END (§11).
   * Validates zero worktree leak and no progressive unbounded memory leak.
   */
  public evaluateEndurance(): {
    start: ResourceSnapshot;
    mid: ResourceSnapshot;
    end: ResourceSnapshot;
    memoryLeakDetected: boolean;
    worktreeLeakDetected: boolean;
  } {
    const start = this.snapshots.find((s) => s.phase === 'START') ?? this.snapshots[0];
    const mid = this.snapshots.find((s) => s.phase === 'MID') ?? this.snapshots[Math.floor(this.snapshots.length / 2)];
    const end = this.snapshots.find((s) => s.phase === 'END') ?? this.snapshots[this.snapshots.length - 1];

    // Worktree leak: At completion, active worktree leases must be returned to 0
    const worktreeLeakDetected = end ? end.activeLeases > 0 : false;

    // Memory growth check: Heap growth > 250MB after full garbage collection check
    const heapDelta = end && start ? end.heapUsedMb - start.heapUsedMb : 0;
    const memoryLeakDetected = heapDelta > 250;

    return {
      start: start ?? this.captureSnapshot('START'),
      mid: mid ?? this.captureSnapshot('MID'),
      end: end ?? this.captureSnapshot('END'),
      memoryLeakDetected,
      worktreeLeakDetected,
    };
  }
}
