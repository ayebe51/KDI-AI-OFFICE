// ==========================================================
// services/api/src/engineering/manager/prioritization.service.ts
// Phase 17: Deterministic Multi-Factor Task Prioritization Engine
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { PortfolioService } from './portfolio.service.js';
import type {
  PriorityScoreBreakdown,
  QueuedEngineeringTask,
  TaskPriorityScore,
} from './engineering-manager.types.js';

export interface TaskPrioritizationInput {
  taskId: string;
  projectSlug: string;
  title: string;
  taskType?: 'BUG' | 'FEATURE' | 'REFACTOR' | 'SECURITY' | 'INFRA' | string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  isProductionCrash?: boolean;
  dependentsCount?: number; // How many other tasks are blocked waiting for this
  isBlockedByDependency?: boolean;
  deadline?: string; // ISO date string
}

@Injectable()
export class PrioritizationService {
  private readonly logger = new StructuredLogger('PrioritizationService');

  constructor(@Optional() private readonly portfolioService?: PortfolioService) {}

  /**
   * Calculate deterministic priority score (§7 & §18)
   */
  public calculatePriorityScore(
    input: TaskPrioritizationInput,
    overrideReason?: string
  ): TaskPriorityScore {
    const project = this.portfolioService?.getProject(input.projectSlug);
    const projectPriority = project?.priority.level || 'MEDIUM';

    // 1. Project Priority Weight (0 - 30)
    let projectPriorityWeight = 10;
    if (projectPriority === 'CRITICAL') projectPriorityWeight = 30;
    else if (projectPriority === 'HIGH') projectPriorityWeight = 20;
    else if (projectPriority === 'LOW') projectPriorityWeight = 0;

    // 2. Task Severity Weight (5 - 40)
    const severity = input.severity?.toUpperCase() || 'MEDIUM';
    let taskSeverityWeight = 15;
    if (severity === 'CRITICAL') taskSeverityWeight = 40;
    else if (severity === 'HIGH') taskSeverityWeight = 25;
    else if (severity === 'LOW') taskSeverityWeight = 5;

    // 3. Technical Urgency Weight (5 - 25)
    let technicalUrgencyWeight = 10;
    const taskType = (input.taskType || '').toUpperCase();
    if (input.isProductionCrash || taskType === 'HOTFIX' || taskType === 'SECURITY') {
      technicalUrgencyWeight = 25;
    } else if (taskType === 'BUG') {
      technicalUrgencyWeight = 15;
    } else if (taskType === 'FEATURE') {
      technicalUrgencyWeight = 10;
    } else if (taskType === 'REFACTOR' || taskType === 'CHORE') {
      technicalUrgencyWeight = 5;
    }

    // 4. Dependency Depth & Blocker Impact (0 - 30)
    // If this task unblocks other waiting tasks, it gets high priority boost (§9)
    const dependentsCount = input.dependentsCount || 0;
    const dependencyDepthWeight = Math.min(30, dependentsCount * 10);

    // 5. Deadline Urgency (0 - 25)
    let deadlineUrgencyWeight = 0;
    if (input.deadline) {
      const now = Date.now();
      const deadlineMs = new Date(input.deadline).getTime();
      const hoursRemaining = (deadlineMs - now) / (1000 * 60 * 60);

      if (hoursRemaining < 0) {
        deadlineUrgencyWeight = 25; // Overdue
      } else if (hoursRemaining <= 24) {
        deadlineUrgencyWeight = 15; // Due within 24 hours
      } else if (hoursRemaining <= 48) {
        deadlineUrgencyWeight = 5;  // Due within 48 hours
      }
    }

    // 6. Penalty if blocked by dependency (-50)
    const penaltyBlockedByDependency = input.isBlockedByDependency ? -50 : 0;

    // Total Score Calculation (Floored at 0)
    const rawTotal =
      projectPriorityWeight +
      taskSeverityWeight +
      technicalUrgencyWeight +
      dependencyDepthWeight +
      deadlineUrgencyWeight +
      penaltyBlockedByDependency;

    const totalScore = Math.max(0, rawTotal);

    const breakdown: PriorityScoreBreakdown = {
      projectPriorityWeight,
      taskSeverityWeight,
      technicalUrgencyWeight,
      dependencyDepthWeight,
      deadlineUrgencyWeight,
      penaltyBlockedByDependency,
    };

    const reasons: string[] = [];
    if (projectPriorityWeight >= 20) reasons.push(`${projectPriority} project priority`);
    if (taskSeverityWeight >= 25) reasons.push(`${severity} severity`);
    if (technicalUrgencyWeight >= 20) reasons.push(`High urgency (${taskType || 'Production'})`);
    if (dependencyDepthWeight > 0) reasons.push(`Unblocks ${dependentsCount} waiting task(s)`);
    if (deadlineUrgencyWeight >= 15) reasons.push('Approaching SLA deadline');
    if (input.isBlockedByDependency) reasons.push('Blocked by prerequisite dependencies (-50)');

    const calculatedReason =
      overrideReason ||
      (reasons.length > 0 ? reasons.join(', ') : 'Standard backlog prioritization');

    return {
      taskId: input.taskId,
      totalScore,
      breakdown,
      reason: calculatedReason,
      calculatedAt: new Date().toISOString(),
      decisionSource: 'RULE_ENGINE',
    };
  }

  /**
   * Sort queue tasks deterministically by priority score descending (§7 & §8)
   */
  public sortTasksByPriority(tasks: QueuedEngineeringTask[]): QueuedEngineeringTask[] {
    return [...tasks].sort((a, b) => {
      // 1. Ready tasks come before blocked tasks
      const aBlocked = a.status === 'BLOCKED_BY_DEPENDENCY';
      const bBlocked = b.status === 'BLOCKED_BY_DEPENDENCY';
      if (aBlocked && !bBlocked) return 1;
      if (!aBlocked && bBlocked) return -1;

      // 2. Score descending
      if (b.priorityScore.totalScore !== a.priorityScore.totalScore) {
        return b.priorityScore.totalScore - a.priorityScore.totalScore;
      }

      // 3. FIFO order tie-breaker
      return new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime();
    });
  }

  /**
   * Cross-project prioritization rationale for human reporting (§19)
   */
  public explainPriorityOrder(tasks: QueuedEngineeringTask[]): string[] {
    const sorted = this.sortTasksByPriority(tasks);
    return sorted.map((t, idx) => {
      return (
        `#${idx + 1} [Score ${t.priorityScore.totalScore}] [${t.projectSlug.toUpperCase()}] ${t.taskId}: ${t.title} ` +
        `(${t.priorityScore.reason})`
      );
    });
  }
}
