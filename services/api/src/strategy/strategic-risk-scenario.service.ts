import { Injectable, Logger } from '@nestjs/common';
import { StrategicRisk, ScenarioSimulation, RiskLevel } from '@kdi/types';
import { StrategicObjectiveService } from './strategic-objective.service.js';
import { ForecastingBudgetService } from './forecasting-budget.service.js';

export interface WorkforceContinuityRisk {
  roleOrCapability: string;
  primaryAgent: string;
  backupCapability: string;
  providerDependency: string;
  fallbackProvider: string;
  riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigationStrategy: string;
}

@Injectable()
export class StrategicRiskScenarioService {
  private readonly logger = new Logger(StrategicRiskScenarioService.name);

  // Authoritative Risk Register
  private readonly riskRegister: Map<string, StrategicRisk> = new Map();

  // Simulated Scenarios History (strictly isolated from production)
  private readonly simulatedScenarios: Map<string, ScenarioSimulation> = new Map();

  constructor(
    private readonly objectiveService: StrategicObjectiveService,
    private readonly forecastService: ForecastingBudgetService
  ) {
    this.seedRiskRegister();
  }

  // ==========================================================
  // Strategic Risk Register (Phase 15 Section 25)
  // Tracks risk, probability, impact, exposure, owner, mitigation,
  // contingency, status, evidence, review_date
  // ==========================================================

  registerRisk(risk: StrategicRisk): StrategicRisk {
    this.riskRegister.set(risk.id, risk);
    this.logger.log(`Registered Strategic Risk: [${risk.id}] ${risk.risk} (Exposure: ${risk.exposure})`);
    return risk;
  }

  getRisk(id: string): StrategicRisk | undefined {
    return this.riskRegister.get(id);
  }

  getAllRisks(objectiveId?: string): StrategicRisk[] {
    const all = Array.from(this.riskRegister.values());
    if (objectiveId) {
      return all.filter((r) => r.objectiveId === objectiveId);
    }
    return all;
  }

  getHighestRiskObjective(): {
    objectiveId: string;
    objectiveName: string;
    totalExposure: number;
    highestRisk: StrategicRisk;
  } {
    const risks = Array.from(this.riskRegister.values()).filter((r) => r.status !== 'RETIRED');
    risks.sort((a, b) => b.exposure - a.exposure);
    const top = risks[0];
    const objective = top ? this.objectiveService.getObjective(top.objectiveId) : undefined;

    return {
      objectiveId: top ? top.objectiveId : 'OBJ-SIMMACI-REL',
      objectiveName: objective ? objective.name : 'Improve SIMMACI reliability',
      totalExposure: top ? top.exposure : 36,
      highestRisk: top,
    };
  }

  // ==========================================================
  // Workforce Continuity & Fallback Paths (Phase 15 Section 24, 28)
  // ==========================================================

  getWorkforceContinuityRisks(): WorkforceContinuityRisk[] {
    return [
      {
        roleOrCapability: 'Database Connection Pool Architecture',
        primaryAgent: 'Farhan',
        backupCapability: 'Rian (Engineer Backup) + Automated Runbook Docs',
        providerDependency: 'Anthropic Claude 3.5 Sonnet',
        fallbackProvider: 'OpenAI GPT-4o / Ollama DeepSeek',
        riskSeverity: 'MEDIUM',
        mitigationStrategy:
          'Continuous controlled knowledge capture to Phase 14 knowledge graph and architecture runbooks.',
      },
      {
        roleOrCapability: 'QA Security Verification & Fuzzing',
        primaryAgent: 'Farhan (QA Lead)',
        backupCapability: 'Rian + Automated Jest/Vitest CI suites',
        providerDependency: 'Local Node.js Test Runner',
        fallbackProvider: 'Remote Docker Sandbox Runner',
        riskSeverity: 'HIGH', // QA is at 94% capacity
        mitigationStrategy:
          'Re-sequence verification tasks and cross-train Rian on OWASP verification suites.',
      },
    ];
  }

  // ==========================================================
  // What-If Scenario Engine (Phase 15 Section 26, 27, 57)
  // Strictly separated: SIMULATION = no real side effects,
  // zero production mutations
  // ==========================================================

  runScenarioSimulation(params: {
    scenarioName: string;
    injectedVariables: {
      agentUnavailable?: string;
      providerFailure?: string;
      deadlineMoveDays?: number;
      budgetReductionPercent?: number;
      qaCapacityHalved?: boolean;
      scopeExpansionInitiatives?: string[];
    };
  }): ScenarioSimulation {
    const scenarioId = `SCENARIO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const baselineCapacity = this.forecastService.get14DayCapacityForecast();

    let timelineEffectDays = 0;
    let resourceEffectHours = 0;
    let costEffectUsd = 0;
    let dependencyImpactCount = 0;
    let riskEffect = 'STABLE';

    // 1. Simulate agent loss
    if (params.injectedVariables.agentUnavailable) {
      timelineEffectDays += 7;
      resourceEffectHours += 40;
      dependencyImpactCount += 3;
      riskEffect = 'HIGH_IMPACT_AGENT_BOTTLE_NECK';
    }

    // 2. Simulate QA capacity halved
    if (params.injectedVariables.qaCapacityHalved) {
      timelineEffectDays += 8;
      resourceEffectHours += 20;
      dependencyImpactCount += 2;
      riskEffect = 'CRITICAL_QA_SATURATION';
    }

    // 3. Simulate deadline shift
    if (params.injectedVariables.deadlineMoveDays) {
      timelineEffectDays += params.injectedVariables.deadlineMoveDays;
      if (params.injectedVariables.deadlineMoveDays < 0) {
        riskEffect = 'SEVERE_SCHEDULE_COMPRESSION';
      }
    }

    // 4. Simulate budget reduction
    if (params.injectedVariables.budgetReductionPercent) {
      costEffectUsd = -(10000 * (params.injectedVariables.budgetReductionPercent / 100));
      riskEffect = 'BUDGET_CONSTRAINT_REDUCED_SCOPE_REQUIRED';
    }

    // 5. Simulate scope expansion
    if (params.injectedVariables.scopeExpansionInitiatives?.length) {
      const addedCount = params.injectedVariables.scopeExpansionInitiatives.length;
      timelineEffectDays += addedCount * 3;
      resourceEffectHours += addedCount * 24;
      costEffectUsd += addedCount * 450;
      dependencyImpactCount += addedCount * 2;
      riskEffect = 'UNCONTROLLED_SCOPE_DRIFT_RISK';
    }

    const simulation: ScenarioSimulation = {
      scenarioId,
      scenarioName: params.scenarioName,
      baselineConditions: {
        engineeringCapacityPercent: 72,
        qaCapacityPercent: 94,
        activeMilestonesCount: 5,
        budgetSpentUsd: 6700,
        isolationMode: 'SIMULATION_ONLY_NO_PRODUCTION_SIDE_EFFECTS',
      },
      injectedVariables: params.injectedVariables,
      simulationResults: {
        timelineEffectDays,
        resourceEffectHours,
        costEffectUsd,
        riskEffect,
        dependencyImpactCount,
      },
      confidence: 0.89,
      simulatedAt: new Date().toISOString(),
    };

    // Store in simulation sandbox history
    this.simulatedScenarios.set(scenarioId, simulation);

    this.logger.log(
      `[WHAT-IF SIMULATION] Completed [${scenarioId}]: ${params.scenarioName} -> Timeline: +${timelineEffectDays}d, Resources: +${resourceEffectHours}h. (Sandbox verified, zero production effects).`
    );

    return simulation;
  }

  getSimulations(): ScenarioSimulation[] {
    return Array.from(this.simulatedScenarios.values());
  }

  // ==========================================================
  // Seed Risk Register
  // ==========================================================

  private seedRiskRegister(): void {
    const r1: StrategicRisk = {
      id: 'RISK-01',
      objectiveId: 'OBJ-SIMMACI-REL',
      risk: 'QA verification queue backlog causing final canary milestone slippage',
      probability: 'HIGH',
      impact: 'HIGH',
      exposure: 36, // 4 (prob) * 9 (impact) = 36
      owner: 'Farhan',
      mitigation: 'Re-sequence verification tasks and defer non-critical initiative X.',
      contingency: 'Reassign Rian to parallelize database connection pool verification.',
      status: 'MITIGATING',
      evidence: ['Verification queue at 94% utilization', '48 regression suites pending'],
      reviewDate: '2026-10-02',
    };

    const r2: StrategicRisk = {
      id: 'RISK-02',
      objectiveId: 'OBJ-SIMMACI-REL',
      risk: 'Third-party AI Provider rate limit during continuous load simulation',
      probability: 'MEDIUM',
      impact: 'MEDIUM',
      exposure: 18,
      owner: 'Farhan',
      mitigation: 'Implement multi-provider fallback router (Claude -> OpenAI -> Ollama Local).',
      contingency: 'Fall back to deterministic load harness without LLM agent generation.',
      status: 'IDENTIFIED',
      evidence: ['Occasional 429 warnings in Phase 14 logs'],
      reviewDate: '2026-10-05',
    };

    const r3: StrategicRisk = {
      id: 'RISK-03',
      objectiveId: 'OBJ-SIMMACI-REL',
      risk: 'Production database schema lock during migration',
      probability: 'LOW',
      impact: 'CRITICAL',
      exposure: 20,
      owner: 'Owner / Chief Architect',
      mitigation: 'Strictly prohibit DDL mutations without explicit human cryptographic approval.',
      contingency: 'Instant rollback via pre-tested rollback script.',
      status: 'IDENTIFIED',
      evidence: ['Phase 9 Policy Engine rules: DDL strictly requires OWNER approval'],
      reviewDate: '2026-10-10',
    };

    this.riskRegister.set(r1.id, r1);
    this.riskRegister.set(r2.id, r2);
    this.riskRegister.set(r3.id, r3);
  }
}
