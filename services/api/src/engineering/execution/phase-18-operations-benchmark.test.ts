// ==========================================================
// services/api/src/engineering/execution/phase-18-operations-benchmark.test.ts
// Phase 18: Real-World AI Engineering Operations Benchmark Test Suite
// ==========================================================

import * as test from 'node:test';
import * as assert from 'node:assert';
import { EngineeringBenchmarkService } from '../manager/engineering-benchmark.service.js';
import { Phase18BenchmarkReportGenerator } from '../manager/benchmark-report.generator.js';
import { PHASE_18_BENCHMARK_TASKS } from '../manager/benchmark-catalog.data.js';
import { EngineeringManagerService } from '../manager/engineering-manager.service.js';
import { OrchestratorService } from '../../telegram/orchestrator/orchestrator.service.js';
import { TelegramRepository } from '../../telegram/persistence/telegram.repository.js';
import { EngineeringService } from '../engineering.service.js';
import type {
  BenchmarkTaskDefinition,
  Phase18BenchmarkTaskRecord,
} from '../manager/benchmark.types.js';
import type { OwnerMessage } from '@kdi/types';

test.describe('PHASE 18: Real-World AI Engineering Operations Benchmark Suite', async () => {
  // ==========================================================
  // 1. DATA RIGOR & ELIGIBILITY SEPARATION (§3–§7, §31, §49)
  // ==========================================================
  await test.it('Data: Evaluates catalog of at least 20 eligible tasks with multi-project & multi-role diversity (§3–§7, §31, §49)', () => {
    const catalog = PHASE_18_BENCHMARK_TASKS;

    // Verify at least 20 eligible tasks
    const eligibleTasks = catalog.filter((t) => t.eligibility === 'ELIGIBLE');
    assert.ok(eligibleTasks.length >= 20, `Expected at least 20 eligible tasks, got ${eligibleTasks.length}`);

    // Verify non-eligible control tasks are documented (§7 & §33)
    const nonEligibleTasks = catalog.filter((t) => t.eligibility === 'NON_ELIGIBLE');
    assert.ok(nonEligibleTasks.length >= 4, 'Expected at least 4 non-eligible control tasks');
    for (const ne of nonEligibleTasks) {
      assert.ok(ne.ineligibilityReason, `Non-eligible task ${ne.taskId} must record ineligibilityReason`);
    }

    // Verify Project coverage (§3 & §20): SIMMACI, ILMORA, KDI AI OFFICE
    const projects = new Set(eligibleTasks.map((t) => t.projectSlug));
    assert.ok(projects.has('simmaci'), 'Must include SIMMACI');
    assert.ok(projects.has('ilmora'), 'Must include ILMORA');
    assert.ok(projects.has('kdi'), 'Must include KDI AI Office');

    // Verify Role coverage (§21): BE, FE, QA, Security, DevOps
    const roles = new Set(eligibleTasks.map((t) => t.role));
    assert.ok(roles.has('BACKEND'), 'Must include BACKEND role');
    assert.ok(roles.has('FRONTEND'), 'Must include FRONTEND role');
    assert.ok(roles.has('QA'), 'Must include QA role');
    assert.ok(roles.has('SECURITY'), 'Must include SECURITY role');
    assert.ok(roles.has('DEVOPS'), 'Must include DEVOPS role');

    // Verify Difficulty coverage & stored rationale (§6 & §22)
    const difficulties = new Set(eligibleTasks.map((t) => t.difficulty));
    assert.ok(difficulties.has('EASY'), 'Must include EASY');
    assert.ok(difficulties.has('MEDIUM'), 'Must include MEDIUM');
    assert.ok(difficulties.has('HARD'), 'Must include HARD');
    for (const t of eligibleTasks) {
      assert.ok(t.difficultyRationale && t.difficultyRationale.length > 10, `Task ${t.taskId} missing difficultyRationale`);
      assert.ok(t.baselineHumanMinutes > 0, `Task ${t.taskId} missing baselineHumanMinutes`);
      assert.ok(t.baselineSource, `Task ${t.taskId} missing baselineSource`);
      assert.ok(t.isBenchmarkLabel, `Task ${t.taskId} must be labeled BENCHMARK_TASK`);
    }
  });

  // ==========================================================
  // 2. HUMAN INTERVENTION TIMER (§9 & §37)
  // ==========================================================
  await test.it('Intervention Timer: Accurately tracks start/stop intervention duration and reason (§9, §37)', async () => {
    const benchmark = new EngineeringBenchmarkService();
    const taskId = 'SIMMACI-BM-01';

    // 1. Start timer when intervention requested
    benchmark.startInterventionTimer(
      taskId,
      'MANUAL_CLARIFICATION',
      'AMBIGUOUS_REQUIREMENT'
    );

    const activeTimer = benchmark.getActiveIntervention(taskId);
    assert.ok(activeTimer, 'Active intervention timer should exist');
    assert.strictEqual(activeTimer.taskId, taskId);
    assert.strictEqual(activeTimer.type, 'MANUAL_CLARIFICATION');
    assert.strictEqual(activeTimer.reason, 'AMBIGUOUS_REQUIREMENT');

    // Wait a brief tick (e.g. 15ms)
    await new Promise((resolve) => setTimeout(resolve, 15));

    // 2. Stop timer when intervention completed
    const record = benchmark.stopInterventionTimer(taskId, 'Ayub clarified token expiry TTL parameter');
    assert.ok(record, 'Stopped intervention record must be returned');
    assert.strictEqual(record.type, 'MANUAL_CLARIFICATION');
    assert.strictEqual(record.reason, 'AMBIGUOUS_REQUIREMENT');
    assert.ok(record.durationMs >= 10, 'Duration should be at least 10ms');
    assert.ok(record.startedAt);
    assert.ok(record.endedAt);
    assert.strictEqual(record.notes, 'Ayub clarified token expiry TTL parameter');

    // Active timer is cleared
    assert.strictEqual(benchmark.getActiveIntervention(taskId), undefined);

    // Observation log contains start and end events (§36)
    const logs = benchmark.getObservationLogs(taskId);
    const requestedLog = logs.find((l) => l.event === 'INTERVENTION_REQUESTED');
    const providedLog = logs.find((l) => l.event === 'INTERVENTION_PROVIDED');
    assert.ok(requestedLog, 'Must record INTERVENTION_REQUESTED in observation log');
    assert.ok(providedLog, 'Must record INTERVENTION_PROVIDED in observation log');
  });

  // ==========================================================
  // 3. DETERMINISTIC OUTCOME & FALSE SUCCESS TRACKING (§13 & §14)
  // ==========================================================
  await test.it('Quality & False Success: Flags falseSuccess when agent claims done but tests or criteria fail (§13, §14)', () => {
    const benchmark = new EngineeringBenchmarkService();
    const taskDef = PHASE_18_BENCHMARK_TASKS.find((t) => t.taskId === 'SIMMACI-BM-01')!;

    // Case A: Agent claimed done, but tests failed!
    const falseResultA = benchmark.evaluateOutcome({
      taskDef,
      agentReportedSuccess: true, // Agent hallucinated or claimed success
      testsPassed: false,        // Reality: Unit test assertion failed!
      acceptanceCriteriaPassed: true,
      scopeValid: true,
      reviewPassed: true,
    });

    assert.strictEqual(falseResultA.status, 'FAILED');
    assert.strictEqual(falseResultA.falseSuccess, true, 'Must flag falseSuccess = true');
    assert.match(falseResultA.falseSuccessReason || '', /tests failed/i);
    assert.strictEqual(falseResultA.failureCategory, 'TEST_FAILURE');

    // Case B: Agent claimed done, but modified unauthorized files outside repo scope!
    const falseResultB = benchmark.evaluateOutcome({
      taskDef,
      agentReportedSuccess: true,
      testsPassed: true,
      acceptanceCriteriaPassed: true,
      scopeValid: false,         // Reality: Touched prohibited production files!
      reviewPassed: true,
    });

    assert.strictEqual(falseResultB.status, 'FAILED');
    assert.strictEqual(falseResultB.falseSuccess, true, 'Must flag falseSuccess = true');
    assert.strictEqual(falseResultB.failureCategory, 'EXECUTOR_FAILURE');

    // Case C: Legitimate autonomous success
    const trueSuccess = benchmark.evaluateOutcome({
      taskDef,
      agentReportedSuccess: true,
      testsPassed: true,
      acceptanceCriteriaPassed: true,
      scopeValid: true,
      reviewPassed: true,
    });

    assert.strictEqual(trueSuccess.status, 'COMPLETED');
    assert.strictEqual(trueSuccess.falseSuccess, false);
    assert.strictEqual(trueSuccess.autonomyLevel, 'A3'); // Autonomous without intervention
  });

  // ==========================================================
  // 4. POLICY APPROVAL GATE SEPARATION (§9 & §10)
  // ==========================================================
  await test.it('Autonomy Levels: Mandatory policy approval counts as A4 and does NOT count as human intervention failure (§9, §10)', () => {
    const benchmark = new EngineeringBenchmarkService();
    const securityTask = PHASE_18_BENCHMARK_TASKS.find((t) => t.taskId === 'SIMMACI-BM-06')!; // Security task

    // Task evaluated with required cryptographic approval gate (§9)
    const record = benchmark.evaluateOutcome({
      taskDef: securityTask,
      agentReportedSuccess: true,
      testsPassed: true,
      acceptanceCriteriaPassed: true,
      scopeValid: true,
      reviewPassed: true,
      requiredApprovalEvaluated: true,
      requiredApprovalGranted: true,
      approvalWaitMs: 3500,
      interventions: [], // Zero manual interventions!
    });

    assert.strictEqual(record.status, 'COMPLETED');
    assert.strictEqual(record.requiredPolicyApproval, true);
    assert.strictEqual(record.autonomyLevel, 'A4', 'Must be classified as A4 (AI executes with required approval)');
    assert.strictEqual(record.humanInterventions.length, 0);

    // Record into benchmark
    benchmark.recordPhase18Task(record);

    const summary = benchmark.getPhase18SummaryReport(7);
    assert.strictEqual(summary.overview.autonomousTasksCount, 1, 'A4 task MUST count towards autonomous tasks');
    assert.strictEqual(summary.overview.autonomyRate, 100, 'Autonomy rate must be 100% when only policy approval occurred');
    assert.strictEqual(summary.overview.humanInterventionRate, 0, 'Required policy approval must not inflate human intervention rate');
  });

  // ==========================================================
  // 5. COMPREHENSIVE 20+ TASK EXECUTION BENCHMARK (§11–§29)
  // ==========================================================
  await test.it('Full Benchmark: Processes 20 eligible tasks + 4 non-eligible tasks across 3 projects & generates deterministic metrics (§11–§29)', () => {
    const benchmark = new EngineeringBenchmarkService();
    const eligibleTasks = PHASE_18_BENCHMARK_TASKS.filter((t) => t.eligibility === 'ELIGIBLE');
    assert.strictEqual(eligibleTasks.length, 20);

    // Simulate realistic execution outcomes:
    // - 15 tasks succeed autonomously (A3: 12 tasks, A4 with security approval: 3 tasks)
    // - 3 tasks succeed but required manual intervention (A2: 3 tasks)
    // - 2 tasks fail (1 test assertion failure with falseSuccess detected, 1 environment timeout)
    eligibleTasks.forEach((taskDef, index) => {
      if (index === 18) {
        // Task 18: Fails due to Test Failure with False Success detection (§14)
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: true,
          testsPassed: false,
          acceptanceCriteriaPassed: true,
          scopeValid: true,
          reviewPassed: true,
          attemptsCount: 3,
          timeBreakdown: { executionMs: 240000, queueWaitMs: 12000, repairMs: 60000, reviewMs: 15000, approvalWaitMs: 0 },
        });
        benchmark.recordPhase18Task(rec);
      } else if (index === 19) {
        // Task 19: Fails due to Antigravity timeout / environment error (§15)
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: false,
          testsPassed: false,
          acceptanceCriteriaPassed: false,
          scopeValid: true,
          reviewPassed: false,
          attemptsCount: 2,
          antigravityExecution: { executed: true, success: false, timedOut: true, repairAttempts: 1 },
          timeBreakdown: { executionMs: 300000, queueWaitMs: 15000, repairMs: 40000, reviewMs: 0, approvalWaitMs: 0 },
          failureCategory: 'ANTIGRAVITY_FAILURE',
          failureRootCause: 'Antigravity workspace AST inspection timed out after 5 minutes',
        });
        benchmark.recordPhase18Task(rec);
      } else if (index === 7 || index === 11 || index === 15) {
        // Tasks 7, 11, 15: Succeeded with manual intervention (A2) (§9)
        const intervention: any = {
          type: index === 7 ? 'MANUAL_CLARIFICATION' : (index === 11 ? 'MANUAL_CODE_EDIT' : 'TEST_REPAIR'),
          reason: index === 7 ? 'AMBIGUOUS_REQUIREMENT' : (index === 11 ? 'TECHNICAL_BLOCKER' : 'QUALITY'),
          durationMs: 10 * 60 * 1000, // 10 minutes
          notes: 'Manual assist',
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
          timeBreakdown: { executionMs: 200000, queueWaitMs: 10000, repairMs: 30000, reviewMs: 15000, approvalWaitMs: 0 },
        });
        benchmark.recordPhase18Task(rec);
      } else if (taskDef.category === 'SECURITY') {
        // Security tasks: A4 (Mandatory approval, zero manual intervention)
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: true,
          testsPassed: true,
          acceptanceCriteriaPassed: true,
          scopeValid: true,
          reviewPassed: true,
          requiredApprovalEvaluated: true,
          requiredApprovalGranted: true,
          approvalWaitMs: 2500,
          attemptsCount: 1,
          timeBreakdown: { executionMs: 180000, queueWaitMs: 8000, repairMs: 0, reviewMs: 20000, approvalWaitMs: 2500 },
        });
        benchmark.recordPhase18Task(rec);
      } else {
        // Remaining tasks: A3 (Fully autonomous without manual intervention)
        const recoveryAttempted = index === 2 || index === 8;
        const rec = benchmark.evaluateOutcome({
          taskDef,
          agentReportedSuccess: true,
          testsPassed: true,
          acceptanceCriteriaPassed: true,
          scopeValid: true,
          reviewPassed: true,
          attemptsCount: 1,
          recoveryAttempted,
          recoverySucceeded: recoveryAttempted,
          timeBreakdown: { executionMs: 150000, queueWaitMs: 5000, repairMs: 0, reviewMs: 10000, approvalWaitMs: 0 },
        });
        benchmark.recordPhase18Task(rec);
      }
    });

    // Also record the 4 non-eligible tasks (§7 & §33)
    const nonEligibleTasks = PHASE_18_BENCHMARK_TASKS.filter((t) => t.eligibility === 'NON_ELIGIBLE');
    assert.strictEqual(nonEligibleTasks.length, 4);
    for (const ne of nonEligibleTasks) {
      const rec: Phase18BenchmarkTaskRecord = {
        ...ne,
        status: 'CANCELLED',
        autonomyLevel: 'A0',
        falseSuccess: false,
        testsPassed: false,
        acceptanceCriteriaPassed: false,
        scopeValid: true,
        reviewPassed: false,
        attemptsCount: 0,
        timeBreakdown: { queueWaitMs: 0, executionMs: 0, repairMs: 0, reviewMs: 0, approvalWaitMs: 0, totalCycleMs: 0 },
        humanInterventions: [],
        totalInterventionDurationMs: 0,
        requiredPolicyApproval: false,
        approvalDurationMs: 0,
        assignedAgentId: 'Unassigned',
        firstAssignmentSuccessful: false,
        antigravityExecution: { executed: false, success: false, timedOut: false, repairAttempts: 0 },
        observationLogs: [{ timestamp: new Date().toISOString(), event: 'TASK_RECEIVED', details: `Excluded: ${ne.ineligibilityReason}` }],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      benchmark.recordPhase18Task(rec);
    }

    // Compute deterministic summary report
    const report = benchmark.getPhase18SummaryReport(7);
    const o = report.overview;

    // 1. Data counts
    assert.strictEqual(o.totalTasksRecorded, 24);
    assert.strictEqual(o.eligibleTasks, 20);
    assert.strictEqual(o.nonEligibleTasks, 4);
    assert.strictEqual(o.completedEligibleTasks, 18, '18 of 20 tasks completed');
    assert.strictEqual(o.failedEligibleTasks, 2, '2 of 20 tasks failed');

    // 2. Primary Metric: Autonomy Rate (§11)
    // 15 autonomous (A3 + A4) out of 20 eligible = 75%
    assert.strictEqual(o.autonomousTasksCount, 15);
    assert.strictEqual(o.autonomyRate, 75);

    // 3. Secondary Metrics (§12)
    assert.strictEqual(o.successRate, 90); // 18 / 20 = 90%
    assert.strictEqual(o.failureRate, 10); // 2 / 20 = 10%
    assert.strictEqual(o.humanInterventionRate, 15); // 3 of 20 had manual intervention = 15%
    assert.strictEqual(o.falseSuccessCount, 1); // 1 false success detected
    assert.strictEqual(o.falseSuccessRate, 5);  // 1 / 20 = 5%
    assert.strictEqual(o.recoverySuccessRate, 100); // 2 of 2 resumed successfully
    assert.ok(o.averageExecutionMinutes > 0);
    assert.ok(o.averageAttemptsPerTask >= 1);

    // 4. Strategic Metric: Human Coordination Load & Time Saved (§18 & §45)
    assert.ok(o.estimatedHumanTimeSavedMinutes > 1000, 'Substantial human minutes saved');
    assert.ok(o.humanCoordinationLoadMinutes >= 30, 'Coordination load tracks minutes + events');

    // 5. Project Breakdown (§20)
    assert.strictEqual(report.projectBreakdown.length, 3);
    const simmaciProj = report.projectBreakdown.find((p) => p.projectSlug === 'simmaci');
    const ilmoraProj = report.projectBreakdown.find((p) => p.projectSlug === 'ilmora');
    const kdiProj = report.projectBreakdown.find((p) => p.projectSlug === 'kdi');
    assert.ok(simmaciProj && simmaciProj.eligibleTasks >= 7);
    assert.ok(ilmoraProj && ilmoraProj.eligibleTasks >= 7);
    assert.ok(kdiProj && kdiProj.eligibleTasks >= 6);

    // 6. Role Breakdown (§21)
    assert.strictEqual(report.roleBreakdown.length, 5);
    const beRole = report.roleBreakdown.find((r) => r.role === 'BACKEND');
    assert.ok(beRole && beRole.completed > 0);

    // 7. Complexity Breakdown (§22)
    assert.strictEqual(report.difficultyBreakdown.length, 3);
    const easy = report.difficultyBreakdown.find((d) => d.difficulty === 'EASY');
    const medium = report.difficultyBreakdown.find((d) => d.difficulty === 'MEDIUM');
    const hard = report.difficultyBreakdown.find((d) => d.difficulty === 'HARD');
    assert.ok(easy && easy.autonomyRate >= medium!.autonomyRate, 'Easy tasks should have higher or equal autonomy than medium');

    // 8. Failure Analysis (§15 & §16)
    assert.ok(report.failureBreakdown.length > 0);
    assert.ok(report.failureBreakdown.some((f) => f.category === 'TEST_FAILURE'));
    assert.ok(report.failureBreakdown.some((f) => f.category === 'ANTIGRAVITY_FAILURE'));

    // 9. Operations Metrics (§24–§28)
    assert.ok(report.operationsMetrics.antigravityTasksSent >= 20);
    assert.ok(report.operationsMetrics.firstAssignmentSuccessRate > 80);
  });

  // ==========================================================
  // 6. EXIT REPORT & MARKDOWN GENERATION FORMAT (§39 & §50)
  // ==========================================================
  await test.it('Report Generator: Generates standardized Real-World Benchmark Exit Report matching §50 and Markdown Report matching §39', () => {
    const benchmark = new EngineeringBenchmarkService();
    const eligibleTasks = PHASE_18_BENCHMARK_TASKS.filter((t) => t.eligibility === 'ELIGIBLE');

    // Record sample tasks
    eligibleTasks.forEach((taskDef, index) => {
      const rec = benchmark.evaluateOutcome({
        taskDef,
        agentReportedSuccess: index !== 19,
        testsPassed: index !== 18 && index !== 19,
        acceptanceCriteriaPassed: index !== 19,
        scopeValid: true,
        reviewPassed: index !== 19,
        requiredApprovalEvaluated: taskDef.category === 'SECURITY',
        requiredApprovalGranted: true,
        attemptsCount: index % 2 === 0 ? 1 : 2,
        timeBreakdown: { executionMs: 180000, queueWaitMs: 5000, repairMs: 10000, reviewMs: 10000, approvalWaitMs: 1000 },
      });
      benchmark.recordPhase18Task(rec);
    });

    const report = benchmark.getPhase18SummaryReport(7);

    // 1. Generate text exit report (§50)
    const exitReport = Phase18BenchmarkReportGenerator.generateExitReport(report);
    assert.match(exitReport, /^PHASE 18 — BENCHMARK RESULT/m);
    assert.match(exitReport, /Benchmark Window:/);
    assert.match(exitReport, /Projects:\s+SIMMACI, ILMORA, KDI/);
    assert.match(exitReport, /Eligible Tasks:\s+20/);
    assert.match(exitReport, /Completed:\s+18/);
    assert.match(exitReport, /Failed:\s+2/);
    assert.match(exitReport, /Autonomy Rate:\s+\d+%/);
    assert.match(exitReport, /Success Rate:\s+\d+%/);
    assert.match(exitReport, /Human Intervention Rate:\s+\d+%/);
    assert.match(exitReport, /Average Human Intervention Time:/);
    assert.match(exitReport, /Average Execution Time:/);
    assert.match(exitReport, /Average Attempts:/);
    assert.match(exitReport, /False Success:/);
    assert.match(exitReport, /Recovery Success:/);
    assert.match(exitReport, /Top Failure Category:/);
    assert.match(exitReport, /Top Bottleneck:/);
    assert.match(exitReport, /Estimated Human Time Saved:/);
    assert.match(exitReport, /Recommended Next Improvement:/);

    // 2. Generate markdown report (§39)
    const mdReport = Phase18BenchmarkReportGenerator.generateMarkdownReport(report);
    assert.match(mdReport, /# PHASE 18 — REAL-WORLD AI ENGINEERING OPERATIONS BENCHMARK REPORT/);
    assert.match(mdReport, /## 1\. EXECUTIVE SUMMARY/);
    assert.match(mdReport, /## 2\. TASK DISTRIBUTION/);
    assert.match(mdReport, /## 3\. PROJECT BREAKDOWN/);
    assert.match(mdReport, /## 4\. ROLE BREAKDOWN/);
    assert.match(mdReport, /## 5\. COMPLEXITY BREAKDOWN/);
    assert.match(mdReport, /## 6\. HUMAN INTERVENTION ANALYSIS/);
    assert.match(mdReport, /## 7\. FAILURE ANALYSIS & ROOT CAUSE/);
    assert.match(mdReport, /## 8\. OPERATIONS & CONTROL PLANE EFFICIENCY/);
    assert.match(mdReport, /## 9\. TIME SAVINGS & HUMAN COORDINATION LOAD/);
    assert.match(mdReport, /## 10\. TOP BOTTLENECKS & RECOMMENDATIONS/);
    assert.match(mdReport, /## 11\. VERIFIABLE EVIDENCE AUDIT LOG/);
  });

  // ==========================================================
  // 7. TELEGRAM ORCHESTRATOR & MANAGER FACADE INTEGRATION (§38, §50)
  // ==========================================================
  await test.it('Telegram Orchestrator: Dispatches benchmark report via /engineering benchmark-report and NL queries (§38, §50)', async () => {
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

    // Populate benchmark data in manager
    const tasks = PHASE_18_BENCHMARK_TASKS.slice(0, 20);
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
      conversationId: 'conv_phase18_test',
      channel: 'telegram',
      senderId: '123456789',
      senderFirstName: 'Ayub',
      text,
      timestamp: new Date().toISOString(),
    });

    // 1. Slash command: /engineering benchmark-report
    const resCmd = await orchestrator.handleOwnerMessage(
      createMsg('/engineering benchmark-report'),
      'corr_bm_1'
    );
    assert.strictEqual(resCmd.type, 'SYSTEM_STATE');
    assert.match(resCmd.responseMessage, /PHASE 18 — BENCHMARK RESULT/);
    assert.match(resCmd.responseMessage, /Eligible Tasks:\s+20/);
    assert.match(resCmd.responseMessage, /Autonomy Rate:\s+100%/);

    // 2. Natural language query: "Laporan benchmark engineering"
    const resNL = await orchestrator.handleOwnerMessage(
      createMsg('Bagaimana laporan benchmark engineering?'),
      'corr_bm_2'
    );
    assert.match(resNL.responseMessage, /PHASE 18 — BENCHMARK RESULT/);
  });
});
