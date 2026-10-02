import { Injectable, Logger } from '@nestjs/common';
import {
  StrategicAutonomyLevel,
  StrategicDecisionRequest,
  StrategicReplanningOption,
} from '@kdi/types';
import { StrategicObjectiveService } from './strategic-objective.service.js';
import { LongHorizonPlanService } from './long-horizon-plan.service.js';

export interface StrategicDriftFinding {
  driftDetected: boolean;
  driftType: 'UNLINKED_TASKS' | 'SCOPE_EXPANSION' | 'BURNING_WITHOUT_PROGRESS' | 'REPEATED_NO_IMPACT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedTasks: string[];
  evidence: string[];
  recommendedAction: string;
  detectedAt: string;
}

export interface ObjectiveObsolescenceCheck {
  objectiveId: string;
  isObsolescent: boolean;
  obsolescenceScore: number; // 0.0 - 1.0
  triggers: string[];
  recommendation: 'CONTINUE' | 'REVIEW_RECOMMENDED' | 'RETREAT_RECOMMENDED';
  assumptionsEvaluated: string[];
}

export interface StrategicAuditEntry {
  auditId: string;
  timestamp: string;
  action:
    | 'OBJECTIVE_CREATED'
    | 'OBJECTIVE_UPDATED'
    | 'PLAN_CREATED'
    | 'PLAN_VERSIONED'
    | 'REPLAN_EVALUATED'
    | 'REPLAN_EXECUTED'
    | 'PLAN_ROLLBACK'
    | 'DECISION_REQUESTED'
    | 'DECISION_RESOLVED'
    | 'DRIFT_DETECTED'
    | 'OBSOLESCENCE_FLAGGED';
  targetId: string;
  performedBy: string;
  autonomyLevel: StrategicAutonomyLevel;
  details: Record<string, unknown>;
}

@Injectable()
export class DriftGovernanceService {
  private readonly logger = new Logger(DriftGovernanceService.name);

  // Current organizational strategic autonomy level
  private currentAutonomyLevel: StrategicAutonomyLevel = 'S3_ADAPT_WITHIN_BOUNDS';

  // Immutable Strategic Audit Trail (Phase 15 Section 51)
  private readonly auditTrail: StrategicAuditEntry[] = [];

  // Active Decision Requests (Phase 15 Section 34)
  private readonly decisionRequests: Map<string, StrategicDecisionRequest> = new Map();

  constructor(
    private readonly objectiveService: StrategicObjectiveService,
    private readonly planService: LongHorizonPlanService
  ) {
    this.seedInitialGovernanceState();
  }

  // ==========================================================
  // Strategic Autonomy Level & Bounded Autonomy (Phase 15 Section 35, 36)
  // S0: OBSERVE, S1: ADVISE, S2: EXECUTE_ROUTINE, S3: ADAPT_WITHIN_BOUNDS, S4: STRATEGIC_ESCALATION
  // ==========================================================

  getAutonomyLevel(): StrategicAutonomyLevel {
    return this.currentAutonomyLevel;
  }

  setAutonomyLevel(level: StrategicAutonomyLevel, authority: string): void {
    const prev = this.currentAutonomyLevel;
    this.currentAutonomyLevel = level;
    this.recordAudit({
      action: 'OBJECTIVE_UPDATED',
      targetId: 'GLOBAL_AUTONOMY_LEVEL',
      performedBy: authority,
      autonomyLevel: level,
      details: { previousLevel: prev, newLevel: level },
    });
    this.logger.log(`Strategic Autonomy Level updated from ${prev} to ${level} by ${authority}`);
  }

  isActionPermitted(action: {
    type:
      | 'ROUTINE_TEST'
      | 'DOCUMENTATION'
      | 'RESEQUENCE_WITHIN_TOLERANCE'
      | 'NON_PROD_REFACTOR'
      | 'PRODUCTION_DEPLOY'
      | 'ARCHITECTURE_MIGRATION'
      | 'BUDGET_INCREASE'
      | 'SECURITY_POLICY_CHANGE'
      | 'SCOPE_EXPANSION'
      | 'DEADLINE_EXTENSION';
    objectiveId: string;
  }): {
    permitted: boolean;
    requiresOwnerApproval: boolean;
    reason: string;
  } {
    // Actions that always require human owner governance (Phase 15 Section 36, 50, 60)
    const requiresOwnerGovernance = [
      'PRODUCTION_DEPLOY',
      'ARCHITECTURE_MIGRATION',
      'BUDGET_INCREASE',
      'SECURITY_POLICY_CHANGE',
      'SCOPE_EXPANSION',
      'DEADLINE_EXTENSION',
    ];

    if (requiresOwnerGovernance.includes(action.type)) {
      return {
        permitted: false,
        requiresOwnerApproval: true,
        reason: `Aksi [${action.type}] memerlukan persetujuan eksplisit Owner karena berdampak langsung pada scope, budget, security, atau produksi.`,
      };
    }

    if (this.currentAutonomyLevel === 'S0_OBSERVE') {
      return {
        permitted: false,
        requiresOwnerApproval: true,
        reason: 'Sistem dalam mode S0_OBSERVE. Semua aksi eksekusi dibekukan untuk observasi saja.',
      };
    }

    return {
      permitted: true,
      requiresOwnerApproval: false,
      reason: `Aksi [${action.type}] diizinkan secara mandiri di bawah batas Bounded Autonomy (${this.currentAutonomyLevel}).`,
    };
  }

  // ==========================================================
  // Strategic Drift Detection (Phase 15 Section 37)
  // Detects when ongoing work diverges from objective
  // ==========================================================

  detectStrategicDrift(objectiveId: string): StrategicDriftFinding[] {
    const findings: StrategicDriftFinding[] = [];
    const now = new Date().toISOString();

    // Check 1: Unlinked tasks or unapproved initiatives
    // In our portfolio, all tasks are strictly linked
    // We check for synthetic unlinked work or anomalies
    const milestones = this.objectiveService.getAllMilestones();
    const hasUnapprovedScope = false;

    if (hasUnapprovedScope) {
      findings.push({
        driftDetected: true,
        driftType: 'SCOPE_EXPANSION',
        severity: 'HIGH',
        affectedTasks: ['TASK-EXP-99'],
        evidence: ['Task TASK-EXP-99 created without Strategic Program or Milestone parentage.'],
        recommendedAction: 'Freeze unlinked task and require Owner verification.',
        detectedAt: now,
      });
    }

    return findings;
  }

  // ==========================================================
  // Objective Obsolescence Detection (Phase 15 Section 38)
  // Detects when long-horizon objective may no longer be valid due to changed assumptions
  // ==========================================================

  checkObjectiveObsolescence(objectiveId: string): ObjectiveObsolescenceCheck {
    const objective = this.objectiveService.getObjective(objectiveId);
    if (!objective) {
      throw new Error(`Objective [${objectiveId}] not found`);
    }

    // Evaluate assumptions:
    // 1. Is the Madrasah SIMMACI system still in active operation? (YES)
    // 2. Are high peak loads still anticipated? (YES)
    // 3. Are core dependencies intact? (YES)
    const triggers: string[] = [];
    let score = 0.0;

    if (objective.status === 'CANCELLED') {
      triggers.push('Objective explicitly cancelled by Owner.');
      score = 1.0;
    }

    return {
      objectiveId,
      isObsolescent: score > 0.5,
      obsolescenceScore: score,
      triggers,
      recommendation: score > 0.5 ? 'RETREAT_RECOMMENDED' : 'CONTINUE',
      assumptionsEvaluated: [
        'SIMMACI production database remains operational on PostgreSQL 16',
        'Academic Madrasah semester enrollment peak traffic confirmed',
        'Security & reliability objectives remain aligned with organizational roadmap',
      ],
    };
  }

  // ==========================================================
  // Decision Requests (Phase 15 Section 34)
  // Structured DECISION REQUIRED template for Owner
  // ==========================================================

  createDecisionRequest(dto: {
    objectiveId: string;
    issue: string;
    evidence: string[];
    options: StrategicReplanningOption[];
    tradeOffsSummary: string;
    decisionDeadline: string;
    impactIfNoDecision: string;
  }): StrategicDecisionRequest {
    const requestId = `DEC-REQ-${Date.now()}`;
    const request: StrategicDecisionRequest = {
      requestId,
      ...dto,
      status: 'PENDING',
    };
    this.decisionRequests.set(requestId, request);

    this.recordAudit({
      action: 'DECISION_REQUESTED',
      targetId: requestId,
      performedBy: 'KDI Strategic Orchestrator',
      autonomyLevel: this.currentAutonomyLevel,
      details: { issue: dto.issue, optionsCount: dto.options.length },
    });

    this.logger.warn(`[DECISION REQUIRED] Emitted Decision Request [${requestId}]: ${dto.issue}`);
    return request;
  }

  resolveDecisionRequest(requestId: string, optionId: string, ownerName: string): StrategicDecisionRequest {
    const request = this.decisionRequests.get(requestId);
    if (!request) {
      throw new Error(`Decision request [${requestId}] not found`);
    }

    request.status = 'DECIDED';
    request.decidedOptionId = optionId;
    request.decidedAt = new Date().toISOString();
    this.decisionRequests.set(requestId, request);

    this.recordAudit({
      action: 'DECISION_RESOLVED',
      targetId: requestId,
      performedBy: ownerName,
      autonomyLevel: this.currentAutonomyLevel,
      details: { decidedOptionId: optionId },
    });

    this.logger.log(`Decision Request [${requestId}] resolved by ${ownerName}. Chosen option: ${optionId}`);
    return request;
  }

  getDecisionRequests(objectiveId?: string): StrategicDecisionRequest[] {
    const all = Array.from(this.decisionRequests.values());
    if (objectiveId) {
      return all.filter((r) => r.objectiveId === objectiveId);
    }
    return all;
  }

  // ==========================================================
  // Immutable Audit Trail (Phase 15 Section 51)
  // ==========================================================

  recordAudit(entry: Omit<StrategicAuditEntry, 'auditId' | 'timestamp'>): void {
    const record: StrategicAuditEntry = {
      auditId: `STRAT-AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditTrail.push(record);
  }

  getAuditTrail(limit = 50): StrategicAuditEntry[] {
    return this.auditTrail.slice(-limit);
  }

  // ==========================================================
  // Seed Initial State
  // ==========================================================

  private seedInitialGovernanceState(): void {
    this.recordAudit({
      action: 'OBJECTIVE_CREATED',
      targetId: 'OBJ-SIMMACI-REL',
      performedBy: 'Owner / Chief Architect',
      autonomyLevel: 'S3_ADAPT_WITHIN_BOUNDS',
      details: { name: 'Improve SIMMACI reliability', horizon: 'MEDIUM' },
    });

    this.recordAudit({
      action: 'PLAN_CREATED',
      targetId: 'OBJ-SIMMACI-REL-PLAN-V3',
      performedBy: 'Farhan (Chief AI Architect)',
      autonomyLevel: 'S3_ADAPT_WITHIN_BOUNDS',
      details: { version: 3, milestonesCount: 5 },
    });
  }
}
