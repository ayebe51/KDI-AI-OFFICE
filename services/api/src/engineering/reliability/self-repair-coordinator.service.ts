// ==========================================================
// services/api/src/engineering/reliability/self-repair-coordinator.service.ts
// Phase 19: Enriched Repair Context, Failure Memory & Scope Discipline (§27–§31)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  EnrichedRepairPayload,
  FailureMemoryRecord,
  ScopeDisciplineAudit,
} from './reliability.types.js';

@Injectable()
export class SelfRepairCoordinatorService {
  private readonly logger = new StructuredLogger('SelfRepairCoordinatorService');
  private readonly failureMemories = new Map<string, FailureMemoryRecord[]>();

  /**
   * Record failure into durable task failure memory (§28)
   */
  public recordFailureMemory(record: FailureMemoryRecord): void {
    const list = this.failureMemories.get(record.taskId) || [];
    list.push(record);
    this.failureMemories.set(record.taskId, list);
    this.logger.info(
      'recordFailureMemory',
      `Recorded failure memory for task ${record.taskId} attempt ${record.attemptNumber}: "${record.failedHypothesis}"`
    );
  }

  public getFailureMemories(taskId: string): FailureMemoryRecord[] {
    return [...(this.failureMemories.get(taskId) || [])];
  }

  /**
   * Enriched Repair Context Generator (§27 & §29):
   * Synthesizes compact failure summary, test diff, and rejected approaches for attempt 2/3.
   */
  public prepareRepairPayload(
    taskId: string,
    attemptNumber: number,
    rawErrorOutput: string,
    changedFiles: string[] = []
  ): EnrichedRepairPayload {
    // 1. Check fatal stop conditions (§29)
    const errLower = rawErrorOutput.toLowerCase();
    let stopConditionTriggered = false;
    let stopReason: string | undefined;

    if (errLower.includes('credentials missing') || errLower.includes('unauthorized') || errLower.includes('401 unauthorized')) {
      stopConditionTriggered = true;
      stopReason = 'Missing credentials requires human intervention; retry will not succeed.';
    } else if (errLower.includes('protected branch') || errLower.includes('permission denied (publickey)')) {
      stopConditionTriggered = true;
      stopReason = 'Protected branch or repository write permission error.';
    } else if (errLower.includes('security block') || errLower.includes('prompt injection detected')) {
      stopConditionTriggered = true;
      stopReason = 'Security policy violation halted self-repair loop.';
    }

    // 2. Synthesize compact error summary & test diff (§27)
    const lines = rawErrorOutput.split('\n').filter((l) => l.trim().length > 0);
    const errorSnippet = lines.slice(-10).join('\n');
    const failureSummary = lines.find((l) => l.includes('AssertionError') || l.includes('Error:') || l.includes('fail')) || lines[0] || 'Unknown test failure';

    // 3. Extract previous hypotheses & avoid approaches (§28)
    const memories = this.getFailureMemories(taskId);
    const avoidApproaches = memories.map((m) => m.rejectedApproach);
    const previousHypothesis = memories.length > 0 ? memories[memories.length - 1].failedHypothesis : undefined;

    const payload: EnrichedRepairPayload = {
      attemptNumber,
      failureSummary,
      testDiff: `Expected behavior not met in ${changedFiles.join(', ') || 'test suite'}:\n${failureSummary}`,
      relevantLogSnippet: errorSnippet,
      changedFiles,
      previousHypothesis,
      avoidApproaches,
      stopConditionTriggered,
      stopReason,
    };

    this.logger.info(
      'prepareRepairPayload',
      `Prepared enriched repair payload for ${taskId} (Attempt ${attemptNumber}). Avoid approaches: ${avoidApproaches.length}, Stop: ${stopConditionTriggered}`
    );

    return payload;
  }

  /**
   * Code Scope Discipline Auditor (§30):
   * Detects scope expansion between planned files vs actual git diff.
   */
  public auditScopeDiscipline(
    plannedFiles: string[],
    actualFilesChanged: string[]
  ): ScopeDisciplineAudit {
    const plannedSet = new Set(plannedFiles.map((f) => f.replace(/\\/g, '/')));
    const unexpectedFiles = actualFilesChanged
      .map((f) => f.replace(/\\/g, '/'))
      .filter((f) => !plannedSet.has(f));

    const expansionRatio =
      plannedFiles.length > 0
        ? Math.round((actualFilesChanged.length / plannedFiles.length) * 10) / 10
        : actualFilesChanged.length;

    // Trigger review if unexpected files touched or actual files > 2x planned files (§30)
    const scopeDriftDetected = unexpectedFiles.length > 0 || expansionRatio > 2.0;
    const requiresReview = scopeDriftDetected;

    return {
      plannedFiles,
      actualFilesChanged,
      unexpectedFiles,
      scopeDriftDetected,
      scopeExpansionRatio: expansionRatio,
      requiresReview,
    };
  }
}
