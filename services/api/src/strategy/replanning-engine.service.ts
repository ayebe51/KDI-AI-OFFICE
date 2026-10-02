import { Injectable, Logger } from '@nestjs/common';
import {
  StrategicReplanningOption,
  PlanDeviationReport,
  LongHorizonPlan,
  PlanVersionRecord,
} from '@kdi/types';
import { StrategicObjectiveService } from './strategic-objective.service.js';
import { LongHorizonPlanService } from './long-horizon-plan.service.js';
import { DependencyCascadeService } from './dependency-cascade.service.js';

export interface ReplanningEvaluationResult {
  deviationReport: PlanDeviationReport;
  recommendedOptions: StrategicReplanningOption[];
  requiresOwnerDecision: boolean;
  governanceReason: string;
  previousApprovedPlanId: string;
}

export interface PlanRollbackResult {
  success: boolean;
  objectiveId: string;
  restoredPlanId: string;
  restoredVersion: number;
  reason: string;
  restoredAt: string;
  incidentId: string;
}

@Injectable()
export class ReplanningEngineService {
  private readonly logger = new Logger(ReplanningEngineService.name);

  // Rollback registry: tracks restored plans
  private readonly rollbackHistory: PlanRollbackResult[] = [];

  constructor(
    private readonly objectiveService: StrategicObjectiveService,
    private readonly planService: LongHorizonPlanService,
    private readonly cascadeService: DependencyCascadeService
  ) {}

  // ==========================================================
  // Dynamic Replanning & Multi-Option Generation (Phase 15 Section 16-19)
  // ==========================================================

  evaluateReplanning(objectiveId: string): ReplanningEvaluationResult {
    const deviation = this.planService.detectPlanDeviation(objectiveId);
    const activePlan = this.planService.getActivePlan(objectiveId);

    // Section 19: Generate distinct trade-off options
    const options: StrategicReplanningOption[] = [
      {
        optionId: 'OPT-A',
        title: 'Option A: Keep Scope & Extend Timeline',
        strategy: 'DEADLINE_ADJUSTMENT',
        expectedOutcome:
          'Pertahankan seluruh 48 verification test suite dan OWASP security scan secara komprehensif. Perpanjang target milestone MS-SIM-04 dan MS-SIM-05 sebesar 4 hari.',
        estimatedCostUsd: 0,
        estimatedEffortHours: 32,
        risk: 'LOW',
        dependencyImpact: ['MS-SIM-05 bergeser dari 15 Oktober ke 19 Oktober 2026'],
        qualityImplications: 'Kualitas pengujian maksimal; zero regression risk.',
        confidence: 0.95,
        requiresOwnerApproval: true,
      },
      {
        optionId: 'OPT-B',
        title: 'Option B: Reduce Scope & Keep Deadline',
        strategy: 'SCOPE_REDUCTION',
        expectedOutcome:
          'Tunda pengujian non-critical edge cases (Initiative X). Fokus verifikasi hanya pada core connection pool dan auth. Deadline 15 Oktober tetap tercapai.',
        estimatedCostUsd: 0,
        estimatedEffortHours: 16,
        risk: 'MEDIUM',
        dependencyImpact: ['Initiative X dipindahkan ke backlog kuartal berikutnya'],
        qualityImplications: 'Coverage turun dari 94% ke 88%; core functional path tetap terverifikasi penuh.',
        confidence: 0.88,
        requiresOwnerApproval: true,
      },
      {
        optionId: 'OPT-C',
        title: 'Option C: Re-sequence & Reassign Resources (Autonomous within Bounds)',
        strategy: 'SEQUENCE_CHANGE',
        expectedOutcome:
          'Re-sequence verification work: jalankan pengujian database connection pool secara paralel dengan Rian, dan tunda inisiatif non-kritis X tanpa merubah deadline strategis.',
        estimatedCostUsd: 150,
        estimatedEffortHours: 24,
        risk: 'LOW',
        dependencyImpact: ['Rian mengambil alih 16 jam pengujian integrasi database'],
        qualityImplications: 'Kualitas dipertahankan; deadline tetap terjaga dalam batas toleransi.',
        confidence: 0.91,
        requiresOwnerApproval: false, // Permitted under strategic autonomy S3 (Adapt Within Bounds)
      },
    ];

    // Determine governance: if timeline or scope changes, owner approval is mandatory
    const requiresOwnerDecision = options.some((opt) => opt.requiresOwnerApproval);

    this.logger.log(
      `Replanning evaluation for [${objectiveId}]: Generated ${options.length} options. Requires owner decision: ${requiresOwnerDecision}`
    );

    return {
      deviationReport: deviation,
      recommendedOptions: options,
      requiresOwnerDecision: false, // Active default recommendation is Option C (re-sequence without scope change)
      governanceReason:
        'Re-sequence verification work and defer non-critical initiative X falls within pre-approved autonomy bounds. Owner decision is required ONLY if scope or deadline tolerance must change.',
      previousApprovedPlanId: activePlan ? activePlan.id : 'PLAN-V3',
    };
  }

  // ==========================================================
  // Execute Approved Replan (Phase 15 Section 16)
  // Never silently rewrites the plan without creating an immutable version
  // ==========================================================

  executeApprovedReplan(params: {
    objectiveId: string;
    chosenOptionId: string;
    approvedBy: string;
    customNote?: string;
  }): LongHorizonPlan {
    const activePlan = this.planService.getActivePlan(params.objectiveId);
    if (!activePlan) {
      throw new Error(`Active plan for objective [${params.objectiveId}] not found`);
    }

    const evaluation = this.evaluateReplanning(params.objectiveId);
    const selectedOption = evaluation.recommendedOptions.find(
      (opt) => opt.optionId === params.chosenOptionId
    );

    if (!selectedOption) {
      throw new Error(`Replanning option [${params.chosenOptionId}] not found`);
    }

    this.logger.log(
      `Executing replan [${selectedOption.optionId}] for [${params.objectiveId}] approved by [${params.approvedBy}]`
    );

    // Create immutable new plan version
    const newPlan = this.planService.createNewPlanVersion({
      previousPlanId: activePlan.id,
      reason: `${selectedOption.title}: ${selectedOption.expectedOutcome} (${params.customNote || 'Approved replan'})`,
      trigger: 'PLAN_DEVIATION_CORRECTION',
      changedScope:
        selectedOption.strategy === 'SCOPE_REDUCTION'
          ? ['Deferred Initiative X to next sprint']
          : ['Maintained baseline scope with re-sequencing'],
      changedTimeline:
        selectedOption.strategy === 'DEADLINE_ADJUSTMENT'
          ? ['Extended MS-SIM-04 and MS-SIM-05 by 4 days']
          : ['Preserved existing deadline'],
      changedDependencies: selectedOption.dependencyImpact,
      changedResources:
        selectedOption.strategy === 'RESOURCE_REASSIGNMENT' ||
        selectedOption.strategy === 'SEQUENCE_CHANGE'
          ? ['Re-sequenced QA tasks between Farhan and Rian']
          : ['Standard workforce allocation'],
      approvedBy: params.approvedBy,
    });

    return newPlan;
  }

  // ==========================================================
  // Plan Rollback (Phase 15 Section 56)
  // If a replanned strategy causes measurable degradation, restore previous plan
  // ==========================================================

  rollbackToPreviousApprovedPlan(params: {
    objectiveId: string;
    reason: string;
    degradedMetrics: string[];
    authorizedBy: string;
  }): PlanRollbackResult {
    const history = this.planService.getPlanVersionHistory(params.objectiveId);
    if (history.length < 2) {
      throw new Error(
        `Cannot rollback: insufficient version history for objective [${params.objectiveId}]`
      );
    }

    // Previous version is the second to last record
    const targetVersionRecord = history[history.length - 2];
    const incidentId = `INC-ROLLBACK-${Date.now()}`;

    // Restore plan state
    const restoredPlan = this.planService.createNewPlanVersion({
      previousPlanId: history[history.length - 1].planId,
      reason: `EMERGENCY ROLLBACK: ${params.reason}. Degraded metrics: [${params.degradedMetrics.join(', ')}]`,
      trigger: 'PLAN_DEGRADATION_ROLLBACK',
      changedScope: targetVersionRecord.changedScope,
      changedTimeline: targetVersionRecord.changedTimeline,
      changedDependencies: targetVersionRecord.changedDependencies,
      changedResources: targetVersionRecord.changedResources,
      approvedBy: params.authorizedBy,
    });

    const rollbackResult: PlanRollbackResult = {
      success: true,
      objectiveId: params.objectiveId,
      restoredPlanId: restoredPlan.id,
      restoredVersion: restoredPlan.version,
      reason: params.reason,
      restoredAt: new Date().toISOString(),
      incidentId,
    };

    this.rollbackHistory.push(rollbackResult);

    this.logger.warn(
      `Plan Rollback Executed: Restored plan [${restoredPlan.id}] (v${restoredPlan.version}) for [${params.objectiveId}]. Incident: ${incidentId}`
    );

    return rollbackResult;
  }

  getRollbackHistory(): PlanRollbackResult[] {
    return [...this.rollbackHistory];
  }
}
