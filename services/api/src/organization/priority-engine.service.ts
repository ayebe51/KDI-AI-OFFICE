// ==========================================================
// services/api/src/organization/priority-engine.service.ts
// Phase 13: Deterministic Priority Engine & Conflict Resolution
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  CanonicalTask,
  PriorityDimensionScore,
  PriorityEvaluationResult,
  PriorityConflictResolution,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { ObjectiveService } from './objective.service.js';

export interface TaskPriorityInput {
  taskId: string;
  title: string;
  description?: string;
  taskType?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline?: string;
  dependencies?: Array<{ taskId: string; type?: string }>;
  blockedByTasksCount?: number;
  blockingTasksCount?: number;
  isProductionCritical?: boolean;
  securityRelevant?: boolean;
  customerFacing?: boolean;
  reversible?: boolean;
  estimatedEffortHours?: number;
  objectiveId?: string;
}

@Injectable()
export class PriorityEngineService {
  private readonly logger = new StructuredLogger('PriorityEngineService');

  constructor(private readonly objectiveService?: ObjectiveService) {}

  /**
   * Deterministically evaluate priority dimensions for a task
   * Section 6: Deterministic Priority Calculation
   */
  public evaluateTaskPriority(input: TaskPriorityInput): PriorityEvaluationResult {
    const titleLower = input.title.toLowerCase();
    const descLower = (input.description || '').toLowerCase();

    // 1. Business Impact (1-5)
    let businessImpact = 2;
    if (input.isProductionCritical || titleLower.includes('production') || titleLower.includes('outage') || titleLower.includes('critical')) {
      businessImpact = 5;
    } else if (titleLower.includes('high') || titleLower.includes('simmaci') || titleLower.includes('auth') || titleLower.includes('security')) {
      businessImpact = 4;
    } else if (titleLower.includes('feature') || titleLower.includes('api') || titleLower.includes('migration')) {
      businessImpact = 3;
    }

    // 2. Urgency (1-5)
    let urgency = 2;
    if (input.deadline) {
      const msUntilDeadline = new Date(input.deadline).getTime() - Date.now();
      const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);
      if (hoursUntilDeadline <= 4) urgency = 5;
      else if (hoursUntilDeadline <= 24) urgency = 4;
      else if (hoursUntilDeadline <= 72) urgency = 3;
    } else if (titleLower.includes('hotfix') || titleLower.includes('urgent') || titleLower.includes('p0') || titleLower.includes('critical')) {
      urgency = 5;
    } else if (titleLower.includes('high') || titleLower.includes('fix') || titleLower.includes('patch')) {
      urgency = 4;
    }

    // 3. Dependency Impact (1-5): Blocking other work elevates priority
    let dependencyCount = 2;
    const blockingCount = input.blockingTasksCount ?? 0;
    if (blockingCount >= 3) dependencyCount = 5;
    else if (blockingCount === 2) dependencyCount = 4;
    else if (blockingCount === 1) dependencyCount = 3;

    // 4. Risk (1-5)
    let risk = 2;
    if (input.riskLevel === 'CRITICAL' || titleLower.includes('critical')) risk = 5;
    else if (input.riskLevel === 'HIGH' || titleLower.includes('high')) risk = 4;
    else if (input.riskLevel === 'MEDIUM') risk = 3;
    else risk = 1;

    // 5. Strategic Alignment (1-5)
    let strategicAlignment = 3;
    if (input.objectiveId && this.objectiveService) {
      const obj = this.objectiveService.getObjectiveById(input.objectiveId);
      if (obj?.priority === 'CRITICAL' || obj?.hierarchyLevel === 'STRATEGIC') strategicAlignment = 5;
      else if (obj?.priority === 'HIGH') strategicAlignment = 4;
    } else if (titleLower.includes('simmaci') || titleLower.includes('kdi') || titleLower.includes('critical') || titleLower.includes('high')) {
      strategicAlignment = 4;
    }

    // 6. Customer Impact (1-5)
    let customerImpact = input.customerFacing || titleLower.includes('user') || titleLower.includes('ui') ? 4 : 2;
    if (input.isProductionCritical) customerImpact = 5;

    // 7. Security Impact (1-5)
    let securityImpact = 1;
    if (input.securityRelevant || titleLower.includes('security') || titleLower.includes('auth') || titleLower.includes('token') || titleLower.includes('secret')) {
      securityImpact = 5;
    }

    // 8. Effort (1-5, lower effort yields slightly earlier dispatch for quick wins)
    let effort = 3;
    if (input.estimatedEffortHours) {
      if (input.estimatedEffortHours > 16) effort = 5;
      else if (input.estimatedEffortHours > 8) effort = 4;
      else if (input.estimatedEffortHours > 2) effort = 3;
      else effort = 1;
    }

    // 9. Deadline Proximity (1-5)
    const deadlineProximity = urgency;

    // 10. Reversibility (1-5): Non-reversible actions require more cautious high scrutiny
    const reversibility = input.reversible === false || titleLower.includes('delete') || titleLower.includes('drop') ? 5 : 2;

    const dimensions: PriorityDimensionScore = {
      businessImpact,
      urgency,
      dependencyCount,
      risk,
      strategicAlignment,
      customerImpact,
      securityImpact,
      effort,
      deadlineProximity,
      reversibility,
    };

    // Calculate deterministic weighted score normalized to 0 - 100
    // Strategic Alignment (15%), Business Impact (15%), Urgency (15%), Dependency (12%),
    // Security (10%), Risk (10%), Customer (10%), Effort (5%), Deadline (5%), Reversibility (3%)
    const weightedSum =
      businessImpact * 0.15 +
      urgency * 0.15 +
      dependencyCount * 0.12 +
      risk * 0.10 +
      strategicAlignment * 0.15 +
      customerImpact * 0.10 +
      securityImpact * 0.10 +
      effort * 0.05 +
      deadlineProximity * 0.05 +
      reversibility * 0.03;

    const score = Math.round(weightedSum * 20); // 1.0 - 5.0 -> 20 - 100

    let priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    if (score >= 80) priorityTier = 'CRITICAL';
    else if (score >= 65) priorityTier = 'HIGH';
    else if (score >= 45) priorityTier = 'MEDIUM';
    else priorityTier = 'LOW';

    // Build transparent explainable reasons
    const reasons: string[] = [];
    if (strategicAlignment >= 4) reasons.push('Selaras langsung dengan Strategic Objective utama');
    if (businessImpact >= 4) reasons.push('Berdampak langsung terhadap keandalan sistem produksi');
    if (urgency >= 4) reasons.push('Tingkat urgensi tinggi / deadline mendekat');
    if (blockingCount >= 2) reasons.push(`Merupakan dependensi kritis yang memblokir ${blockingCount} task lainnya`);
    if (securityImpact >= 4) reasons.push('Relevansi keamanan & integritas kredensial');
    if (reversibility >= 4) reasons.push('Tindakan berisiko tinggi dengan irreversibilitas');

    if (reasons.length === 0) {
      reasons.push('Pekerjaan engineering terencana dengan profil risiko standar');
    }

    return {
      taskId: input.taskId,
      score,
      priorityTier,
      reasons,
      dimensions,
      conflictDetected: false,
    };
  }

  /**
   * Priority Conflict Resolution Engine
   * Section 7: Detects overload, deadline collisions, resource contention, priority inversion
   */
  public resolvePriorityConflicts(
    tasks: TaskPriorityInput[],
    availableWorkersCount = 3
  ): PriorityConflictResolution {
    const evaluated = tasks.map((t) => ({
      task: t,
      eval: this.evaluateTaskPriority(t),
    }));

    const highPriorityTasks = evaluated.filter(
      (e) => e.eval.priorityTier === 'CRITICAL' || e.eval.priorityTier === 'HIGH'
    );

    let conflictType: PriorityConflictResolution['conflictType'] = 'TOO_MANY_HIGH_TASKS';
    let hasConflict = false;
    let description = 'Tidak terdeteksi konflik prioritas. Kapasitas mencukupi untuk antrean saat ini.';

    // Check 1: Too many high tasks exceeding concurrency
    if (highPriorityTasks.length > availableWorkersCount) {
      hasConflict = true;
      conflictType = 'TOO_MANY_HIGH_TASKS';
      description = `Kapasitas saat ini (${availableWorkersCount} worker slot) tidak mencukupi untuk menjalankan ${highPriorityTasks.length} task prioritas TINGGI secara bersamaan.`;
    }

    // Check 2: Dependency bottleneck (a high task depends on an unstarted task)
    const dependencyBottleneck = tasks.find(
      (t) => (t.blockedByTasksCount ?? 0) > 0 && (t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL')
    );
    if (dependencyBottleneck) {
      hasConflict = true;
      conflictType = 'DEPENDENCY_BOTTLENECK';
      description = `Task prioritas tinggi "${dependencyBottleneck.title}" tertahan oleh dependensi sebelum dapat dieksekusi.`;
    }

    // Sort tasks deterministically:
    // 1. Dependency order (unblocked first)
    // 2. Score (higher first)
    // 3. Shortest effort (tiebreaker)
    const sorted = [...evaluated].sort((a, b) => {
      const aBlocked = a.task.blockedByTasksCount ?? 0;
      const bBlocked = b.task.blockedByTasksCount ?? 0;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked; // unblocked first

      if (b.eval.score !== a.eval.score) return b.eval.score - a.eval.score; // higher score first
      return (a.task.estimatedEffortHours ?? 4) - (b.task.estimatedEffortHours ?? 4);
    });

    const recommendedSequence = sorted.map((item, idx) => ({
      taskId: item.task.taskId,
      title: item.task.title,
      assignedAgent: item.task.taskType || 'SOFTWARE_ENGINEER',
      sequenceRank: idx + 1,
      rationale: `Urutan #${idx + 1} (${item.eval.priorityTier}, Skor ${item.eval.score}): ${item.eval.reasons[0]}`,
    }));

    return {
      conflictId: `cnf_${Date.now()}`,
      detectedAt: new Date().toISOString(),
      conflictType: hasConflict ? conflictType : 'TOO_MANY_HIGH_TASKS',
      description,
      availableAgentsCount: availableWorkersCount,
      highPriorityTasksCount: highPriorityTasks.length,
      recommendedSequence,
    };
  }
}
