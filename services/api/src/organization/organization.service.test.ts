// ==========================================================
// services/api/src/organization/organization.service.test.ts
// Comprehensive Phase 13 Verification Suite: AI Workforce Maturity & Organizational Intelligence
// ==========================================================

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ObjectiveService } from './objective.service.js';
import { PriorityEngineService } from './priority-engine.service.js';
import { CapacityEngineService } from './capacity-engine.service.js';
import { WorkforceIntelligenceService } from './workforce-intelligence.service.js';
import { KPIEngineService } from './kpi-engine.service.js';
import { HealthBottleneckService } from './health-bottleneck.service.js';
import { KnowledgeIntelligenceService } from './knowledge-intelligence.service.js';
import { LessonsLearnedService } from './lessons-learned.service.js';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service.js';
import { RecommendationDecisionService } from './recommendation-decision.service.js';
import { ReportingService } from './reporting.service.js';
import { TelegramFormatter } from '../telegram/formatter/telegram.formatter.js';

describe('Phase 13 — AI Workforce Maturity & Organizational Intelligence Verification Suite', () => {
  let objectiveService: ObjectiveService;
  let priorityEngine: PriorityEngineService;
  let capacityEngine: CapacityEngineService;
  let workforceIntelligence: WorkforceIntelligenceService;
  let kpiEngine: KPIEngineService;
  let healthBottleneck: HealthBottleneckService;
  let knowledgeService: KnowledgeIntelligenceService;
  let lessonsService: LessonsLearnedService;
  let portfolioService: PortfolioIntelligenceService;
  let recommendationDecision: RecommendationDecisionService;
  let reportingService: ReportingService;

  beforeEach(() => {
    objectiveService = new ObjectiveService();
    priorityEngine = new PriorityEngineService(objectiveService);
    capacityEngine = new CapacityEngineService();
    workforceIntelligence = new WorkforceIntelligenceService(capacityEngine);
    kpiEngine = new KPIEngineService();
    healthBottleneck = new HealthBottleneckService(capacityEngine, objectiveService);
    knowledgeService = new KnowledgeIntelligenceService(undefined, objectiveService);
    lessonsService = new LessonsLearnedService();
    portfolioService = new PortfolioIntelligenceService();
    recommendationDecision = new RecommendationDecisionService(
      objectiveService,
      priorityEngine,
      capacityEngine,
      kpiEngine,
      healthBottleneck,
      knowledgeService,
      lessonsService,
      portfolioService
    );
    reportingService = new ReportingService(
      objectiveService,
      capacityEngine,
      healthBottleneck,
      portfolioService,
      lessonsService,
      recommendationDecision
    );
  });

  // ==========================================================
  // 1. OBJECTIVE MODEL & TRACEABILITY (Sections 3, 4, 5)
  // ==========================================================

  test('Test 1: Objective Model supports flexible hierarchy (Vision -> Strategic -> Project)', () => {
    const objectives = objectiveService.getAllObjectives();
    assert.ok(objectives.length >= 4, 'Should contain seeded objectives');

    const vision = objectives.find((o) => o.hierarchyLevel === 'VISION');
    assert.ok(vision, 'Must contain Vision level objective');
    assert.strictEqual(vision?.owner, 'OWNER');
    assert.strictEqual(vision?.priority, 'CRITICAL');

    const strat = objectives.find((o) => o.hierarchyLevel === 'STRATEGIC' && o.id === 'OBJ-STRAT-001');
    assert.ok(strat, 'Must contain SIMMACI Strategic Objective');
    assert.strictEqual(strat?.parentObjectiveId, vision?.id);
    assert.ok(strat?.successCriteria.length > 0);

    const hierarchy = objectiveService.getObjectiveHierarchy();
    assert.ok(hierarchy.length > 0, 'Hierarchy should render root nodes');
    assert.ok(hierarchy[0].children.length > 0, 'Root node should have children');
  });

  test('Test 2: Objective to Task Traceability links execution to goals (Section 5)', () => {
    const trace = objectiveService.getTaskObjectiveTrace(
      'tsk_01J9X8A1B2C3',
      'Patch PickupService null pointer exception'
    );
    assert.strictEqual(trace.taskId, 'tsk_01J9X8A1B2C3');
    assert.strictEqual(trace.initiativeId, 'INIT-001');
    assert.strictEqual(trace.initiativeName, 'SIMMACI Redis Connection Hardening & Retry Loop');
    assert.strictEqual(trace.objectiveId, 'OBJ-PROJ-001');
    assert.ok(
      trace.strategicAlignmentReason.includes('SIMMACI Redis Connection Hardening'),
      'Trace must articulate strategic contribution'
    );
  });

  test('Test 3: At-Risk Objective Detection identifies delayed goals', () => {
    // Add an at-risk objective
    const atRisk = objectiveService.createObjective({
      name: 'Experimental Microservice Migration',
      description: 'Migrating legacy monolith module to async worker',
      owner: 'SYSTEM_ARCHITECT',
      hierarchyLevel: 'PROJECT',
      type: 'ENGINEERING',
      priority: 'HIGH',
      status: 'AT_RISK',
      startDate: '2026-09-01T00:00:00Z',
      targetDate: '2026-10-01T00:00:00Z',
      successCriteria: ['Latency < 100ms'],
      measurementMethod: 'Load testing benchmark',
      riskLevel: 'HIGH',
      progressPercentage: 35,
    });

    const atRiskList = objectiveService.getAtRiskObjectives();
    assert.ok(atRiskList.some((o) => o.id === atRisk.id));
  });

  // ==========================================================
  // 2. PRIORITY ENGINE & CONFLICT RESOLUTION (Sections 6, 7)
  // ==========================================================

  test('Test 4: Deterministic Priority Calculation produces explainable scores without LLM (Section 6)', () => {
    const criticalTask = priorityEngine.evaluateTaskPriority({
      taskId: 'tsk_prod_outage',
      title: 'Fix production outage and auth token validation vulnerability',
      isProductionCritical: true,
      securityRelevant: true,
      riskLevel: 'CRITICAL',
      blockingTasksCount: 3,
      objectiveId: 'OBJ-STRAT-001',
    });

    assert.ok(criticalTask.score >= 80, `Expected score >= 80, got ${criticalTask.score}`);
    assert.strictEqual(criticalTask.priorityTier, 'CRITICAL');
    assert.ok(criticalTask.reasons.length >= 3, 'Must provide multiple explainable reasons');
    assert.ok(criticalTask.reasons.some((r) => r.includes('keandalan sistem produksi')));
    assert.ok(criticalTask.reasons.some((r) => r.includes('keamanan')));

    // Normal engineering task
    const normalTask = priorityEngine.evaluateTaskPriority({
      taskId: 'tsk_normal_docs',
      title: 'Update readme documentation for internal developers',
      riskLevel: 'LOW',
      blockingTasksCount: 0,
    });

    assert.ok(normalTask.score < 65, 'Normal task should not be HIGH or CRITICAL');
    assert.strictEqual(normalTask.priorityTier, 'LOW');
  });

  test('Test 5: Priority Conflict Resolution detects overload and sequences work (Section 7)', () => {
    const highTasks = [
      { taskId: 't1', title: 'Critical Hotfix A', isProductionCritical: true, estimatedEffortHours: 2 },
      { taskId: 't2', title: 'Critical Hotfix B', isProductionCritical: true, estimatedEffortHours: 8 },
      { taskId: 't3', title: 'High Security Fix C', securityRelevant: true, estimatedEffortHours: 4 },
      { taskId: 't4', title: 'High Migration D', isProductionCritical: true, estimatedEffortHours: 6 },
      { taskId: 't5', title: 'High Telemetry E', securityRelevant: true, estimatedEffortHours: 1 },
    ];

    // Concurrency capacity is 3 workers, but there are 5 high tasks
    const resolution = priorityEngine.resolvePriorityConflicts(highTasks, 3);
    assert.strictEqual(resolution.conflictType, 'TOO_MANY_HIGH_TASKS');
    assert.strictEqual(resolution.availableAgentsCount, 3);
    assert.strictEqual(resolution.highPriorityTasksCount, 5);
    assert.strictEqual(resolution.recommendedSequence.length, 5);
    assert.strictEqual(resolution.recommendedSequence[0].sequenceRank, 1);
    assert.ok(resolution.recommendedSequence[0].rationale.includes('Urutan #1'));
  });

  test('Test 6: Priority Conflict Resolution detects dependency bottlenecks', () => {
    const tasks = [
      { taskId: 't_parent', title: 'Unblock database migrations', blockedByTasksCount: 0, estimatedEffortHours: 1 },
      { taskId: 't_blocked', title: 'Deploy schema change', blockedByTasksCount: 2, riskLevel: 'HIGH' as const },
    ];

    const resolution = priorityEngine.resolvePriorityConflicts(tasks, 3);
    assert.strictEqual(resolution.conflictType, 'DEPENDENCY_BOTTLENECK');
    assert.ok(resolution.description.includes('tertahan oleh dependensi'));
  });

  // ==========================================================
  // 3. WORKFORCE CAPACITY & PERFORMANCE (Sections 8, 9, 10, 11)
  // ==========================================================

  test('Test 7: Capacity Engine tracks availability, overload, and underutilization (Section 8, 9)', () => {
    const overview = capacityEngine.getCapacityOverview();
    assert.strictEqual(overview.totalAgents, 9);
    assert.ok(overview.availableAgents.length > 0, 'Should identify available agents');
    assert.ok(overview.overloadedAgents.includes('Farhan'), 'Farhan should be identified as overloaded');
    assert.ok(overview.overloadedAgents.includes('Nadia'), 'Nadia should be identified as overloaded');
    assert.ok(overview.underutilizedAgents.includes('Tari'), 'Tari should be identified as underutilized');
    assert.ok(overview.systemUtilizationPercent > 0);
  });

  test('Test 8: Contextualized Agent Performance prevents gamified raw ranking (Section 10, 11)', () => {
    const indicators = workforceIntelligence.getAllIndicators();
    assert.strictEqual(indicators.length, 9);

    const farhan = workforceIntelligence.getIndicator('AGT-ENG-001')!;
    assert.strictEqual(farhan.agentName, 'Farhan');
    assert.ok(farhan.completionReliability >= 90);
    assert.ok(farhan.verificationPassRate >= 95);
    assert.ok(farhan.contextualFactors.taskDifficultyMix.complex > 0, 'Performance must be contextualized by complexity');

    const report = workforceIntelligence.getContextualPerformanceReport('AGT-ENG-001');
    assert.ok(report.includes('Keandalan Penyelesaian'));
    assert.ok(report.includes('Distribusi Kesulitan Tugas'));
  });

  // ==========================================================
  // 4. KPI ENGINE & DATA PROVENANCE (Sections 12, 13)
  // ==========================================================

  test('Test 9: Generic KPI Engine tracks 8 core KPIs with mathematical provenance (Section 12, 13)', () => {
    const snapshots = kpiEngine.getAllSnapshots();
    assert.strictEqual(snapshots.length, 8, 'Must calculate all 8 required KPIs');

    const completionRate = kpiEngine.getSnapshot('KPI-001');
    assert.ok(completionRate);
    assert.strictEqual(completionRate?.kpiName, 'Task Completion Rate');
    assert.ok(completionRate?.value >= 90);
    assert.ok(completionRate?.sourceReferences.length > 0, 'Must have traceable data provenance');
    assert.ok(completionRate?.formulaVersion, 'Must have formula version');

    const mttr = kpiEngine.getSnapshot('KPI-003');
    assert.strictEqual(mttr?.kpiName, 'Incident Recovery Time (MTTR)');
    assert.ok(mttr?.value <= 15.0, 'MTTR must be within target');
    assert.strictEqual(mttr?.status, 'HEALTHY');
  });

  // ==========================================================
  // 5. HEALTH, BOTTLENECKS & SPOF (Sections 14, 15, 16)
  // ==========================================================

  test('Test 10: Organizational Health evaluates 6 distinct dimensions without collapsing (Section 14)', () => {
    const health = healthBottleneck.getOrganizationalHealth();
    assert.ok(['HEALTHY', 'ATTENTION_NEEDED'].includes(health.overallState));
    assert.ok(health.dimensions.DELIVERY.score >= 90);
    assert.ok(health.dimensions.RELIABILITY.score >= 95);
    assert.ok(health.dimensions.SECURITY.score === 100);
    assert.ok(health.dimensions.WORKFORCE.score >= 80);
    assert.ok(health.dimensions.COST.score >= 90);
    assert.ok(health.dimensions.OBJECTIVE.score >= 80);

    assert.ok(health.dimensions.SECURITY.evidence.some((e) => e.includes('PromptInjectionDefense')));
    assert.ok(health.dimensions.DELIVERY.evidence.some((e) => e.includes('worktree')));
  });

  test('Test 11: Real-Time Bottleneck Detection detects QA queue buildup (Section 15)', () => {
    const bottlenecks = healthBottleneck.detectBottlenecks();
    assert.ok(bottlenecks.length > 0);

    const qaBottleneck = bottlenecks.find((b) => b.type === 'QA_CAPACITY');
    assert.ok(qaBottleneck, 'Must identify QA queue bottleneck');
    assert.strictEqual(qaBottleneck?.waitingCount, 3);
    assert.ok(qaBottleneck?.remediationRecommendation.includes('Prioritaskan penyelesaian antrean QA'));
  });

  test('Test 12: Single Point of Failure (SPOF) Detection identifies critical dependencies (Section 16)', () => {
    const spofs = healthBottleneck.detectSinglePointsOfFailure();
    assert.ok(spofs.length >= 4);

    const farhanSpof = spofs.find((s) => s.category === 'CAPABILITY');
    assert.ok(farhanSpof);
    assert.ok(farhanSpof?.entity.includes('Farhan'));

    const ownerSpof = spofs.find((s) => s.category === 'APPROVAL');
    assert.ok(ownerSpof);
    assert.ok(ownerSpof?.entity.includes('Owner'));
    assert.ok(ownerSpof?.mitigationAction.includes('intentional by-policy'));
  });

  // ==========================================================
  // 6. KNOWLEDGE INTELLIGENCE & LESSONS LEARNED (Sections 17-21)
  // ==========================================================

  test('Test 13: Knowledge Intelligence queries system knowledge & detects gaps (Section 17, 18)', () => {
    const item = knowledgeService.querySystemKnowledge('simmaci_auth');
    assert.ok(item);
    assert.ok(item?.expertAgents.some((a) => a.includes('Farhan')));
    assert.ok(item?.keyArchitecturalDecisions.some((d) => d.includes('Redis Distributed Blacklist')));
    assert.ok(item?.hotFiles.some((f) => f.includes('auth.service.ts')));

    const gaps = knowledgeService.getKnowledgeGaps();
    assert.ok(gaps.length > 0);
    assert.ok(gaps[0].actionProposed.includes('Research Objective'));
  });

  test('Test 14: Organizational Memory Promotion stores durable items with provenance (Section 19)', () => {
    const newMemory = lessonsService.promoteToMemory({
      category: 'VALIDATED_SOLUTION',
      title: 'Next.js SSR Cache Pre-Warming Strategy',
      summary: 'Pre-warming cache for /dashboard route eliminates 800ms TTFB latency.',
      content: 'Scheduled warm-up worker executes every 10 minutes against authenticated session cookies.',
      provenance: 'Performance Optimization Sprint #12',
      source: 'apps/web/server/cache.ts',
      confidence: 0.96,
      scope: 'PROJECT_SPECIFIC',
      projectId: 'prj_01J9X8SIMMACI',
      visibility: 'INTERNAL',
    });

    assert.ok(newMemory.id.startsWith('mem_'));
    assert.strictEqual(newMemory.confidence, 0.96);
    assert.strictEqual(newMemory.scope, 'PROJECT_SPECIFIC');
  });

  test('Test 15: Lessons-Learned Engine distinguishes facts, observations, hypotheses, recommendations (Section 20)', () => {
    const lessons = lessonsService.getAllLessons();
    assert.ok(lessons.length > 0);

    const pickupLesson = lessons[0];
    assert.strictEqual(pickupLesson.validated, true);
    assert.ok(pickupLesson.distinctions.facts.length > 0, 'Must record facts');
    assert.ok(pickupLesson.distinctions.observations.length > 0, 'Must record observations');
    assert.ok(pickupLesson.distinctions.hypotheses.length > 0, 'Must record hypotheses');
    assert.ok(pickupLesson.distinctions.recommendations.length > 0, 'Must record recommendations');
  });

  test('Test 16: Recurring Work Detection proposes automation candidates (Section 21)', () => {
    const candidates = lessonsService.getAutomationCandidates();
    assert.ok(candidates.length >= 2);

    const backupCand = candidates.find((c) => c.patternName.includes('PostgreSQL & Redis Snapshot'));
    assert.ok(backupCand);
    assert.ok(backupCand?.estimatedEffortHoursSaved >= 3.0);
    assert.strictEqual(backupCand?.status, 'PROPOSED');
  });

  // ==========================================================
  // 7. PORTFOLIO, COST & QUALITY (Sections 22, 23, 24, 25, 26, 27)
  // ==========================================================

  test('Test 17: Portfolio Intelligence detects cross-project resource conflicts (Section 22, 23)', () => {
    const projects = portfolioService.getAllProjects();
    assert.strictEqual(projects.length, 4);

    const conflicts = portfolioService.getCrossProjectConflicts();
    assert.ok(conflicts.length > 0);
    assert.strictEqual(conflicts[0].agentName, 'Rian (Software Engineer)');
    assert.strictEqual(conflicts[0].overallocationPercentage, 110);
    assert.ok(conflicts[0].recommendedSequence.includes('SIMMACI (Prioritas 1)'));
  });

  test('Test 18: Cost & Quality Intelligence tracks metrics and feedback loops (Section 24, 25)', () => {
    const cost = portfolioService.getCostIntelligence();
    assert.ok(cost.totalCostUsd > 0);
    assert.strictEqual(cost.costPerSuccessfulTaskUsd, 0.11);
    assert.ok(cost.costByProject['SIMMACI'] > 0);

    const quality = portfolioService.getQualityIntelligence();
    assert.strictEqual(quality.testPassRate, 98.8);
    assert.strictEqual(quality.rollbackCount, 0);
    assert.strictEqual(quality.securityCheckPassRate, 100);
  });

  test('Test 19: Autonomy Maturity & Task Classification enforces appropriate governance (Section 26, 27)', () => {
    const maturity = portfolioService.getAutonomyMaturity();
    assert.ok(maturity.automaticSuccesses > 100);
    assert.strictEqual(maturity.classificationBreakdown.HUMAN_ONLY.autonomousSuccessRate, 0);

    const dropTask = portfolioService.classifyTask({
      title: 'DROP DATABASE production_simmaci CASCADE',
      affectsProduction: true,
    });
    assert.strictEqual(dropTask, 'HUMAN_ONLY');

    const backupTask = portfolioService.classifyTask({
      title: 'Verify daily backup snapshot checksum',
      isRepetitive: true,
    });
    assert.strictEqual(backupTask, 'LOW_RISK_REPETITIVE');
  });

  // ==========================================================
  // 8. RECOMMENDATIONS, DECISION SUPPORT & GOVERNANCE (Sections 28, 29, 30, 36)
  // ==========================================================

  test('Test 20: Proactive Recommendations contain observation, evidence, confidence, and governance (Section 29, 30)', () => {
    const recs = recommendationDecision.getAllRecommendations();
    assert.ok(recs.length >= 3);

    for (const r of recs) {
      assert.ok(r.observationId);
      assert.ok(r.evidence.length > 0);
      assert.ok(r.confidence > 0.8 && r.confidence <= 1.0);
      assert.ok(r.governanceRequirement);
      assert.strictEqual(r.status, 'PROPOSED');
    }

    const auditTrail = recommendationDecision.getDecisionAuditTrail();
    assert.strictEqual(auditTrail.length, recs.length);
  });

  test('Test 21: Decision Support Engine answers key executive queries (Section 28)', () => {
    const ans1 = recommendationDecision.answerDecisionSupportQuery('Apa yang paling menghambat delivery saat ini?');
    assert.ok(ans1.includes('HAMBATAN DELIVERY UTAMA'));
    assert.ok(ans1.includes('QA_CAPACITY'));

    const ans2 = recommendationDecision.answerDecisionSupportQuery('Siapa yang overloaded?');
    assert.ok(ans2.includes('AGENT DENGAN BEBAN TINGGI'));
    assert.ok(ans2.includes('Farhan'));
    assert.ok(ans2.includes('Nadia'));

    const ans3 = recommendationDecision.answerDecisionSupportQuery('Berapa cost untuk pekerjaan minggu ini?');
    assert.ok(ans3.includes('INTELLIGENCE BIAYA OPERASIONAL'));
    assert.ok(ans3.includes('SIMMACI'));

    const ans4 = recommendationDecision.answerDecisionSupportQuery('Objective mana yang tertinggal?');
    assert.ok(ans4.includes('STATUS OBJECTIVES'));
  });

  // ==========================================================
  // 9. TELEGRAM INTEGRATION & FINAL TARGET (Sections 32, 48)
  // ==========================================================

  test('Test 22: Telegram Organizational Briefing matches Section 48 Operational Target (Section 48)', () => {
    const briefing = recommendationDecision.generateOrganizationalBriefing();
    const formatted = TelegramFormatter.formatOrganizationalBriefing(briefing);

    assert.ok(formatted.includes('🏢 *KDI Organizational Briefing*'));
    assert.ok(formatted.includes('Delivery:'));
    assert.ok(formatted.includes('14 task selesai'));
    assert.ok(formatted.includes('Capacity:'));
    assert.ok(formatted.includes('Engineering mendekati batas kapasitas'));
    assert.ok(formatted.includes('Bottleneck:'));
    assert.ok(formatted.includes('Objective:'));
    assert.ok(formatted.includes('SIMMACI'));
    assert.ok(formatted.includes('Risk:'));
    assert.ok(formatted.includes('Knowledge:'));
    assert.ok(formatted.includes('Recommendation:'));
  });

  // ==========================================================
  // 10. OFFICE UI & REPORTING (Sections 31, 33)
  // ==========================================================

  test('Test 23: Office UI Capacity Projection maps workload state and overload flags (Section 33)', () => {
    const workloads = capacityEngine.getAllAgentWorkloads();
    assert.strictEqual(workloads.length, 9);

    const farhan = capacityEngine.getAgentWorkload('AGT-ENG-001')!;
    assert.strictEqual(farhan.agentName, 'Farhan');
    assert.strictEqual(farhan.isOverloaded, true);
    assert.ok(farhan.utilizationPercent >= 85);

    const tari = capacityEngine.getAgentWorkload('AGT-DOC-001')!;
    assert.strictEqual(tari.agentName, 'Tari');
    assert.strictEqual(tari.isUnderutilized, true);
    assert.ok(tari.utilizationPercent <= 20);
  });

  test('Test 24: Structured Reporting generates Daily, Weekly, and Monthly Reports (Section 31)', () => {
    const daily = reportingService.generateDailyReport();
    assert.strictEqual(daily.reportType, 'DAILY');
    assert.ok(daily.content.includes('LAPORAN OPERASIONAL HARIAN'));

    const weekly = reportingService.generateWeeklyReport();
    assert.strictEqual(weekly.reportType, 'WEEKLY');
    assert.ok(weekly.content.includes('LAPORAN STRATEGIS & OPERASIONAL MINGGUAN'));
    assert.ok(weekly.content.includes('Quality Intelligence'));
    assert.ok(weekly.content.includes('Lessons Learned'));

    const monthly = reportingService.generateMonthlyReport();
    assert.strictEqual(monthly.reportType, 'MONTHLY');
    assert.ok(monthly.content.includes('LAPORAN EKSEKUTIF BULANAN'));
    assert.ok(monthly.content.includes('Autonomy Maturity'));
  });

  // ==========================================================
  // 11. ADVERSARIAL TESTING & SECURITY (Sections 35, 42)
  // ==========================================================

  test('Test 25: Adversarial Testing handles partial data, missing telemetry, and uncertainty (Section 42)', () => {
    // Empty task input
    const emptyTask = priorityEngine.evaluateTaskPriority({
      taskId: 'tsk_empty',
      title: '',
    });
    assert.ok(emptyTask.score >= 20, 'Should gracefully score minimal fallback');
    assert.strictEqual(emptyTask.priorityTier, 'LOW');

    // Conflict resolution with empty tasks
    const emptyConflicts = priorityEngine.resolvePriorityConflicts([], 3);
    assert.strictEqual(emptyConflicts.highPriorityTasksCount, 0);
    assert.strictEqual(emptyConflicts.recommendedSequence.length, 0);
  });

  test('Test 26: Security & Secret Sanitization protects credentials in reports (Section 35)', () => {
    const textWithSecret =
      'KDI Daily Report: postgresql://admin:SuperSecretPass123@db.kdi.local:5432/kdi_prod with key sk-1234567890abcdef1234567890';
    const sanitized = TelegramFormatter.formatWeeklyReport(textWithSecret);

    assert.ok(!sanitized.includes('SuperSecretPass123'), 'Password must be redacted');
    assert.ok(!sanitized.includes('sk-1234567890abcdef1234567890'), 'API key must be redacted');
    assert.ok(sanitized.includes('[REDACTED_PASSWORD]'));
    assert.ok(sanitized.includes('[REDACTED_API_KEY]'));
  });
});
