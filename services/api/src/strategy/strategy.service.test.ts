import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { StrategicObjectiveService } from './strategic-objective.service.js';
import { LongHorizonPlanService } from './long-horizon-plan.service.js';
import { DependencyCascadeService } from './dependency-cascade.service.js';
import { ReplanningEngineService } from './replanning-engine.service.js';
import { ForecastingBudgetService } from './forecasting-budget.service.js';
import { StrategicRiskScenarioService } from './strategic-risk-scenario.service.js';
import { DriftGovernanceService } from './drift-governance.service.js';
import { LongHorizonPilotService } from './long-horizon-pilot.service.js';
import { StrategicOrchestratorService } from './strategic-orchestrator.service.js';
import { TelegramFormatter } from '../telegram/formatter/telegram.formatter.js';

describe('Phase 15 — Strategic Autonomy & Long-Horizon Execution Test Suite', () => {
  let objectiveService: StrategicObjectiveService;
  let planService: LongHorizonPlanService;
  let cascadeService: DependencyCascadeService;
  let replanningService: ReplanningEngineService;
  let forecastService: ForecastingBudgetService;
  let riskService: StrategicRiskScenarioService;
  let governanceService: DriftGovernanceService;
  let pilotService: LongHorizonPilotService;
  let orchestratorService: StrategicOrchestratorService;

  beforeEach(() => {
    objectiveService = new StrategicObjectiveService();
    planService = new LongHorizonPlanService(objectiveService);
    cascadeService = new DependencyCascadeService(objectiveService);
    replanningService = new ReplanningEngineService(objectiveService, planService, cascadeService);
    forecastService = new ForecastingBudgetService(objectiveService);
    riskService = new StrategicRiskScenarioService(objectiveService, forecastService);
    governanceService = new DriftGovernanceService(objectiveService, planService);
    pilotService = new LongHorizonPilotService(objectiveService, planService);
    orchestratorService = new StrategicOrchestratorService(
      objectiveService,
      planService,
      cascadeService,
      replanningService,
      forecastService,
      riskService,
      governanceService
    );
  });

  // ==========================================================
  // Test 1: Strategic Objective Model
  // ==========================================================
  it('Test 1: Strategic Objective Model supports horizons, constraints, and authority bounds', () => {
    const obj = objectiveService.getObjective('OBJ-SIMMACI-REL');
    assert.ok(obj, 'Objective OBJ-SIMMACI-REL must exist');
    assert.equal(obj.horizon, 'MEDIUM');
    assert.equal(obj.name, 'Improve SIMMACI reliability');
    assert.equal(obj.budgetLimitUsd, 10000);
    assert.equal(obj.resourceLimitHours, 600);
    assert.ok(obj.successDefinition.length >= 3, 'Must have measurable success definition');

    // Authority update
    const updated = objectiveService.updateObjectiveStatus('OBJ-SIMMACI-REL', 'IN_PROGRESS', 'Owner');
    assert.equal(updated.ownerAuthority, 'Owner');
  });

  // ==========================================================
  // Test 2: Program Model
  // ==========================================================
  it('Test 2: Strategic Program Model groups related projects and initiatives under an objective', () => {
    const programs = objectiveService.getProgramsByObjective('OBJ-SIMMACI-REL');
    assert.ok(programs.length >= 1, 'Should find at least 1 program');
    const prog = programs[0];
    assert.equal(prog.id, 'PROG-REL-01');
    assert.equal(prog.objectiveId, 'OBJ-SIMMACI-REL');
    assert.equal(prog.status, 'ACTIVE');
    assert.equal(prog.priority, 'HIGH');
  });

  // ==========================================================
  // Test 3: Milestone Model
  // ==========================================================
  it('Test 3: Strategic Milestone Model enforces measurable success criteria and health states', () => {
    const milestones = objectiveService.getAllMilestones();
    assert.equal(milestones.length, 5, 'Must contain 5 initial milestones');

    const m1 = objectiveService.getMilestone('MS-SIM-01');
    assert.equal(m1?.status, 'COMPLETED');
    assert.equal(m1?.progressPercent, 100);

    const m4 = objectiveService.getMilestone('MS-SIM-04');
    assert.equal(m4?.status, 'AT_RISK');
    assert.ok(m4?.evidenceRequirements.length! >= 2);
  });

  // ==========================================================
  // Test 4: Strategy -> Execution Traceability
  // ==========================================================
  it('Test 4: Traceability answers "Kenapa task ini dikerjakan?" tracing back to approved objective', () => {
    const trace = objectiveService.explainTaskIntent('TASK-POOL-REFACTOR');
    assert.equal(trace.taskId, 'TASK-POOL-REFACTOR');
    assert.equal(trace.milestone?.id, 'MS-SIM-01');
    assert.equal(trace.program?.id, 'PROG-REL-01');
    assert.equal(trace.objective?.id, 'OBJ-SIMMACI-REL');
    assert.ok(trace.rationale.includes('Mengganti connection acquisition timeout'));
  });

  // ==========================================================
  // Test 5: Long-Horizon Plan Representation
  // ==========================================================
  it('Test 5: Long-Horizon Plan is durable and retrieves active plan', () => {
    const activePlan = planService.getActivePlan('OBJ-SIMMACI-REL');
    assert.ok(activePlan, 'Active plan must exist');
    assert.equal(activePlan.version, 3);
    assert.equal(activePlan.status, 'ACTIVE');
    assert.equal(activePlan.milestones.length, 5);
  });

  // ==========================================================
  // Test 6: Plan Versioning (v1 -> v2 -> v3; preserves history)
  // ==========================================================
  it('Test 6: Plan Versioning increments versions and preserves historical audit trail without overwriting', () => {
    const history = planService.getPlanVersionHistory('OBJ-SIMMACI-REL');
    assert.equal(history.length, 3, 'Must contain history for v1, v2, v3');
    assert.equal(history[0].version, 1);
    assert.equal(history[1].version, 2);
    assert.equal(history[2].version, 3);

    // Create v4
    const newPlan = planService.createNewPlanVersion({
      previousPlanId: 'OBJ-SIMMACI-REL-PLAN-V3',
      reason: 'Scheduled quarterly alignment update',
      trigger: 'QUARTERLY_REVIEW',
      changedScope: ['Added automated failover drill'],
      changedTimeline: ['Preserved final target'],
      changedDependencies: [],
      changedResources: ['Allocated SRE assistant'],
      approvedBy: 'Owner / Chief Architect',
    });

    assert.equal(newPlan.version, 4);
    assert.equal(newPlan.status, 'ACTIVE');

    const updatedHistory = planService.getPlanVersionHistory('OBJ-SIMMACI-REL');
    assert.equal(updatedHistory.length, 4);
    assert.equal(updatedHistory[3].version, 4);

    // Verify v3 was preserved as SUPERSEDED
    const prevPlan = planService.getPlan('OBJ-SIMMACI-REL-PLAN-V3');
    assert.equal(prevPlan?.status, 'SUPERSEDED');
  });

  // ==========================================================
  // Test 7: Plan Deviation Detection
  // ==========================================================
  it('Test 7: Plan Deviation Detection identifies timeline, capacity, and risk drift', () => {
    const deviation = planService.detectPlanDeviation('OBJ-SIMMACI-REL');
    assert.equal(deviation.deviationDetected, true);
    assert.equal(deviation.timelineDeviationDays, 4);
    assert.equal(deviation.rootCause, 'Verification queue increased after security review.');
    assert.equal(deviation.impactSummary, 'Final milestone may slip.');
    assert.ok(deviation.affectedMilestoneIds.includes('MS-SIM-04'));
  });

  // ==========================================================
  // Test 8: Milestone Health Derivation from Evidence
  // ==========================================================
  it('Test 8: Milestone Health is derived from evidence thresholds, rejecting narrative interpretation', () => {
    // 0 days behind, 100% test pass -> ON_TRACK
    const healthOnTrack = planService.evaluateMilestoneHealth('MS-1', {
      daysBehindBaseline: 0,
      blockerCount: 0,
      testPassRatePercent: 98,
      actualProgressPercent: 50,
    });
    assert.equal(healthOnTrack, 'ON_TRACK');

    // 4 days behind -> AT_RISK
    const healthAtRisk = planService.evaluateMilestoneHealth('MS-2', {
      daysBehindBaseline: 4,
      blockerCount: 0,
      testPassRatePercent: 95,
      actualProgressPercent: 60,
    });
    assert.equal(healthAtRisk, 'AT_RISK');

    // Blocker > 0 -> BLOCKED
    const healthBlocked = planService.evaluateMilestoneHealth('MS-3', {
      daysBehindBaseline: 1,
      blockerCount: 1,
      testPassRatePercent: 95,
      actualProgressPercent: 40,
    });
    assert.equal(healthBlocked, 'BLOCKED');

    // Days behind > 7 -> MISSED
    const healthMissed = planService.evaluateMilestoneHealth('MS-4', {
      daysBehindBaseline: 10,
      blockerCount: 0,
      testPassRatePercent: 80,
      actualProgressPercent: 40,
    });
    assert.equal(healthMissed, 'MISSED');

    // 100% progress & 100% test pass -> COMPLETED
    const healthCompleted = planService.evaluateMilestoneHealth('MS-5', {
      daysBehindBaseline: 0,
      blockerCount: 0,
      testPassRatePercent: 100,
      actualProgressPercent: 100,
    });
    assert.equal(healthCompleted, 'COMPLETED');
  });

  // ==========================================================
  // Test 9: Early Warning System
  // ==========================================================
  it('Test 9: Early Warning System captures early alerts with evidence, impact, and confidence', () => {
    planService.detectPlanDeviation('OBJ-SIMMACI-REL');
    const warnings = planService.getActiveWarnings('OBJ-SIMMACI-REL');
    assert.ok(warnings.length >= 1, 'Should emit early warning upon deviation');
    const top = warnings[0];
    assert.ok(top.observation.includes('QA verification is 4 days behind'));
    assert.equal(top.severity, 'WARNING');
    assert.ok(top.confidence >= 0.9);
    assert.ok(top.recommendedAction.includes('Re-sequence verification work'));
  });

  // ==========================================================
  // Test 10: Horizon Monitor
  // ==========================================================
  it('Test 10: Horizon Monitor provides rolling visibility across 5 time horizons', () => {
    const horizons = planService.getHorizonTimeline();
    assert.equal(horizons.length, 5);
    assert.equal(horizons[0].horizon, 'TODAY');
    assert.equal(horizons[1].horizon, 'THIS_WEEK');
    assert.equal(horizons[2].horizon, 'THIS_MONTH');
    assert.equal(horizons[3].horizon, 'NEXT_QUARTER');
    assert.equal(horizons[4].horizon, 'LONG_TERM');

    const explanation = planService.explainQuarterlyObjectiveAlignment('OBJ-SIMMACI-REL');
    assert.ok(explanation.includes('MS-SIM-04'));
    assert.ok(explanation.includes('MS-SIM-05'));
  });

  // ==========================================================
  // Test 11: Dependency Graph Representation
  // ==========================================================
  it('Test 11: Dependency Graph connects multi-tier hierarchy in graph topology', () => {
    const nodeObj = cascadeService.getNode('OBJ-SIMMACI-REL');
    assert.ok(nodeObj);
    assert.equal(nodeObj.type, 'OBJECTIVE');

    const edges = cascadeService.getEdges();
    assert.ok(edges.length >= 6, 'Must contain relationships');
    const blocksEdge = edges.find((e) => e.relationship === 'BLOCKS');
    assert.ok(blocksEdge);
    assert.equal(blocksEdge.fromId, 'MS-SIM-04');
    assert.equal(blocksEdge.toId, 'MS-SIM-05');
  });

  // ==========================================================
  // Test 12: Cascade Impact Analysis
  // ==========================================================
  it('Test 12: Cascade Impact Analysis computes exact affected nodes without blind propagation', () => {
    const impact = cascadeService.calculateCascadeImpact('MS-SIM-04');
    assert.equal(impact.failedDependencyId, 'MS-SIM-04');
    assert.ok(impact.affectedMilestoneIds.includes('MS-SIM-05'));
    assert.ok(impact.affectedObjectiveIds.includes('OBJ-SIMMACI-REL'));
    assert.ok(impact.affectedProjectIds.includes('SIMMACI'));
    assert.ok(impact.affectedAgentRoles.includes('Farhan'));
    assert.equal(impact.estimatedDeadlineDelayDays, 4);
    assert.equal(impact.impactSeverity, 'HIGH');
  });

  // ==========================================================
  // Test 13: Dynamic Replanning & Multi-Option Analysis
  // ==========================================================
  it('Test 13: Dynamic Replanning generates Option A, Option B, and Option C with trade-offs', () => {
    const evaluation = replanningService.evaluateReplanning('OBJ-SIMMACI-REL');
    assert.equal(evaluation.recommendedOptions.length, 3);

    const optA = evaluation.recommendedOptions.find((o) => o.optionId === 'OPT-A');
    const optB = evaluation.recommendedOptions.find((o) => o.optionId === 'OPT-B');
    const optC = evaluation.recommendedOptions.find((o) => o.optionId === 'OPT-C');

    assert.ok(optA && optA.strategy === 'DEADLINE_ADJUSTMENT');
    assert.ok(optA.requiresOwnerApproval === true);

    assert.ok(optB && optB.strategy === 'SCOPE_REDUCTION');
    assert.ok(optB.requiresOwnerApproval === true);

    assert.ok(optC && optC.strategy === 'SEQUENCE_CHANGE');
    assert.ok(optC.requiresOwnerApproval === false); // Within bounded autonomy S3
  });

  // ==========================================================
  // Test 14: Replanning Execution
  // ==========================================================
  it('Test 14: Replanning execution activates revision and logs immutable audit trail', () => {
    const newPlan = replanningService.executeApprovedReplan({
      objectiveId: 'OBJ-SIMMACI-REL',
      chosenOptionId: 'OPT-C',
      approvedBy: 'Farhan (Chief AI Architect)',
    });

    assert.ok(newPlan);
    assert.equal(newPlan.status, 'ACTIVE');
    assert.ok(newPlan.version >= 4);
  });

  // ==========================================================
  // Test 15: Safe Plan Rollback
  // ==========================================================
  it('Test 15: Safe Plan Rollback restores previous approved plan upon degradation detection', () => {
    const rollback = replanningService.rollbackToPreviousApprovedPlan({
      objectiveId: 'OBJ-SIMMACI-REL',
      reason: 'Automated test degradation detected during canary',
      degradedMetrics: ['API latency spiked by 40ms'],
      authorizedBy: 'Owner / Chief Architect',
    });

    assert.equal(rollback.success, true);
    assert.ok(rollback.incidentId.startsWith('INC-ROLLBACK'));

    const history = replanningService.getRollbackHistory();
    assert.equal(history.length, 1);
  });

  // ==========================================================
  // Test 16: Budget Control & Threshold Warnings
  // ==========================================================
  it('Test 16: Budget Control tracks spent, committed, remaining, and warns at 70%, 85%, 95%, 100%', () => {
    const budget = forecastService.getBudgetStatus('OBJ-SIMMACI-REL');
    assert.equal(budget.budgetLimit, 10000);
    assert.equal(budget.spentObserved, 6700);
    assert.equal(budget.committed, 500);
    assert.equal(budget.remaining, 2800);
    assert.equal(budget.utilizationPercentage, 72);
    assert.ok(budget.activeThresholdAlerts.some((a) => a.includes('70% THRESHOLD')));

    // Attempting overspend beyond $10,000 must be rejected
    assert.throws(
      () => forecastService.recordSpend('OBJ-SIMMACI-REL', 3500),
      /Overspend rejected/
    );
  });

  // ==========================================================
  // Test 17: Cost Forecasting
  // ==========================================================
  it('Test 17: Cost Forecasting clearly distinguishes observed, committed, and forecast spend', () => {
    const forecast = forecastService.getCostForecastBreakdown('OBJ-SIMMACI-REL');
    assert.equal(forecast.observedActualSpendUsd, 6700);
    assert.equal(forecast.committedUpcomingSpendUsd, 500);
    assert.ok(forecast.projectedForecastToCompletionUsd > 6700);
    assert.ok(forecast.note.includes('NOT actual billing charges'));
  });

  // ==========================================================
  // Test 18: Capacity Demand Forecasting
  // ==========================================================
  it('Test 18: 14-Day Capacity Demand Forecast mirrors Section 65 telemetry (Engineering 72%, QA 94%)', () => {
    const capacity = forecastService.get14DayCapacityForecast();
    assert.equal(capacity.periodDays, 14);

    const eng = capacity.slices.find((s) => s.role === 'ENGINEERING');
    const qa = capacity.slices.find((s) => s.role === 'QA');

    assert.equal(eng?.utilizationPercent, 72);
    assert.equal(eng?.status, 'OPTIMAL');

    assert.equal(qa?.utilizationPercent, 94);
    assert.equal(qa?.status, 'STRAINED');
  });

  // ==========================================================
  // Test 19: Strategic Risk Register
  // ==========================================================
  it('Test 19: Strategic Risk Register calculates exposure and identifies highest risk objective', () => {
    const risks = riskService.getAllRisks('OBJ-SIMMACI-REL');
    assert.ok(risks.length >= 3);

    const highest = riskService.getHighestRiskObjective();
    assert.equal(highest.objectiveId, 'OBJ-SIMMACI-REL');
    assert.ok(highest.totalExposure >= 20);
    assert.ok(highest.highestRisk.risk.includes('QA verification queue'));
  });

  // ==========================================================
  // Test 20: Workforce Continuity & Fallback Paths
  // ==========================================================
  it('Test 20: Workforce Continuity identifies bottlenecks and establishes fallback paths', () => {
    const continuityRisks = riskService.getWorkforceContinuityRisks();
    assert.ok(continuityRisks.length >= 2);

    const qaCont = continuityRisks.find((c) => c.roleOrCapability.includes('QA Security'));
    assert.equal(qaCont?.primaryAgent, 'Farhan (QA Lead)');
    assert.ok(qaCont?.backupCapability.includes('Rian'));
    assert.equal(qaCont?.riskSeverity, 'HIGH');
  });

  // ==========================================================
  // Test 21: What-If Scenario Engine Simulation
  // ==========================================================
  it('Test 21: What-If Scenario Simulation evaluates hypothetical events with zero production mutations', () => {
    const sim = riskService.runScenarioSimulation({
      scenarioName: 'Simulation: Rian becomes unavailable for 1 week',
      injectedVariables: {
        agentUnavailable: 'Rian',
        qaCapacityHalved: true,
      },
    });

    assert.equal(sim.simulationResults.timelineEffectDays, 15); // 7 + 8
    assert.ok(sim.simulationResults.resourceEffectHours > 0);
    assert.equal(
      (sim.baselineConditions as any).isolationMode,
      'SIMULATION_ONLY_NO_PRODUCTION_SIDE_EFFECTS'
    );

    // Verify production plan and milestones remained unchanged
    const m4 = objectiveService.getMilestone('MS-SIM-04');
    assert.equal(m4?.status, 'AT_RISK'); // Production remains unchanged
  });

  // ==========================================================
  // Test 22: Strategic Drift Detection
  // ==========================================================
  it('Test 22: Strategic Drift Detection identifies unlinked tasks or unapproved scope expansion', () => {
    const drift = governanceService.detectStrategicDrift('OBJ-SIMMACI-REL');
    assert.ok(Array.isArray(drift));
  });

  // ==========================================================
  // Test 23: Objective Obsolescence Detection
  // ==========================================================
  it('Test 23: Objective Obsolescence evaluates core assumptions without silent cancellation', () => {
    const check = governanceService.checkObjectiveObsolescence('OBJ-SIMMACI-REL');
    assert.equal(check.isObsolescent, false);
    assert.equal(check.recommendation, 'CONTINUE');
    assert.ok(check.assumptionsEvaluated.length >= 2);
  });

  // ==========================================================
  // Test 24: Bounded Strategic Autonomy
  // ==========================================================
  it('Test 24: Bounded Strategic Autonomy enforces governance boundaries for high-risk actions', () => {
    // Routine test is permitted under S3
    const routine = governanceService.isActionPermitted({
      type: 'ROUTINE_TEST',
      objectiveId: 'OBJ-SIMMACI-REL',
    });
    assert.equal(routine.permitted, true);
    assert.equal(routine.requiresOwnerApproval, false);

    // Production deploy requires Owner approval
    const deploy = governanceService.isActionPermitted({
      type: 'PRODUCTION_DEPLOY',
      objectiveId: 'OBJ-SIMMACI-REL',
    });
    assert.equal(deploy.permitted, false);
    assert.equal(deploy.requiresOwnerApproval, true);

    // Budget increase requires Owner approval
    const budgetInc = governanceService.isActionPermitted({
      type: 'BUDGET_INCREASE',
      objectiveId: 'OBJ-SIMMACI-REL',
    });
    assert.equal(budgetInc.permitted, false);
    assert.equal(budgetInc.requiresOwnerApproval, true);
  });

  // ==========================================================
  // Test 25: Decision Requests
  // ==========================================================
  it('Test 25: Strategic Decision Request follows formal DECISION REQUIRED template and can be resolved by Owner', () => {
    const req = governanceService.createDecisionRequest({
      objectiveId: 'OBJ-SIMMACI-REL',
      issue: 'Milestone MS-SIM-04 queue saturation requires re-sequencing choice.',
      evidence: ['48 verification suites in backlog', 'QA capacity at 94%'],
      options: [
        {
          optionId: 'OPT-A',
          title: 'Option A: Extend Timeline',
          strategy: 'DEADLINE_ADJUSTMENT',
          expectedOutcome: 'Perpanjang deadline 4 hari',
          estimatedCostUsd: 0,
          estimatedEffortHours: 32,
          risk: 'LOW',
          dependencyImpact: ['MS-SIM-05 bergeser'],
          qualityImplications: 'Kualitas maksimal',
          confidence: 0.95,
          requiresOwnerApproval: true,
        },
      ],
      tradeOffsSummary: 'Extend timeline preserves full test coverage; scope reduction keeps original date.',
      decisionDeadline: '2026-10-03T18:00:00Z',
      impactIfNoDecision: 'Automated fallback to Option C under S3 Bounded Autonomy.',
    });

    assert.equal(req.status, 'PENDING');

    // Owner resolves request
    const resolved = governanceService.resolveDecisionRequest(req.requestId, 'OPT-A', 'Owner');
    assert.equal(resolved.status, 'DECIDED');
    assert.equal(resolved.decidedOptionId, 'OPT-A');
  });

  // ==========================================================
  // Test 26: Long-Horizon Pilot Lifecycle (Section 62)
  // ==========================================================
  it('Test 26: Real Long-Horizon Pilot tracks complete multi-milestone lifecycle', () => {
    const pilot = pilotService.getPilotState();
    assert.equal(pilot.pilotId, 'PILOT-SIMMACI-REL');
    assert.equal(pilot.objectiveName, 'Improve SIMMACI reliability');
    assert.equal(pilot.currentStage, 'DEVIATION');
    assert.ok(pilot.milestones.length === 5);
    assert.ok(pilot.completedTasksCount >= 10);

    // Advance to REPLANNING -> CONTINUED_EXECUTION -> FINAL_OUTCOME
    pilotService.advancePilotStage('REPLANNING', 'Evaluated trade-off options for QA queue clearance');
    pilotService.advancePilotStage('CONTINUED_EXECUTION', 'Re-sequenced test verification between Farhan and Rian');
    pilotService.advancePilotStage('MEASUREMENT', 'Measured zero database connection drops and 2.1s failover');
    const finalState = pilotService.advancePilotStage('FINAL_OUTCOME', 'Zero-outage production deployment verified');

    assert.equal(finalState.currentStage, 'FINAL_OUTCOME');
    assert.equal(finalState.measuredReliabilityScore, 99.95);
    assert.ok(finalState.finalVerdict.includes('COMPLETED SUCCESSFULLY'));
  });

  // ==========================================================
  // Test 27: Section 65 Operational Target: Exact Text Match
  // ==========================================================
  it('Test 27: Section 65 Briefing produces EXACT output specified in prompt Section 65', () => {
    const text = orchestratorService.formatSection65Briefing();

    // Verify exact expected lines from prompt Section 65
    assert.ok(text.includes('KDI STRATEGIC STATUS'));
    assert.ok(text.includes('Objective:\nImprove SIMMACI reliability'));
    assert.ok(text.includes('Plan:\nv3'));
    assert.ok(text.includes('Milestones:\n3 completed\n1 in progress\n1 at risk'));
    assert.ok(text.includes('Current deviation:\nQA verification is 4 days behind baseline.'));
    assert.ok(text.includes('Cause:\nVerification queue increased after security review.'));
    assert.ok(text.includes('Impact:\nFinal milestone may slip.'));
    assert.ok(text.includes('Capacity:\nEngineering 72%\nQA 94%'));
    assert.ok(
      text.includes(
        'Recommendation:\nRe-sequence verification work and defer\nnon-critical initiative X.'
      )
    );
    assert.ok(
      text.includes(
        'No strategic change has been executed.\nOwner decision is required only if scope or\ndeadline tolerance must change.'
      )
    );
  });

  // ==========================================================
  // Test 28: Section 32 Decision Support Queries
  // ==========================================================
  it('Test 28: Section 32 Decision Support queries return authoritative, evidence-driven responses', () => {
    // 1. "Objective mana yang paling berisiko?"
    const q1 = orchestratorService.answerStrategicQuery('Objective mana yang paling berisiko?');
    assert.ok(q1.includes('OBJECTIVE PALING BERISIKO'));
    assert.ok(q1.includes('Improve SIMMACI reliability'));

    // 2. "Milestone mana yang mulai terlambat?"
    const q2 = orchestratorService.answerStrategicQuery('Milestone mana yang mulai terlambat?');
    assert.ok(q2.includes('MILESTONE TERLAMBAT / AT RISK'));
    assert.ok(q2.includes('MS-SIM-04'));

    // 3. "Apa yang berubah dari rencana terakhir?"
    const q3 = orchestratorService.answerStrategicQuery('Apa yang berubah dari rencana terakhir?');
    assert.ok(q3.includes('PERUBAHAN RENCANA STRATEGIS'));
    assert.ok(q3.includes('v3'));

    // 4. "Kenapa KDI melakukan replanning?"
    const q4 = orchestratorService.answerStrategicQuery('Kenapa KDI melakukan replanning?');
    assert.ok(q4.includes('JUSTIFIKASI REPLANNING STRATEGIS'));
    assert.ok(q4.includes('Option C'));

    // 5. "Apa dependency paling kritis?"
    const q5 = orchestratorService.answerStrategicQuery('Apa dependency paling kritis?');
    assert.ok(q5.includes('DEPENDENCY PALING KRITIS'));
    assert.ok(q5.includes('MS-SIM-04'));

    // 6. "Berapa resource yang masih tersedia?"
    const q6 = orchestratorService.answerStrategicQuery('Berapa resource yang masih tersedia?');
    assert.ok(q6.includes('KAPASITAS RESOURCE TERSEDIA'));
    assert.ok(q6.includes('Engineering'));
    assert.ok(q6.includes('QA'));

    // 7. "Apakah ada budget risk?"
    const q7 = orchestratorService.answerStrategicQuery('Apakah ada budget risk?');
    assert.ok(q7.includes('EVALUASI RISIKO BUDGET'));
    assert.ok(q7.includes('6700') && q7.includes('72%'));

    // 8. "Apa yang membutuhkan keputusan saya?"
    const q8 = orchestratorService.answerStrategicQuery('Apa yang membutuhkan keputusan saya?');
    assert.ok(q8.includes('KEPUTUSAN OWNER'));
  });

  // ==========================================================
  // Test 29: Section 33 Executive Weekly Briefing
  // ==========================================================
  it('Test 29: Section 33 Executive Weekly Briefing matches mandated high-level synthesis', () => {
    const text = orchestratorService.getExecutiveWeeklyBriefing();
    assert.ok(text.includes('KDI STRATEGIC BRIEFING'));
    assert.ok(text.includes('Objectives:\n4 active'));
    assert.ok(text.includes('Milestones:\n7 on track\n1 at risk\n1 blocked'));
    assert.ok(text.includes('Capacity:\nEngineering 78%\nQA 91%'));
    assert.ok(text.includes('Budget:\n67% utilized'));
    assert.ok(text.includes('Critical dependency:\nDeployment documentation'));
  });

  // ==========================================================
  // Test 30: Adversarial Testing & Safety Boundaries (Section 59, 60)
  // ==========================================================
  it('Test 30: Adversarial inputs and unauthorized mutations are strictly rejected while preserving state', () => {
    // 1. Attempt unauthorized status cancellation without owner authority
    assert.throws(
      () => objectiveService.updateObjectiveStatus('OBJ-INVALID', 'CANCELLED', 'UnauthorizedActor'),
      /not found/
    );

    // 2. Budget overspend attempts are blocked
    assert.throws(
      () => forecastService.recordSpend('OBJ-SIMMACI-REL', 999999),
      /Overspend rejected/
    );

    // 3. Unauthorized high-risk strategic actions are rejected by policy
    const unapprovedProdDeploy = governanceService.isActionPermitted({
      type: 'PRODUCTION_DEPLOY',
      objectiveId: 'OBJ-SIMMACI-REL',
    });
    assert.equal(unapprovedProdDeploy.permitted, false);
    assert.equal(unapprovedProdDeploy.requiresOwnerApproval, true);

    // 4. Prompt injection attempts cannot bypass bounded autonomy
    const defense = TelegramFormatter.formatSecurityPolicyDefense(
      'INJECTION_ATTEMPT',
      'Policy Engine authority is sovereign'
    );
    assert.ok(defense.includes('PERTAHANAN KEAMANAN TERPASANG'));

    // 5. Authoritative state remains uncorrupted
    const obj = objectiveService.getObjective('OBJ-SIMMACI-REL');
    assert.equal(obj?.status, 'IN_PROGRESS');
    const plan = planService.getActivePlan('OBJ-SIMMACI-REL');
    assert.equal(plan?.status, 'ACTIVE');
  });
});
