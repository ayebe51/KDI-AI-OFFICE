// ==========================================================
// services/api/src/benchmark/benchmark.test.ts
// Phase 16: Autonomous Software Delivery Benchmark Verification Suite
// ==========================================================

import { describe, test } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { BenchmarkTaskCatalog } from './catalog/benchmark-suite.catalog.js';
import { BenchmarkRepository } from './persistence/benchmark.repository.js';
import { InterventionTracker } from './engine/intervention-tracker.js';
import { RecoveryLoopEngine } from './engine/recovery-loop.engine.js';
import { EvidencePackager } from './engine/evidence-packager.js';
import { BenchmarkRunner } from './engine/benchmark-runner.js';
import { BenchmarkService } from './benchmark.service.js';
import { TelegramFormatter } from '../telegram/formatter/telegram.formatter.js';
import { OrchestratorService } from '../telegram/orchestrator/orchestrator.service.js';
import { TelegramRepository } from '../telegram/persistence/telegram.repository.js';
import type {
  BenchmarkTask,
  BenchmarkRun,
  OwnerMessage,
} from '@kdi/types';

describe('PHASE 16: Autonomous Software Delivery Benchmark Suite', () => {
  const isRealRepo = (p?: string): boolean =>
    Boolean(p && fs.existsSync(path.join(p, 'package.json')));

  const repoCandidates = [
    path.resolve(process.cwd(), '../../fixtures/benchmark-repo'),
    path.resolve(process.cwd(), '../fixtures/benchmark-repo'),
    path.resolve(process.cwd(), 'fixtures/benchmark-repo'),
  ];
  const repoPath = repoCandidates.find(isRealRepo) || path.resolve(process.cwd(), 'fixtures/benchmark-repo');

  // ==========================================================
  // 1. BENCHMARK TASK MODEL & 5 DIFFICULTY LEVELS
  // ==========================================================

  test('Test 1: Benchmark suite contains 10 realistic tasks across 5 difficulty levels', () => {
    const catalog = new BenchmarkTaskCatalog();
    const tasks = catalog.listTasks();

    assert.strictEqual(tasks.length, 10, 'Must have exactly 10 canonical benchmark tasks');

    // Verify all 5 difficulty levels are present
    const levels = new Set(tasks.map((t) => t.level));
    assert.ok(levels.has(1), 'Level 1 must exist');
    assert.ok(levels.has(2), 'Level 2 must exist');
    assert.ok(levels.has(3), 'Level 3 must exist');
    assert.ok(levels.has(4), 'Level 4 must exist');
    assert.ok(levels.has(5), 'Level 5 must exist');

    // Verify all tasks have required fields
    for (const t of tasks) {
      assert.ok(t.id.startsWith('SIMMACI-'));
      assert.ok(t.title.length > 5);
      assert.ok(t.description.length > 10);
      assert.ok(t.acceptanceCriteria.length >= 2, `${t.id} must have >= 2 acceptance criteria`);
      assert.ok(t.constraints.length >= 1, `${t.id} must define constraints`);
      assert.ok(t.expectedArtifacts.length >= 1, `${t.id} must define expected artifacts`);
    }

    // Verify Golden Path task exists
    const golden = catalog.getGoldenPathTask();
    assert.strictEqual(golden.id, 'SIMMACI-010');
    assert.strictEqual(golden.level, 5);
    assert.match(golden.title, /Golden Path/i);
  });

  // ==========================================================
  // 2. HUMAN INTERVENTION TAXONOMY & METRIC CALCULATOR
  // ==========================================================

  test('Test 2: Human intervention tracker categorizes H1-H6 and distinguishes necessary approvals', () => {
    const tracker = new InterventionTracker();

    // H1 to H5 are unnecessary steering
    const h1 = tracker.record('run_1', 'H1_CLARIFICATION', 'Asked user which file to modify');
    assert.strictEqual(h1.isNecessary, false, 'H1 clarification is unnecessary');

    const h2 = tracker.record('run_1', 'H2_CODE_CORRECTION', 'Human wrote line 42 for the agent');
    assert.strictEqual(h2.isNecessary, false, 'H2 code correction is unnecessary');

    const h3 = tracker.record('run_1', 'H3_TOOL_CORRECTION', 'Human told agent to run npm test');
    assert.strictEqual(h3.isNecessary, false, 'H3 tool guidance is unnecessary');

    // H6 approval for normal edit is unnecessary
    const h6Unnec = tracker.record('run_1', 'H6_APPROVAL', 'Approval to edit auth.service.js');
    assert.strictEqual(h6Unnec.isNecessary, false, 'Approval for safe local edit is unnecessary');

    // H6 approval for production deploy is NECESSARY
    const h6Nec = tracker.record('run_1', 'H6_APPROVAL', 'Production deployment to main branch');
    assert.strictEqual(h6Nec.isNecessary, true, 'Approval for production deploy is necessary');

    assert.strictEqual(tracker.getUnnecessaryCount(), 4);
    assert.strictEqual(tracker.getNecessaryCount(), 1);

    // Calculate metrics: since unnecessary > 0, autonomous completion is FALSE
    const metricsFailAutonomy = tracker.calculateMetrics({
      taskCompleted: true,
      firstPassSuccess: true,
      recoveryAttempts: 0,
      recoverySuccess: true,
      testRuns: 1,
      testPasses: 1,
      deliveryCycleTimeMs: 12000,
      totalFilesChanged: 2,
      hasEvidencePackage: true,
    });

    assert.strictEqual(metricsFailAutonomy.taskCompletion, true);
    assert.strictEqual(metricsFailAutonomy.autonomousCompletion, false, 'Must be false when unnecessary steering occurred');
    assert.strictEqual(metricsFailAutonomy.unnecessaryInterventions, 4);
    assert.strictEqual(metricsFailAutonomy.necessaryApprovals, 1);

    // Clean autonomous run with zero unnecessary steering
    const cleanTracker = new InterventionTracker();
    cleanTracker.record('run_2', 'H6_APPROVAL', 'Production deployment approval');
    const cleanMetrics = cleanTracker.calculateMetrics({
      taskCompleted: true,
      firstPassSuccess: true,
      recoveryAttempts: 0,
      recoverySuccess: true,
      testRuns: 1,
      testPasses: 1,
      deliveryCycleTimeMs: 8000,
      totalFilesChanged: 2,
      hasEvidencePackage: true,
    });

    assert.strictEqual(cleanMetrics.autonomousCompletion, true, 'Must be true when only necessary approval occurred');
    assert.strictEqual(cleanMetrics.firstPassSuccess, true);
    assert.strictEqual(cleanMetrics.testReliability, 1.0);
  });

  // ==========================================================
  // 3. FAILURE TAXONOMY & RECOVERY LOOP
  // ==========================================================

  test('Test 3: Recovery loop classifies failures and forms hypothesis without silent infinite retries', () => {
    const recoveryEngine = new RecoveryLoopEngine(3, 4);

    // Classification tests
    const codeFail = recoveryEngine.classifyFailure({
      attemptNumber: 1,
      maxAttempts: 3,
      stage: 'EXECUTION',
      errorOutput: 'TypeError: Cannot read properties of undefined (reading "role")',
    });
    assert.strictEqual(codeFail, 'CODE_FAILURE');

    const testFail = recoveryEngine.classifyFailure({
      attemptNumber: 1,
      maxAttempts: 3,
      stage: 'TEST',
      errorOutput: 'AssertionError [ERR_ASSERTION]: Expected true but got false',
    });
    assert.strictEqual(testFail, 'TEST_FAILURE');

    const authFail = recoveryEngine.classifyFailure({
      attemptNumber: 1,
      maxAttempts: 3,
      stage: 'EXECUTION',
      errorOutput: 'EACCES: permission denied, open /etc/shadow',
    });
    assert.strictEqual(authFail, 'AUTHORIZATION_FAILURE');

    // Authorization failure cannot be resolved by retry
    const decisionAuth = recoveryEngine.evaluateRecovery({
      attemptNumber: 1,
      maxAttempts: 3,
      stage: 'EXECUTION',
      errorOutput: 'EACCES: permission denied',
    });
    assert.strictEqual(decisionAuth.shouldRetry, false);
    assert.strictEqual(decisionAuth.isUnrecoverable, true);
    assert.strictEqual(decisionAuth.plannedAction, 'ESCALATE_TO_BLOCKED');

    // Test failure produces actionable recovery hypothesis
    const decisionTest = recoveryEngine.evaluateRecovery({
      attemptNumber: 1,
      maxAttempts: 3,
      stage: 'TEST',
      errorOutput: 'AssertionError [ERR_ASSERTION]: expected "admin@simmaci.kdi" to equal "admin@simmaci.kdi "',
    });
    assert.strictEqual(decisionTest.shouldRetry, true);
    assert.strictEqual(decisionTest.attemptNumber, 2);
    assert.ok(decisionTest.hypothesis.length > 10);
    assert.strictEqual(decisionTest.isUnrecoverable, false);

    // Exceeding retry limit halts retry loop
    const decisionMax = recoveryEngine.evaluateRecovery({
      attemptNumber: 3,
      maxAttempts: 3,
      stage: 'TEST',
      errorOutput: 'Tests failed again',
    });
    assert.strictEqual(decisionMax.shouldRetry, false);
    assert.strictEqual(decisionMax.isUnrecoverable, true);
  });

  // ==========================================================
  // 4. REAL REPOSITORY EXECUTION: LEVEL 1 BUG FIX (SIMMACI-001)
  // ==========================================================

  test('Test 4: Real execution of Level 1 Bug Fix (SIMMACI-001) with diff and tests passing', async () => {
    const repository = new BenchmarkRepository();
    const runner = new BenchmarkRunner(repository, { defaultRepoPath: repoPath });
    const catalog = new BenchmarkTaskCatalog();
    const task = catalog.getTask('SIMMACI-001')!;

    const run = await runner.executeBenchmark(task, { mode: 'AUTONOMOUS' });

    assert.strictEqual(run.status, 'COMPLETED');
    assert.strictEqual(run.task_id, 'SIMMACI-001');
    assert.strictEqual(run.successful_tests >= 1, true);
    assert.strictEqual(run.failed_tests, 0);
    assert.ok(run.final_commit);
    assert.ok(run.final_artifact);
    assert.strictEqual(run.metrics.taskCompletion, true);
    assert.strictEqual(run.metrics.autonomousCompletion, true);
    assert.strictEqual(run.metrics.unnecessaryInterventions, 0);

    // Verify 15-step completion
    const stepNames = run.steps.map((s) => s.name);
    assert.ok(stepNames.includes('TASK_INTAKE'));
    assert.ok(stepNames.includes('TASK_UNDERSTANDING'));
    assert.ok(stepNames.includes('PLANNING'));
    assert.ok(stepNames.includes('AGENT_ASSIGNMENT'));
    assert.ok(stepNames.includes('REPOSITORY_INSPECTION'));
    assert.ok(stepNames.includes('IMPLEMENTATION'));
    assert.ok(stepNames.includes('TESTING'));
    assert.ok(stepNames.includes('QUALITY_VERIFICATION'));
    assert.ok(stepNames.includes('DIFF_REVIEW'));
    assert.ok(stepNames.includes('APPROVAL_GATE'));
    assert.ok(stepNames.includes('DELIVERY'));
    assert.ok(stepNames.includes('AUDIT_RECORD'));
  });

  // ==========================================================
  // 5. AUTONOMOUS SELF-RECOVERY ON FAILING TEST (SIMMACI-005)
  // ==========================================================

  test('Test 5: Self-recovery loop recovers autonomously from initial test failure (SIMMACI-005)', async () => {
    const repository = new BenchmarkRepository();
    const runner = new BenchmarkRunner(repository, { defaultRepoPath: repoPath });
    const catalog = new BenchmarkTaskCatalog();
    const task = catalog.getTask('SIMMACI-005')!;

    const run = await runner.executeBenchmark(task, { mode: 'AUTONOMOUS' });

    assert.strictEqual(run.status, 'COMPLETED');
    assert.strictEqual(run.recovery_count, 1, 'Should record exactly 1 recovery cycle');
    assert.strictEqual(run.attempts.length, 2, 'Should have Attempt 1 (fail) and Attempt 2 (success)');
    assert.strictEqual(run.attempts[0].status, 'FAILED');
    assert.strictEqual(run.attempts[1].status, 'SUCCESS');
    assert.strictEqual(run.metrics.firstPassSuccess, false);
    assert.strictEqual(run.metrics.recoverySuccessRate > 0, true);
    assert.strictEqual(run.metrics.autonomousCompletion, true, 'Zero human steering during recovery');

    // Verify step timeline has failure detection and debugging
    const stepNames = run.steps.map((s) => s.name);
    assert.ok(stepNames.includes('FAILURE_DETECTION'));
    assert.ok(stepNames.includes('DEBUGGING'));
    assert.ok(stepNames.includes('RE_TEST'));
  });

  // ==========================================================
  // 6. REAL FEATURE IMPLEMENTATION & CSV EXPORT (SIMMACI-002)
  // ==========================================================

  test('Test 6: Real execution of Level 2 Backend Feature (SIMMACI-002 CSV export)', async () => {
    const repository = new BenchmarkRepository();
    const runner = new BenchmarkRunner(repository, { defaultRepoPath: repoPath });
    const catalog = new BenchmarkTaskCatalog();
    const task = catalog.getTask('SIMMACI-002')!;

    const run = await runner.executeBenchmark(task, { mode: 'AUTONOMOUS' });

    assert.strictEqual(run.status, 'COMPLETED');
    assert.strictEqual(run.successful_tests >= 1, true);
    assert.ok(run.final_commit);

    // Verify git diff artifact exists and is non-empty
    const diffArtifact = run.artifacts.find((a) => a.type === 'GIT_DIFF');
    assert.ok(diffArtifact);
    assert.ok(diffArtifact.content.length > 10);
  });

  // ==========================================================
  // 7. GOLDEN PATH END-TO-END AUTONOMOUS EXECUTION (SIMMACI-010)
  // ==========================================================

  test('Test 7: Canonical Golden Path (SIMMACI-010) produces immutable artifacts with zero unnecessary interventions', async () => {
    const repository = new BenchmarkRepository();
    const runner = new BenchmarkRunner(repository, { defaultRepoPath: repoPath });
    const catalog = new BenchmarkTaskCatalog();
    const goldenTask = catalog.getGoldenPathTask();

    const run = await runner.executeBenchmark(goldenTask, { mode: 'AUTONOMOUS' });

    assert.strictEqual(run.status, 'COMPLETED');
    assert.strictEqual(run.task_id, 'SIMMACI-010');
    assert.strictEqual(run.metrics.autonomousCompletion, true);
    assert.strictEqual(run.metrics.unnecessaryInterventions, 0);
    assert.strictEqual(run.metrics.necessaryApprovals, 1, 'Production deployment gate recorded as necessary approval');
    assert.ok(run.final_commit);

    // Verify all 5 mandatory artifacts are packaged
    const artifactTypes = run.artifacts.map((a) => a.type);
    assert.ok(artifactTypes.includes('REPORT_JSON'));
    assert.ok(artifactTypes.includes('REPORT_MD'));
    assert.ok(artifactTypes.includes('EXECUTION_LOG'));
    assert.ok(artifactTypes.includes('GIT_DIFF'));
    assert.ok(artifactTypes.includes('TEST_RESULTS'));

    // Check report markdown answers all Section 24 questions
    const reportMd = run.artifacts.find((a) => a.type === 'REPORT_MD')!.content;
    assert.match(reportMd, /What was requested\?/);
    assert.match(reportMd, /Who worked on it\?/);
    assert.match(reportMd, /What happened\?/);
    assert.match(reportMd, /What changed\?/);
    assert.match(reportMd, /How many human interventions occurred\?/);
    assert.match(reportMd, /What evidence proves completion\?/);
    assert.match(reportMd, /WHAT CAN KDI ACTUALLY DO AUTONOMOUSLY\?/);
    assert.match(reportMd, /PROVEN/);
  });

  // ==========================================================
  // 8. TELEGRAM COMMAND & CONCISE OPERATIONAL EXPERIENCE
  // ==========================================================

  test('Test 8: Telegram commands (/benchmark, /build, /fix) return concise operational cards without verbose chatter', async () => {
    const repository = new BenchmarkRepository();
    const benchmarkService = new BenchmarkService();
    const tgRepo = new TelegramRepository();
    const orchestrator = new OrchestratorService(
      tgRepo,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      benchmarkService
    );

    const makeMsg = (text: string): OwnerMessage => ({
      messageId: `msg_${Date.now()}`,
      senderId: '123456789',
      conversationId: 'conv_bm_test',
      channel: 'telegram',
      text,
      timestamp: new Date().toISOString(),
      senderFirstName: 'Owner',
    });

    // 1. /benchmark list
    const resList = await orchestrator.handleOwnerMessage(makeMsg('/benchmark list'), 'trc_1');
    assert.strictEqual(resList.type, 'TEXT');
    assert.match(resList.responseMessage, /Daftar Task Suite/);
    assert.match(resList.responseMessage, /SIMMACI-001/);
    assert.match(resList.responseMessage, /SIMMACI-010/);

    // 2. /benchmark status
    const resStatus = await orchestrator.handleOwnerMessage(makeMsg('/benchmark status'), 'trc_2');
    assert.strictEqual(resStatus.type, 'SYSTEM_STATE');
    assert.match(resStatus.responseMessage, /AUTONOMOUS SOFTWARE DELIVERY BENCHMARK METRICS/);

    // 3. /build command
    const resBuild = await orchestrator.handleOwnerMessage(
      makeMsg('/build Tambahkan export CSV pada daftar guru SIMMACI'),
      'trc_3'
    );
    assert.strictEqual(resBuild.type, 'TASK_CREATED');
    assert.match(resBuild.responseMessage, /TASK ACCEPTED/);
    assert.match(resBuild.responseMessage, /Plan:/);
    assert.match(resBuild.responseMessage, /Execution started/);
    assert.match(resBuild.responseMessage, /IMPLEMENTATION COMPLETE/);
    assert.match(resBuild.responseMessage, /Tests:/);
    assert.match(resBuild.responseMessage, /Commit:/);

    // 4. /fix command
    const resFix = await orchestrator.handleOwnerMessage(
      makeMsg('/fix Perbaiki bug filter sekolah'),
      'trc_4'
    );
    assert.strictEqual(resFix.type, 'TASK_CREATED');
    assert.match(resFix.responseMessage, /TASK ACCEPTED/);
    assert.match(resFix.responseMessage, /IMPLEMENTATION COMPLETE/);

    // 5. Natural language trigger
    const resNL = await orchestrator.handleOwnerMessage(
      makeMsg('Tolong jalankan benchmark otonom'),
      'trc_5'
    );
    assert.strictEqual(resNL.type, 'TASK_CREATED');
    assert.match(resNL.responseMessage, /TASK ACCEPTED/);
  });

  // ==========================================================
  // 9. REPOSITORY PERSISTENCE & METRICS SUMMARY
  // ==========================================================

  test('Test 9: Benchmark persistence stores runs, artifacts, approvals, and computes summary metrics', async () => {
    const repository = new BenchmarkRepository();
    const service = new BenchmarkService();

    // Verify initial metrics
    const summary = await service.getMetricsSummary();
    assert.strictEqual(typeof summary.totalRuns, 'number');
    assert.strictEqual(typeof summary.autonomousCompletionRate, 'number');

    // Run task SIMMACI-004 via service
    const run = await service.startBenchmarkRun('SIMMACI-004', { mode: 'AUTONOMOUS' });
    assert.strictEqual(run.status, 'COMPLETED');

    const fetchedRun = await service.getRun(run.run_id);
    assert.ok(fetchedRun);
    assert.strictEqual(fetchedRun.task_id, 'SIMMACI-004');

    const artifacts = await service.getArtifacts(run.run_id);
    assert.ok(artifacts.length >= 5);
  });

  // ==========================================================
  // 10. REWORK RATE & EVIDENCE VERIFICATION
  // ==========================================================

  test('Test 10: Rework rate and evidence completeness are strictly calculated without opaque scoring', () => {
    const tracker = new InterventionTracker();
    const metrics = tracker.calculateMetrics({
      taskCompleted: true,
      firstPassSuccess: true,
      recoveryAttempts: 0,
      recoverySuccess: true,
      testRuns: 4,
      testPasses: 4,
      deliveryCycleTimeMs: 14500,
      totalFilesChanged: 5,
      reworkFilesCount: 1,
      hasEvidencePackage: true,
    });

    assert.strictEqual(metrics.reworkRate, 0.2); // 1 / 5 = 0.2
    assert.strictEqual(metrics.testReliability, 1.0); // 4 / 4 = 1.0
    assert.strictEqual(metrics.evidenceCompleteness, 1.0);
    assert.strictEqual(metrics.deliveryCycleTimeMs, 14500);
  });
});
