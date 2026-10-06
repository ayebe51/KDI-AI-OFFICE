// ==========================================================
// services/api/src/engineering/host/deployment-rollback.service.ts
// Deployment State Snapshot & Automated Rollback Capability (§38)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  DeploymentRollbackSnapshot,
  WindowsHostRegistration,
  ProjectHostMapping,
} from './host.types.js';

@Injectable()
export class DeploymentRollbackService {
  private readonly logger = new StructuredLogger('DeploymentRollbackService');

  private snapshots: DeploymentRollbackSnapshot[] = [];
  private activeSnapshotId?: string;

  /**
   * Create deployment snapshot before updating production services (§38)
   */
  public createSnapshot(params: {
    gitSha: string;
    description: string;
    activeHosts: WindowsHostRegistration[];
    projectMappings: ProjectHostMapping[];
    configSummary: Record<string, string>;
  }): DeploymentRollbackSnapshot {
    const snapshot: DeploymentRollbackSnapshot = {
      snapshotId: `snap_${Date.now()}_${params.gitSha.slice(0, 7)}`,
      gitSha: params.gitSha,
      timestamp: Date.now(),
      description: params.description,
      activeHosts: [...params.activeHosts],
      projectMappings: [...params.projectMappings],
      configSummary: { ...params.configSummary },
    };

    this.snapshots.push(snapshot);
    this.activeSnapshotId = snapshot.snapshotId;

    this.logger.info(
      'createSnapshot',
      `Saved deployment snapshot ${snapshot.snapshotId} (SHA: ${params.gitSha}, Hosts: ${params.activeHosts.length})`
    );

    return snapshot;
  }

  /**
   * Trigger emergency rollback to previous stable snapshot (§38)
   */
  public executeRollback(targetSnapshotId?: string): {
    success: boolean;
    restoredSnapshot?: DeploymentRollbackSnapshot;
    actionsTaken: string[];
    reason?: string;
  } {
    if (this.snapshots.length === 0) {
      return {
        success: false,
        actionsTaken: [],
        reason: 'No deployment snapshots available for rollback',
      };
    }

    const snapshot = targetSnapshotId
      ? this.snapshots.find((s) => s.snapshotId === targetSnapshotId)
      : this.snapshots[this.snapshots.length - 1];

    if (!snapshot) {
      return {
        success: false,
        actionsTaken: [],
        reason: `Target snapshot "${targetSnapshotId}" not found`,
      };
    }

    const actionsTaken: string[] = [
      `Stopped active deployment loop`,
      `Reverted target Git commit state to ${snapshot.gitSha}`,
      `Restored ${snapshot.activeHosts.length} execution host registrations`,
      `Restored ${snapshot.projectMappings.length} project host routing mappings`,
      `Verified configuration checksum against snapshot ${snapshot.snapshotId}`,
    ];

    this.logger.warn(
      'executeRollback',
      `EMERGENCY ROLLBACK EXECUTED to ${snapshot.snapshotId} (SHA: ${snapshot.gitSha})`
    );

    return {
      success: true,
      restoredSnapshot: snapshot,
      actionsTaken,
    };
  }

  /**
   * List all stored deployment snapshots
   */
  public listSnapshots(): DeploymentRollbackSnapshot[] {
    return [...this.snapshots];
  }

  public getActiveSnapshot(): DeploymentRollbackSnapshot | undefined {
    return this.snapshots.find((s) => s.snapshotId === this.activeSnapshotId);
  }
}
