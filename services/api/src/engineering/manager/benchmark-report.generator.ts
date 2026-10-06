// ==========================================================
// services/api/src/engineering/manager/benchmark-report.generator.ts
// Phase 18: Deterministic Benchmark Report & Exit Summary Generator
// ==========================================================

import type { BenchmarkSummaryReport } from './benchmark.types.js';

export class Phase18BenchmarkReportGenerator {
  /**
   * Generates the standardized Real-World Benchmark Exit Report (§50)
   */
  public static generateExitReport(report: BenchmarkSummaryReport): string {
    const o = report.overview;
    const projects = report.projectBreakdown.map((p) => p.projectSlug.toUpperCase()).join(', ');
    const windowStr = `${report.benchmarkWindow.startedAt.split('T')[0]} to ${report.benchmarkWindow.endedAt.split('T')[0]} (${report.benchmarkWindow.windowDays} days)`;

    return `PHASE 18 — BENCHMARK RESULT

Benchmark Window:
${windowStr}

Projects:
${projects}

Eligible Tasks:
${o.eligibleTasks}

Completed:
${o.completedEligibleTasks}

Failed:
${o.failedEligibleTasks}

Autonomy Rate:
${o.autonomyRate}%

Success Rate:
${o.successRate}%

Human Intervention Rate:
${o.humanInterventionRate}%

Average Human Intervention Time:
${o.averageHumanInterventionMinutes} min

Average Execution Time:
${o.averageExecutionMinutes} min

Average Attempts:
${o.averageAttemptsPerTask}

False Success:
${o.falseSuccessCount} (${o.falseSuccessRate}%)

Recovery Success:
${o.recoverySuccessRate}%

Top Failure Category:
${o.topFailureCategory}

Top Bottleneck:
${o.topBottleneck}

Estimated Human Time Saved:
${o.estimatedHumanTimeSavedMinutes} min (${Math.round((o.estimatedHumanTimeSavedMinutes / 60) * 10) / 10} hours)

Recommended Next Improvement:
${o.recommendedNextImprovement}
`;
  }

  /**
   * Generates the detailed multi-section Markdown report (§39)
   */
  public static generateMarkdownReport(report: BenchmarkSummaryReport): string {
    const o = report.overview;
    const op = report.operationsMetrics;

    const projectRows = report.projectBreakdown
      .map(
        (p) =>
          `| ${p.projectSlug.toUpperCase()} | ${p.totalTasks} | ${p.eligibleTasks} | ${p.completed} | ${p.failed} | ${p.autonomyRate}% | ${p.successRate}% | ${p.averageDurationMinutes}m | ${p.averageInterventionMinutes}m |`
      )
      .join('\n');

    const roleRows = report.roleBreakdown
      .map(
        (r) =>
          `| ${r.role} | ${r.totalTasks} | ${r.eligibleTasks} | ${r.completed} | ${r.failed} | ${r.autonomyRate}% | ${r.successRate}% | ${r.averageDurationMinutes}m |`
      )
      .join('\n');

    const diffRows = report.difficultyBreakdown
      .map(
        (d) =>
          `| ${d.difficulty} | ${d.totalTasks} | ${d.eligibleTasks} | ${d.completed} | ${d.failed} | ${d.autonomyRate}% | ${d.successRate}% | ${d.averageDurationMinutes}m |`
      )
      .join('\n');

    const failureRows = report.failureBreakdown.length > 0
      ? report.failureBreakdown
          .map(
            (f) =>
              `| ${f.category} | ${f.count} | ${f.percentage}% | ${f.exampleTasks.join(', ') || 'N/A'} | ${f.primaryRootCause} |`
          )
          .join('\n')
      : '| NONE | 0 | 0% | N/A | No failures recorded |';

    const interventionRows = report.interventionBreakdown.length > 0
      ? report.interventionBreakdown
          .map(
            (i) =>
              `| ${i.reason} | ${i.count} | ${i.percentage}% | ${i.totalMinutes}m |`
          )
          .join('\n')
      : '| NONE | 0 | 0% | 0m |';

    const evidenceRows = report.evidenceTasks
      .slice(0, 15)
      .map(
        (e) =>
          `| ${e.taskId} | ${e.project.toUpperCase()} | ${e.role} | ${e.difficulty} | ${e.autonomyLevel} | ${e.status} | ${Math.round(e.durationMs / 1000)}s | ${e.humanInterventionMinutes}m | ${e.baselineMinutes}m | ${e.falseSuccess ? 'YES' : 'NO'} |`
      )
      .join('\n');

    return `# PHASE 18 — REAL-WORLD AI ENGINEERING OPERATIONS BENCHMARK REPORT
*Generated from deterministic database telemetry and verifiable execution logs.*

## 1. EXECUTIVE SUMMARY
- **Primary Autonomy Rate (A3 + A4)**: **${o.autonomyRate}%** (${o.autonomousTasksCount}/${o.eligibleTasks} eligible tasks)
- **Task Success Rate**: **${o.successRate}%** (${o.completedEligibleTasks}/${o.eligibleTasks})
- **Human Intervention Rate**: **${o.humanInterventionRate}%**
- **Human Time Saved**: **${o.estimatedHumanTimeSavedMinutes} minutes** (${Math.round((o.estimatedHumanTimeSavedMinutes / 60) * 10) / 10} hours)
- **Human Coordination Load**: **${o.humanCoordinationLoadMinutes} load points**
- **False Successes Detected**: **${o.falseSuccessCount}** (caught by deterministic acceptance & test gate)
- **Benchmark Window**: ${report.benchmarkWindow.startedAt} to ${report.benchmarkWindow.endedAt} (${report.benchmarkWindow.windowDays} days)

---

## 2. TASK DISTRIBUTION
- **Total Tasks Audited**: ${o.totalTasksRecorded}
- **Eligible Real-World Tasks**: ${o.eligibleTasks}
- **Non-Eligible Control Tasks**: ${o.nonEligibleTasks} (separated per §7 to preserve metric integrity)

---

## 3. PROJECT BREAKDOWN (§20)
| Project | Total | Eligible | Completed | Failed | Autonomy | Success | Avg Exec | Avg Intervention |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
${projectRows}

---

## 4. ROLE BREAKDOWN (§21)
| Role | Total | Eligible | Completed | Failed | Autonomy | Success | Avg Exec |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
${roleRows}

---

## 5. COMPLEXITY BREAKDOWN (§22)
| Difficulty | Total | Eligible | Completed | Failed | Autonomy | Success | Avg Exec |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
${diffRows}

---

## 6. HUMAN INTERVENTION ANALYSIS (§23 & §37)
- **Average Intervention Time**: ${o.averageHumanInterventionMinutes} minutes per task
- **Total Manual Intervention Time**: ${report.interventionBreakdown.reduce((acc, i) => acc + i.totalMinutes, 0)} minutes
- **Required Policy Approvals**: Tracked separately and NOT counted as autonomy failures.

| Intervention Reason | Events | % of Interventions | Total Minutes |
|:---|:---:|:---:|:---:|
${interventionRows}

---

## 7. FAILURE ANALYSIS & ROOT CAUSE (§15 & §16)
- **Total Failures**: ${o.failedEligibleTasks}
- **Top Failure Category**: \`${o.topFailureCategory}\`
- **False Success Rate**: ${o.falseSuccessRate}% (${o.falseSuccessCount} tasks attempted false claims)

| Failure Category | Count | % of Failures | Example Tasks | Primary Root Cause |
|:---|:---:|:---:|:---|:---|
${failureRows}

---

## 8. OPERATIONS & CONTROL PLANE EFFICIENCY (§24–§28)
- **Average Queue Wait Time**: ${Math.round(op.queueWaitAverageMs / 1000)}s
- **Priority Accuracy**: ${op.priorityAccuracyRate}%
- **First-Assignment Success Rate**: ${op.firstAssignmentSuccessRate}%
- **Antigravity Tasks Executed**: ${op.antigravityTasksSent} (Success: ${op.antigravitySuccessRate}%, Timeouts: ${op.antigravityTimeoutRate}%)
- **Recovery Success Rate**: ${op.recoverySuccessRate}%
- **AI Tokens Consumed**: ${op.totalTokensUsed.toLocaleString()} tokens (~$${op.estimatedCostUsd.toFixed(2)})

---

## 9. TIME SAVINGS & HUMAN COORDINATION LOAD (§18, §19 & §45)
- **Total Baseline Human Hours**: ${Math.round(report.evidenceTasks.reduce((acc, t) => acc + t.baselineMinutes, 0) / 60 * 10) / 10}h
- **Actual Human Minutes Spent**: ${report.interventionBreakdown.reduce((acc, i) => acc + i.totalMinutes, 0)}m
- **Net Time Saved**: ${o.estimatedHumanTimeSavedMinutes} minutes (${Math.round((o.estimatedHumanTimeSavedMinutes / 60) * 10) / 10} hours)
- **Human Coordination Load**: ${o.humanCoordinationLoadMinutes} (combining manual intervention minutes and coordination actions)

---

## 10. TOP BOTTLENECKS & RECOMMENDATIONS (§39 & §50)
- **Top Bottleneck**: ${o.topBottleneck}
- **Recommended Next Improvement**: ${o.recommendedNextImprovement}

---

## 11. VERIFIABLE EVIDENCE AUDIT LOG (SAMPLE)
| Task ID | Project | Role | Difficulty | Autonomy | Status | Exec Time | Intervention | Baseline | False Success? |
|:---|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
${evidenceRows}
`;
  }
}
