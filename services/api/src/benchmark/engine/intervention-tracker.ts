// ==========================================================
// services/api/src/benchmark/engine/intervention-tracker.ts
// Human Intervention Taxonomy & Measurement Engine (Section 12 & 13)
// ==========================================================

import type {
  HumanIntervention,
  HumanInterventionType,
  BenchmarkMetric,
} from '@kdi/types';

export class InterventionTracker {
  private interventions: HumanIntervention[] = [];

  constructor(initialInterventions?: HumanIntervention[]) {
    if (initialInterventions) {
      this.interventions = [...initialInterventions];
    }
  }

  /**
   * Determine if an action or approval is genuinely necessary
   * (e.g. production deployment, destructive migration, external spending, credential access)
   * vs unnecessary manual steering (file to edit, test to run, error guidance)
   */
  public static isNecessaryIntervention(
    type: HumanInterventionType,
    actionOrDescription: string
  ): boolean {
    if (type !== 'H6_APPROVAL') {
      return false; // H1 to H5 are always unnecessary manual interventions
    }

    const lower = actionOrDescription.toLowerCase();
    const sensitiveKeywords = [
      'production',
      'deploy',
      'destructive',
      'drop table',
      'truncate',
      'delete from',
      'spending',
      'budget',
      'credential',
      'secret',
      'irreversible',
      'production_deploy',
      'merge_to_main',
    ];

    return sensitiveKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * Record a new intervention event
   */
  public record(
    runId: string,
    type: HumanInterventionType,
    description: string,
    actor: string = 'HUMAN_OPERATOR'
  ): HumanIntervention {
    const isNecessary = InterventionTracker.isNecessaryIntervention(type, description);
    const intervention: HumanIntervention = {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      runId,
      type,
      description,
      isNecessary,
      actor,
      timestamp: new Date().toISOString(),
    };
    this.interventions.push(intervention);
    return intervention;
  }

  public getInterventions(): HumanIntervention[] {
    return [...this.interventions];
  }

  public getUnnecessaryCount(): number {
    return this.interventions.filter((i) => !i.isNecessary).length;
  }

  public getNecessaryCount(): number {
    return this.interventions.filter((i) => i.isNecessary).length;
  }

  /**
   * Calculate composite benchmark metrics for a completed run
   */
  public calculateMetrics(params: {
    taskCompleted: boolean;
    firstPassSuccess: boolean;
    recoveryAttempts: number;
    recoverySuccess: boolean;
    testRuns: number;
    testPasses: number;
    deliveryCycleTimeMs: number;
    totalFilesChanged: number;
    reworkFilesCount?: number;
    hasEvidencePackage: boolean;
  }): BenchmarkMetric {
    const unnecessary = this.getUnnecessaryCount();
    const necessary = this.getNecessaryCount();
    const totalInterventions = this.interventions.length;

    // Autonomous completion: task completed with ZERO unnecessary interventions
    const autonomousCompletion = params.taskCompleted && unnecessary === 0;

    // Recovery success rate: 1 if recovered, 0 if failed, 1 if no recovery was needed
    const recoverySuccessRate = params.recoveryAttempts === 0
      ? 1.0
      : params.recoverySuccess
      ? 1.0 / params.recoveryAttempts
      : 0.0;

    // Test reliability: passing test executions / total test executions
    const testReliability = params.testRuns > 0
      ? Math.round((params.testPasses / params.testRuns) * 100) / 100
      : 1.0;

    // Rework rate: rework files / total changed files
    const reworkCount = params.reworkFilesCount || 0;
    const reworkRate = params.totalFilesChanged > 0
      ? Math.round((reworkCount / params.totalFilesChanged) * 100) / 100
      : 0.0;

    // Evidence completeness: scale 0.0 to 1.0 based on artifact presence
    const evidenceCompleteness = params.hasEvidencePackage ? 1.0 : 0.5;

    return {
      taskCompletion: params.taskCompleted,
      autonomousCompletion,
      firstPassSuccess: params.firstPassSuccess,
      recoverySuccessRate,
      humanInterventionCount: totalInterventions,
      unnecessaryInterventions: unnecessary,
      necessaryApprovals: necessary,
      testReliability,
      deliveryCycleTimeMs: params.deliveryCycleTimeMs,
      reworkRate,
      evidenceCompleteness,
    };
  }
}
