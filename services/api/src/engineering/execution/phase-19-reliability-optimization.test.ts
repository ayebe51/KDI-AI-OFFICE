// ==========================================================
// services/api/src/engineering/execution/phase-19-reliability-optimization.test.ts
// Phase 19: AI Engineering Reliability Optimization Test Suite (§47–§50)
// ==========================================================

import * as test from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import {
  TestReliabilityEngine,
  AntigravityOptimizerService,
  AmbiguityResolverService,
  DevOpsPreflightService,
  SelfRepairCoordinatorService,
  PHASE_19_BENCHMARK_TASKS,
  Phase19ComparisonGenerator,
} from '../reliability/index.js';
import { EngineeringBenchmarkService } from '../manager/engineering-benchmark.service.js';
import { EngineeringManagerService } from '../manager/engineering-manager.service.js';
import { OrchestratorService } from '../../telegram/orchestrator/orchestrator.service.js';
import { TelegramRepository } from '../../telegram/persistence/telegram.repository.js';
import { EngineeringService } from '../engineering.service.js';
import type { OwnerMessage } from '@kdi/types';

test.describe('PHASE 19: AI Engineering Reliability Optimization Suite', async () => {
  const rootDir = process.cwd();
  let wsRoot = path.resolve(rootDir);
  while (wsRoot !== path.dirname(wsRoot)) {
    if (fs.existsSync(path.join(wsRoot, 'fixtures', 'demo-calc-repo'))) {
      break;
    }
    wsRoot = path.dirname(wsRoot);
  }
  const demoRepo = path.resolve(wsRoot, 'fixtures/demo-calc-repo');
  const benchmarkRepo = path.resolve(wsRoot, 'fixtures/benchmark-repo');

  // ==========================================================
  // 1. TEST RELIABILITY, FLAKE DETECTION & PRE-DISCOVERY (§6–§11)
  // ==========================================================
  await test.it('Test Reliability: Detects flaky non-deterministic tests and isolates test environment (§6–§11)', async () => {
    const engine = new TestReliabilityEngine();

    // 1. Pre-execution test discovery (§11)
    const plan = engine.discoverTargetedTestPlan(benchmarkRepo, ['auth', 'login']);
    assert.ok(plan.testCommand.includes('node') || plan.testCommand.includes('npm'));
    assert.strictEqual(plan.testFramework, 'node:test');
    assert.ok(plan.matchedTestFiles.length >= 1, 'Must discover at least one test file');
    assert.ok(plan.isolatedEnv.NODE_ENV === 'test');
    assert.ok(plan.isolatedEnv.PORT);

    // 2. Deterministic environment isolation (§10)
    const env = engine.createIsolatedEnv(50000);
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(env.CI, 'true');
    assert.strictEqual(env.KDI_ISOLATED_TEST, 'true');

    // 3. Flake detection (§9): Simulating inconsistent test outcomes
    let counter = 0;
    const flakyRunner = async () => {
      counter++;
      // Run 1: pass, Run 2: fail (flaky!)
      return { passed: counter % 2 === 1, output: counter % 2 === 1 ? 'OK' : 'Assertion failed' };
    };

    const flakeResult = await engine.detectFlakiness(flakyRunner, 3);
    assert.strictEqual(flakeResult.isFlaky, true);
    assert.strictEqual(flakeResult.totalRuns, 3);
    assert.match(flakeResult.diagnostics, /FLAKY_TEST/);

    // 4. Deterministic pass runner
    const stableRunner = async () => ({ passed: true, output: '100% PASS' });
    const stableResult = await engine.detectFlakiness(stableRunner, 3);
    assert.strictEqual(stableResult.isFlaky, false);
    assert.strictEqual(stableResult.passedRuns, 3);
    assert.match(stableResult.diagnostics, /DETERMINISTIC_PASS/);

    // 5. Test assertion hardening auditor (§8)
    const weakCode = `
      test('test something', () => {
        const res = doAction();
        expect(res).toBeDefined();
        assert.ok(res);
      });
    `;
    const hardenedCode = `
      test('test something', () => {
        const res = doAction();
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(res.user, { id: 'u_1', name: 'Farhan' });
      });
    `;

    const weakAudit = engine.auditAssertionQuality('test/sample.test.js', weakCode);
    assert.strictEqual(weakAudit.weakAssertions, 2);
    assert.strictEqual(weakAudit.isHardened, false);

    const hardenedAudit = engine.auditAssertionQuality('test/sample.test.js', hardenedCode);
    assert.strictEqual(hardenedAudit.weakAssertions, 0);
    assert.strictEqual(hardenedAudit.hardenedAssertions, 2);
    assert.strictEqual(hardenedAudit.isHardened, true);
  });

  // ==========================================================
  // 2. ANTIGRAVITY EXECUTION OPTIMIZATION & PROGRESSIVE SCAN (§12–§16)
  // ==========================================================
  await test.it('Antigravity Optimizer: Progressive inspection, context filtering & budget limits (§12–§16)', () => {
    const optimizer = new AntigravityOptimizerService();

    // 1. Progressive inspection within budget (§14 & §15)
    const result = optimizer.inspectProgressively(benchmarkRepo, ['auth', 'service'], {
      maxFilesScanned: 50,
      maxDurationMs: 5000,
    });

    assert.ok(result.levelReached >= 2, 'Should reach Level 2 or higher');
    assert.strictEqual(result.budgetStatus, 'WITHIN_BUDGET');
    assert.strictEqual(result.budgetExceeded, false);
    assert.ok(result.filesScanned > 0);
    assert.ok(result.relevantFiles.length > 0);
    // Verify ignored directories were skipped (§13)
    assert.ok(!result.relevantFiles.some((f) => f.includes('node_modules')));
    assert.ok(!result.relevantFiles.some((f) => f.includes('.git')));

    // 2. Budget limits enforcement (§14)
    const constrainedResult = optimizer.inspectProgressively(benchmarkRepo, [], {
      maxFilesScanned: 2, // Very low budget
      maxDurationMs: 5000,
    });
    assert.strictEqual(constrainedResult.budgetStatus, 'INSPECTION_LIMIT_REACHED');
    assert.strictEqual(constrainedResult.budgetExceeded, true);

    // 3. Stage duration tracking (§16)
    const stageMetrics = optimizer.trackStageDurations({
      discoveryMs: 200,
      startupMs: 250,
      inspectionMs: 400,
      codingMs: 1500,
      testMs: 1000,
      reviewMs: 350,
    });
    assert.strictEqual(stageMetrics.totalMs, 3700);
    assert.strictEqual(stageMetrics.inspectionMs, 400);
  });

  // ==========================================================
  // 3. AMBIGUITY CLASSIFICATION & ACTIONABLE CLARIFICATION (§17–§21)
  // ==========================================================
  await test.it('Ambiguity Resolver: Auto-infers technical ambiguity and formats actionable A/B questions (§17–§21)', () => {
    const resolver = new AmbiguityResolverService();

    // 1. Unambiguous task
    const clearResult = resolver.analyzeAmbiguity(
      'Fix student token expiry check in auth.service.js',
      ['Expired tokens return null', 'Active tokens validate']
    );
    assert.strictEqual(clearResult.isAmbiguous, false);
    assert.strictEqual(clearResult.canAutoInfer, true);

    // 2. Technical ambiguity with project clues -> auto-infer without human (§17 & §20)
    const techResult = resolver.analyzeAmbiguity(
      'Update token verification with optional sliding expiration atau TTL refresh',
      ['Token expiry handling'],
      {
        framework: 'Express',
        knownConstraints: ['Maintain backward compatibility for student token validation'],
      }
    );
    assert.strictEqual(techResult.category, 'TECHNICAL');
    assert.strictEqual(techResult.isAmbiguous, true);
    assert.strictEqual(techResult.canAutoInfer, true); // Auto-inferred!
    assert.match(techResult.inferredInterpretation || '', /Maintain backward compatibility/);

    // 3. Business ambiguity -> conservative, formats actionable A/B question (§18)
    const businessResult = resolver.analyzeAmbiguity(
      'Implement new subscription pricing tiers or maybe optional grandfathered billing rates',
      ['Billing calculations']
    );
    assert.strictEqual(businessResult.category, 'BUSINESS');
    assert.strictEqual(businessResult.isAmbiguous, true);
    assert.strictEqual(businessResult.canAutoInfer, false); // Needs human clarification!
    assert.ok(businessResult.clarificationPrompt);
    assert.match(businessResult.clarificationPrompt, /KLARIFIKASI DIBUTUHKAN/);
    assert.match(businessResult.clarificationPrompt, /Opsi A/i);
    assert.match(businessResult.clarificationPrompt, /Opsi B/i);
  });

  // ==========================================================
  // 4. DEVOPS PRE-FLIGHT VALIDATION & SAFE DRY-RUN (§22–§26)
  // ==========================================================
  await test.it('DevOps Pre-Flight: Validates runtime capabilities and runs safe dry-run plan mode (§22–§26)', async () => {
    const preflight = new DevOpsPreflightService();

    // 1. Valid environment check (§23)
    const validCheck = await preflight.validateEnvironment(benchmarkRepo, {
      requireNode: true,
      requireGit: true,
      requireNpm: true,
      requireDocker: false,
    });
    assert.strictEqual(validCheck.ready, true);
    assert.strictEqual(validCheck.status, 'READY');
    assert.strictEqual(validCheck.missingPrerequisites.length, 0);

    // 2. Missing repository environment error (§26)
    const missingCheck = await preflight.validateEnvironment('Z:\\non_existent_drive\\repo', {
      requireNode: true,
    });
    assert.strictEqual(missingCheck.ready, false);
    assert.strictEqual(missingCheck.status, 'ENVIRONMENT_FAILURE');
    assert.ok(missingCheck.missingPrerequisites.some((m) => m.includes('Repository path not found')));

    // 3. Safe dry-run mode for non-destructive operation (§25)
    const safePlan = preflight.generateExecutionPlan('npm run build', ['dist/bundle.js']);
    assert.strictEqual(safePlan.status, 'PLAN_VERIFIED');
    assert.strictEqual(safePlan.isDestructive, false);
    assert.strictEqual(safePlan.requiresApproval, false);

    // 4. Safe dry-run mode for destructive operation (§25)
    const destructivePlan = preflight.generateExecutionPlan('rm -rf node_modules && drop database test', ['production_db']);
    assert.strictEqual(destructivePlan.isDestructive, true);
    assert.strictEqual(destructivePlan.requiresApproval, true); // Halts at cryptographic gate!
  });

  // ==========================================================
  // 5. SELF-REPAIR IMPROVEMENT & SCOPE DISCIPLINE (§27–§31)
  // ==========================================================
  await test.it('Self-Repair & Scope Discipline: Enriches repair context, stores failure memory and detects scope drift (§27–§31)', () => {
    const repair = new SelfRepairCoordinatorService();
    const taskId = 'KDI-P19-01';

    // 1. Record failure memory (§28)
    repair.recordFailureMemory({
      taskId,
      attemptNumber: 1,
      failedHypothesis: 'Attempted to use fs.readdirSync without ignoring node_modules',
      rejectedApproach: 'Exhaustive unbudgeted directory scan',
      errorSnippet: 'Timeout exceeded 10000ms',
      failingTests: ['test/discovery.test.js'],
    });

    const memories = repair.getFailureMemories(taskId);
    assert.strictEqual(memories.length, 1);
    assert.strictEqual(memories[0].failedHypothesis, 'Attempted to use fs.readdirSync without ignoring node_modules');

    // 2. Prepare enriched repair payload for attempt 2 (§27)
    const rawError = `
      Error: Timeout in discovery
      at Object.scanDirectory (/src/scanner.ts:45)
      AssertionError [ERR_ASSERTION]: Expected inspection under 2000ms
    `;
    const payload = repair.prepareRepairPayload(taskId, 2, rawError, ['src/scanner.ts']);
    assert.strictEqual(payload.attemptNumber, 2);
    assert.ok(payload.avoidApproaches.includes('Exhaustive unbudgeted directory scan'));
    assert.strictEqual(payload.stopConditionTriggered, false);

    // 3. Stop condition triggered on fatal credentials error (§29)
    const fatalError = 'Error: 401 Unauthorized - credentials missing for cloud provider';
    const fatalPayload = repair.prepareRepairPayload(taskId, 2, fatalError);
    assert.strictEqual(fatalPayload.stopConditionTriggered, true);
    assert.match(fatalPayload.stopReason || '', /credentials/i);

    // 4. Scope discipline audit (§30)
    // Clean scope
    const cleanScope = repair.auditScopeDiscipline(
      ['src/scanner.ts', 'test/scanner.test.ts'],
      ['src/scanner.ts', 'test/scanner.test.ts']
    );
    assert.strictEqual(cleanScope.scopeDriftDetected, false);
    assert.strictEqual(cleanScope.requiresReview, false);

    // Scope expansion / drift (> 100% or unexpected files)
    const driftScope = repair.auditScopeDiscipline(
      ['src/scanner.ts'],
      ['src/scanner.ts', 'src/auth.ts', 'src/database.ts', 'config/prod.env']
    );
    assert.strictEqual(driftScope.scopeDriftDetected, true);
    assert.strictEqual(driftScope.requiresReview, true);
    assert.ok(driftScope.unexpectedFiles.includes('src/auth.ts'));
    assert.ok(driftScope.unexpectedFiles.includes('config/prod.env'));
  });

  // ==========================================================
  // 6. PHASE 19 BENCHMARK RE-RUN & COMPARISON REPORT (§34–§45, §51, §52)
  // ==========================================================
  await test.it('Phase 19 Benchmark: Evaluates new 20-task catalog & calculates deltas against Phase 18 (§34–§45, §51, §52)', () => {
    const benchmark = new EngineeringBenchmarkService();
    const tasks = PHASE_19_BENCHMARK_TASKS;
    assert.strictEqual(tasks.length, 20, 'Phase 19 must evaluate 20 eligible tasks');

    // Simulate improved Phase 19 results:
    // - 18 tasks autonomous (A3: 15 tasks, A4 with security approval: 3 tasks)
    // - 1 task required manual intervention (A2: 1 task)
    // - 1 task failed (DevOps timeout)
    // -> Autonomy Rate: 18 / 20 = 90% (vs Phase 18 baseline of 75%)
    // -> Success Rate: 19 / 20 = 95% (vs Phase 18 baseline of 90%)
    // -> False Success: 0% (vs Phase 18 baseline of 5%)
    // -> Intervention: 1 / 20 = 5% (vs Phase 18 baseline of 15%)
    tasks.forEach((taskDef, index) => {
      if (index === 19) {
        // Task 19 fails
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: false,
          testsPassed: false,
          acceptanceCriteriaPassed: false,
          scopeValid: true,
          reviewPassed: false,
          attemptsCount: 2,
          timeBreakdown: { executionMs: 250000, queueWaitMs: 8000, repairMs: 30000, reviewMs: 0, approvalWaitMs: 0 },
          failureCategory: 'ENVIRONMENT_FAILURE',
          failureRootCause: 'External build tool not installed in test runner environment',
        });
        benchmark.recordPhase18Task(rec);
      } else if (index === 10) {
        // Task 10 succeeds with minor manual assistance (A2)
        const intervention: any = {
          type: 'MANUAL_CLARIFICATION',
          reason: 'AMBIGUOUS_REQUIREMENT',
          durationMs: 5 * 60 * 1000, // 5 min
          notes: 'Clarified quiz dialog styling',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        };
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: true,
          testsPassed: true,
          acceptanceCriteriaPassed: true,
          scopeValid: true,
          reviewPassed: true,
          attemptsCount: 2,
          interventions: [intervention],
          timeBreakdown: { executionMs: 160000, queueWaitMs: 5000, repairMs: 20000, reviewMs: 10000, approvalWaitMs: 0 },
        });
        benchmark.recordPhase18Task(rec);
      } else if (taskDef.category === 'SECURITY') {
        // Security tasks: A4 (Mandatory policy approval, zero manual intervention)
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: true,
          testsPassed: true,
          acceptanceCriteriaPassed: true,
          scopeValid: true,
          reviewPassed: true,
          requiredApprovalEvaluated: true,
          requiredApprovalGranted: true,
          approvalWaitMs: 1500,
          attemptsCount: 1,
          timeBreakdown: { executionMs: 140000, queueWaitMs: 4000, repairMs: 0, reviewMs: 15000, approvalWaitMs: 1500 },
        });
        benchmark.recordPhase18Task(rec);
      } else {
        // Remaining tasks: A3 (Fully autonomous)
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: true,
          testsPassed: true,
          acceptanceCriteriaPassed: true,
          scopeValid: true,
          reviewPassed: true,
          attemptsCount: 1,
          timeBreakdown: { executionMs: 120000, queueWaitMs: 3000, repairMs: 0, reviewMs: 10000, approvalWaitMs: 0 },
        });
        benchmark.recordPhase18Task(rec);
      }
    });

    const phase19Report = benchmark.getPhase18SummaryReport(7);

    // Create synthetic Phase 18 baseline report for deterministic comparison
    const phase18BaselineReport = {
      ...phase19Report,
      overview: {
        ...phase19Report.overview,
        eligibleTasks: 20,
        completedEligibleTasks: 18,
        failedEligibleTasks: 2,
        autonomousTasksCount: 15,
        autonomyRate: 75,
        successRate: 90,
        failureRate: 10,
        humanInterventionRate: 15,
        falseSuccessCount: 1,
        falseSuccessRate: 5,
        recoverySuccessRate: 100,
        averageAttemptsPerTask: 1.3,
        averageExecutionMinutes: 3.2,
        estimatedHumanTimeSavedMinutes: 1770,
      },
    };

    // Calculate comparative deltas (§35)
    const comparison = Phase19ComparisonGenerator.calculateComparison(
      phase18BaselineReport as any,
      phase19Report
    );

    assert.strictEqual(comparison.baselinePhase18.autonomyRate, 75);
    assert.strictEqual(comparison.resultPhase19.autonomyRate, 90);
    assert.strictEqual(comparison.deltas.autonomyDelta, 15, 'Autonomy increased by +15%');
    assert.strictEqual(comparison.deltas.successDelta, 5, 'Success increased by +5%');
    assert.strictEqual(comparison.deltas.interventionDelta, -10, 'Intervention dropped by -10%');
    assert.strictEqual(comparison.deltas.falseSuccessDelta, -5, 'False success dropped by -5%');
    assert.strictEqual(comparison.finalStatus, 'PASSED');

    // Generate formatted report text matching §52 exactly
    const reportText = Phase19ComparisonGenerator.generateReportText(comparison);
    assert.match(reportText, /^PHASE 19 — RELIABILITY OPTIMIZATION REPORT/m);
    assert.match(reportText, /Phase 18 Baseline:/);
    assert.match(reportText, /Phase 19 Result:/);
    assert.match(reportText, /Autonomy:\s+90%\s+\(\+15% vs Phase 18\)/);
    assert.match(reportText, /Success:\s+95%\s+\(\+5% vs Phase 18\)/);
    assert.match(reportText, /Top Previous Bottleneck:/);
    assert.match(reportText, /Root Cause:/);
    assert.match(reportText, /Fix:/);
    assert.match(reportText, /Remaining Bottleneck:/);
    assert.match(reportText, /Role Improvement:/);
    assert.match(reportText, /Project Improvement:/);
    assert.match(reportText, /Difficulty Improvement:/);
    assert.match(reportText, /Regression:\s+ZERO REGRESSIONS/);
    assert.match(reportText, /Final Status:\s+PASSED/);
  });

  // ==========================================================
  // 7. TELEGRAM ORCHESTRATOR & MANAGER FACADE INTEGRATION (§50)
  // ==========================================================
  await test.it('Telegram Orchestrator: Dispatches Phase 19 reliability report via slash command and NL query (§50)', async () => {
    const telegramRepo = new TelegramRepository();
    const benchmark = new EngineeringBenchmarkService();
    const engineeringManager = new EngineeringManagerService(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      benchmark
    );

    const engineeringService = new EngineeringService(
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      engineeringManager
    );

    const orchestrator = new OrchestratorService(
      telegramRepo,
      undefined,
      undefined,
      undefined,
      engineeringService
    );

    // Populate sample benchmark tasks
    const tasks = PHASE_19_BENCHMARK_TASKS.slice(0, 20);
    for (const t of tasks) {
      const rec = benchmark.evaluateOutcome({
        taskDef: t,
        agentReportedSuccess: true,
        testsPassed: true,
        acceptanceCriteriaPassed: true,
        scopeValid: true,
        reviewPassed: true,
      });
      benchmark.recordPhase18Task(rec);
    }

    const createMsg = (text: string): OwnerMessage => ({
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: 'conv_phase19_test',
      channel: 'telegram',
      senderId: '123456789',
      senderFirstName: 'Ayub',
      text,
      timestamp: new Date().toISOString(),
    });

    // 1. Slash command: /engineering reliability
    const resCmd = await orchestrator.handleOwnerMessage(
      createMsg('/engineering reliability'),
      'corr_rel_1'
    );
    assert.strictEqual(resCmd.type, 'SYSTEM_STATE');
    assert.match(resCmd.responseMessage, /PHASE 19 — RELIABILITY OPTIMIZATION REPORT/);
    assert.match(resCmd.responseMessage, /Final Status:\s+PASSED/);

    // 2. Natural language query: "Bagaimana optimasi reliability engineering?"
    const resNL = await orchestrator.handleOwnerMessage(
      createMsg('Bagaimana optimasi reliability engineering?'),
      'corr_rel_2'
    );
    assert.match(resNL.responseMessage, /PHASE 19 — RELIABILITY OPTIMIZATION REPORT/);
  });
});
