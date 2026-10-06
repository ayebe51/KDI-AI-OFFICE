// ==========================================================
// services/api/src/engineering/manager/blocker-detection.service.ts
// Phase 17: Blocker Detection, Escalation & Manager Decision Records
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  BlockerRecord,
  BlockerSeverity,
  BlockerType,
  HumanAttentionItem,
  ManagerDecisionRecord,
  QueuedEngineeringTask,
} from './engineering-manager.types.js';

@Injectable()
export class BlockerDetectionService {
  private readonly logger = new StructuredLogger('BlockerDetectionService');
  private readonly blockers = new Map<string, BlockerRecord>();
  private readonly decisions: ManagerDecisionRecord[] = [];

  /**
   * Record a manager decision (§47)
   */
  public recordDecision(
    decisionType: ManagerDecisionRecord['decisionType'],
    reason: string,
    affectedTaskIds: string[],
    evidence: Record<string, any> = {},
    actor = 'AI Engineering Manager',
    decisionSource: 'RULE_ENGINE' | 'AI' = 'RULE_ENGINE'
  ): ManagerDecisionRecord {
    const decision: ManagerDecisionRecord = {
      id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      decisionType,
      decisionSource,
      reason,
      evidence,
      affectedTaskIds,
      actor,
      timestamp: new Date().toISOString(),
    };
    this.decisions.push(decision);
    this.logger.info(
      'recordDecision',
      `[${decisionSource}] Manager Decision (${decisionType}): ${reason} (Affected: [${affectedTaskIds.join(', ')}])`
    );
    return decision;
  }

  public listDecisions(): ManagerDecisionRecord[] {
    return [...this.decisions];
  }

  /**
   * Register or update a blocker record (§20)
   */
  public registerBlocker(
    type: BlockerType,
    severity: BlockerSeverity,
    projectSlug: string,
    affectedTaskIds: string[],
    reason: string,
    suggestedResolution: string
  ): BlockerRecord {
    const id = `blk_${projectSlug}_${type.toLowerCase()}_${Date.now()}`;
    const blocker: BlockerRecord = {
      id,
      type,
      severity,
      projectSlug,
      affectedTaskIds,
      reason,
      suggestedResolution,
      detectedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };
    this.blockers.set(id, blocker);
    this.logger.warn(
      'registerBlocker',
      `[${severity}] Blocker detected on ${projectSlug}: ${reason} (Tasks: [${affectedTaskIds.join(', ')}])`
    );
    return blocker;
  }

  public listActiveBlockers(): BlockerRecord[] {
    return Array.from(this.blockers.values()).filter((b) => b.status === 'ACTIVE' || b.status === 'ESCALATED');
  }

  public resolveBlocker(blockerId: string): boolean {
    const blocker = this.blockers.get(blockerId);
    if (blocker) {
      blocker.status = 'RESOLVED';
      this.logger.info('resolveBlocker', `Resolved blocker ${blockerId}`);
      return true;
    }
    return false;
  }

  /**
   * Escalation Engine: Escalate blocker to Human Attention Center (§21)
   */
  public escalateToHuman(blockerId: string, reason: string): BlockerRecord | null {
    const blocker = this.blockers.get(blockerId);
    if (!blocker) return null;

    blocker.status = 'ESCALATED';
    this.recordDecision(
      'BLOCKER_ESCALATION',
      `Escalated to human attention: ${reason}`,
      blocker.affectedTaskIds,
      { blockerId, previousReason: blocker.reason }
    );

    this.logger.warn('escalateToHuman', `Escalated blocker ${blockerId} to Human Attention: ${reason}`);
    return blocker;
  }

  /**
   * Analyze tasks to discover blockers automatically (§20, §21, §27)
   */
  public scanTasksForBlockers(tasks: QueuedEngineeringTask[]): BlockerRecord[] {
    const detected: BlockerRecord[] = [];

    // Group tasks by project and error/failure patterns
    const repeatedFailures = tasks.filter((t) => t.attemptsCount >= 3 || t.status === 'FAILED');
    for (const failTask of repeatedFailures) {
      // Check if already registered
      const existing = this.listActiveBlockers().find(
        (b) => b.type === 'REPEATED_FAILURE' && b.affectedTaskIds.includes(failTask.taskId)
      );
      if (!existing) {
        const blk = this.registerBlocker(
          'REPEATED_FAILURE',
          'CRITICAL',
          failTask.projectSlug,
          [failTask.taskId],
          `Task ${failTask.taskId} failed after ${failTask.attemptsCount} attempts: ${failTask.title}`,
          'Escalate to Human Owner for architectural or environmental clarification'
        );
        this.escalateToHuman(blk.id, `Exceeded maximum automated repair attempts (3 attempts)`);
        detected.push(blk);
      }
    }

    // Dependency blocked tasks
    const blockedDeps = tasks.filter((t) => t.status === 'BLOCKED_BY_DEPENDENCY');
    for (const bTask of blockedDeps) {
      const existing = this.listActiveBlockers().find(
        (b) => b.type === 'DEPENDENCY_BLOCKED' && b.affectedTaskIds.includes(bTask.taskId)
      );
      if (!existing) {
        const blk = this.registerBlocker(
          'DEPENDENCY_BLOCKED',
          'HIGH',
          bTask.projectSlug,
          [bTask.taskId],
          `Task ${bTask.taskId} is waiting on unfinished prerequisites: [${bTask.dependencies.join(', ')}]`,
          'Complete prerequisite tasks before attempting execution'
        );
        detected.push(blk);
      }
    }

    return detected;
  }

  /**
   * Human Attention Items aggregation (§16)
   */
  public generateHumanAttentionItems(
    activeTasks: QueuedEngineeringTask[],
    pendingApprovals: Array<{ taskId: string; projectSlug: string; title: string }> = []
  ): HumanAttentionItem[] {
    const items: HumanAttentionItem[] = [];

    // 1. Pending Approvals (Strict human gate)
    for (const appr of pendingApprovals) {
      items.push({
        id: `att_appr_${appr.taskId}`,
        type: 'APPROVAL_REQUIRED',
        projectSlug: appr.projectSlug,
        taskId: appr.taskId,
        title: `${appr.title} awaiting human approval`,
        severity: 'HIGH',
        actionPrompt: `/engineering approve ${appr.taskId}`,
      });
    }

    // 2. Escalated and Critical Blockers
    for (const blk of this.listActiveBlockers()) {
      if (blk.status === 'ESCALATED' || blk.severity === 'CRITICAL') {
        items.push({
          id: `att_blk_${blk.id}`,
          type: blk.type === 'REPEATED_FAILURE' ? 'REPEATED_FAILURE' : 'CRITICAL_BLOCKER',
          projectSlug: blk.projectSlug,
          taskId: blk.affectedTaskIds[0],
          title: `[${blk.projectSlug.toUpperCase()}] ${blk.reason}`,
          severity: blk.severity,
          actionPrompt: blk.suggestedResolution,
        });
      }
    }

    return items;
  }
}
