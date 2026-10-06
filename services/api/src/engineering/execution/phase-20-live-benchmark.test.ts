// ==========================================================
// services/api/src/engineering/execution/phase-20-live-benchmark.test.ts
// Phase 20: Real-World AI Engineering Live Operations Benchmark Test Suite
// ==========================================================

process.env.NODE_ENV = 'test';

import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import {
  PHASE_20_REAL_TASK_CATALOG,
  Phase20LiveBenchmarkEngine,
  Phase20ReportGenerator,
} from '../benchmark-p20/index.js';
import { WindowsHostRegistryService } from '../host/host-registry.service.js';
import { RepositoryAllowlistService } from '../host/repository-allowlist.service.js';
import { RemoteExecutionChannelService } from '../host/remote-execution-channel.service.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import { EngineeringManagerService } from '../manager/engineering-manager.service.js';
import { OrchestratorService } from '../../telegram/orchestrator/orchestrator.service.js';
import { TelegramRepository } from '../../telegram/persistence/telegram.repository.js';
import type { OwnerMessage } from '@kdi/types';

function findWorkspaceRoot(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(cur, 'fixtures', 'demo-calc-repo'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return process.cwd();
}

test('KDI Phase 20: Live Operations Benchmark Suite', async (suite) => {
  const wsRoot = findWorkspaceRoot();

  // ── Test 1: Real Task Catalog Rigor & Criteria Integrity (§3–§5) ─────────────
  await suite.test('Test 1: Real Task Catalog Rigor & Distribution (§3–§5)', () => {
    const catalog = PHASE_20_REAL_TASK_CATALOG;
    assert.equal(catalog.length, 10, 'Catalog must contain exactly 10 real engineering tasks');

    // Project distribution: SIMMACI: 4, ILMORA: 3, KDI: 3
    const simmaciTasks = catalog.filter((t) => t.projectSlug === 'simmaci');
    const ilmoraTasks = catalog.filter((t) => t.projectSlug === 'ilmora');
    const kdiTasks = catalog.filter((t) => t.projectSlug === 'kdi');

    assert.equal(simmaciTasks.length, 4, 'SIMMACI must have 4 real tasks');
    assert.equal(ilmoraTasks.length, 3, 'ILMORA must have 3 real tasks');
    assert.equal(kdiTasks.length, 3, 'KDI AI Office must have 3 real tasks');

    // Role coverage: Backend, Frontend, QA, Security, DevOps
    const roles = new Set(catalog.map((t) => t.role));
    assert.ok(roles.has('BACKEND'), 'Catalog must cover BACKEND');
    assert.ok(roles.has('FRONTEND'), 'Catalog must cover FRONTEND');
    assert.ok(roles.has('QA'), 'Catalog must cover QA');
    assert.ok(roles.has('SECURITY'), 'Catalog must cover SECURITY');
    assert.ok(roles.has('DEVOPS'), 'Catalog must cover DEVOPS');

    // Difficulty coverage: EASY, MEDIUM, HARD with stored rationales
    for (const t of catalog) {
      assert.ok(['EASY', 'MEDIUM', 'HARD'].includes(t.difficulty), `Task ${t.taskId} invalid difficulty`);
      assert.ok(t.difficultyRationale.length > 10, `Task ${t.taskId} missing difficultyRationale`);
      assert.ok(t.acceptanceCriteria.length >= 2, `Task ${t.taskId} must have >= 2 acceptanceCriteria`);
      assert.ok(t.baselineHumanMinutes > 0, `Task ${t.taskId} missing baselineHumanMinutes`);
    }
  });

  // ── Test 2: Complete Pipeline Execution & Observability Timeline (§6, §11) ────
  await suite.test('Test 2: Complete Production Pipeline & Timeline Observability (§6 & §11)', async () => {
    const engine = new Phase20LiveBenchmarkEngine({
      hostId: 'WINDOWS-HOST-P20-TEST',
      simulateInterventions: false,
    });

    const sampleTask = PHASE_20_REAL_TASK_CATALOG[0]; // SIMMACI-P20-01
    const metrics = await engine.runBenchmark([sampleTask]);

    assert.equal(metrics.totalTasks, 1);
    assert.equal(metrics.completedTasks, 1);

    const records = engine.getExecutionRecords();
    assert.equal(records.length, 1);
    const rec = records[0];

    assert.equal(rec.taskId, 'SIMMACI-P20-01');
    assert.equal(rec.status, 'COMPLETED');
    assert.equal(rec.testPass, true);
    assert.equal(rec.commitSuccess, true);

    // Timeline state check (§11)
    const states = rec.timeline.map((t) => t.state);
    assert.ok(states.includes('RECEIVED'));
    assert.ok(states.includes('QUEUED'));
    assert.ok(states.includes('PLANNED'));
    assert.ok(states.includes('ASSIGNED'));
    assert.ok(states.includes('DISPATCHED'));
    assert.ok(states.includes('EXECUTING'));
    assert.ok(states.includes('VERIFYING'));
    assert.ok(states.includes('REVIEWING'));
    assert.ok(states.includes('COMMITTED'));

    for (const entry of rec.timeline) {
      assert.ok(entry.timestamp, 'Timeline entry must have ISO timestamp');
    }
  });

  // ── Test 3: Cross-Project Isolation & Segregation (§12) ────────────────────────
  await suite.test('Test 3: Cross-Project Isolation: SIMMACI -> ILMORA -> KDI (§12)', async () => {
    const allowlist = new RepositoryAllowlistService();
    const registry = new WindowsHostRegistryService();

    registry.registerHost({
      hostId: 'WINDOWS-HOST-CROSS',
      hostname: 'DESKTOP-MULTI',
      platform: 'win32',
      architecture: 'x64',
      antigravityVersion: '1.2.17',
      agyPath: 'C:\\Users\\user\\AppData\\Local\\agy\\bin\\agy.exe',
      gitVersion: 'git version 2.53.0',
      nodeVersion: 'v24.15.0',
      availableRuntimes: ['node', 'git', 'agy'],
      status: 'ONLINE',
      executorStatus: 'READY',
      lastHeartbeat: Date.now(),
      maxConcurrentTasks: 3,
      activeTasksCount: 0,
      capabilities: ['antigravity'],
      registeredAt: Date.now(),
    });

    registry.setProjectHostMapping('simmaci', 'WINDOWS-HOST-CROSS');
    registry.setProjectHostMapping('ilmora', 'WINDOWS-HOST-CROSS');
    registry.setProjectHostMapping('kdi', 'WINDOWS-HOST-CROSS');

    // 1. Resolve SIMMACI
    const simmaciRes = allowlist.resolveHostRepositoryPath('simmaci');
    assert.equal(simmaciRes.allowed, true);
    assert.ok(!simmaciRes.resolvedPath.includes('ilmora'));

    // 2. Resolve ILMORA
    const ilmoraRes = allowlist.resolveHostRepositoryPath('ilmora');
    assert.equal(ilmoraRes.allowed, true);
    assert.ok(!ilmoraRes.resolvedPath.includes('simmaci'));

    // 3. Resolve KDI
    const kdiRes = allowlist.resolveHostRepositoryPath('kdi');
    assert.equal(kdiRes.allowed, true);
    assert.ok(kdiRes.resolvedPath.length > 5);

    // Verify paths are strictly different
    assert.notEqual(simmaciRes.resolvedPath, ilmoraRes.resolvedPath);
  });

  // ── Test 4: Concurrency & Host Capacity Protection (§13) ──────────────────────
  await suite.test('Test 4: Concurrency Control & Host Capacity Limits (§13)', () => {
    const registry = new WindowsHostRegistryService();
    registry.registerHost({
      hostId: 'WINDOWS-HOST-CAPACITY',
      hostname: 'PC-TEST',
      platform: 'win32',
      architecture: 'x64',
      antigravityVersion: '1.2.17',
      agyPath: 'agy.exe',
      gitVersion: '2.53.0',
      nodeVersion: 'v24.15.0',
      availableRuntimes: ['node'],
      status: 'ONLINE',
      executorStatus: 'READY',
      lastHeartbeat: Date.now(),
      maxConcurrentTasks: 2, // Maximum 2 concurrent
      activeTasksCount: 0,
      capabilities: ['antigravity'],
      registeredAt: Date.now(),
    });

    // Increment to capacity
    registry.incrementActiveTask('WINDOWS-HOST-CAPACITY');
    registry.incrementActiveTask('WINDOWS-HOST-CAPACITY');

    const readiness = registry.evaluateHostReadiness('WINDOWS-HOST-CAPACITY');
    assert.equal(readiness.isReady, false);
    assert.equal(readiness.status, 'BUSY');
    assert.match(readiness.reason || '', /capacity/i);

    // Decrement and recheck
    registry.decrementActiveTask('WINDOWS-HOST-CAPACITY');
    const readiness2 = registry.evaluateHostReadiness('WINDOWS-HOST-CAPACITY');
    assert.equal(readiness2.isReady, true);
    assert.equal(readiness2.status, 'ONLINE');
  });

  // ── Test 5: Telegram Operations & Deterministic NL Routing (§14) ──────────────
  await suite.test('Test 5: Telegram Commands & Natural Language Operations (§14)', async () => {
    const telegramRepo = new TelegramRepository();
    const manager = new EngineeringManagerService();
    const orchestrator = new OrchestratorService(
      telegramRepo,
      undefined,
      undefined,
      undefined,
      { managerService: manager } as any
    );

    // Register active mock tasks in manager
    manager.enqueueTask({
      taskId: 'SIMMACI-BE-01',
      title: 'Fix student transcript rounding',
      description: 'Fix floating point rounding precision',
      projectSlug: 'simmaci',
      agentRole: 'BACKEND',
      taskType: 'BUG_FIX',
      severity: 'HIGH',
      dependencies: [],
    });

    manager.enqueueTask({
      taskId: 'ILMORA-FE-01',
      title: 'Course quiz progress bar',
      description: 'Add progress bar component',
      projectSlug: 'ilmora',
      agentRole: 'FRONTEND',
      taskType: 'FEATURE',
      severity: 'MEDIUM',
      dependencies: [],
    });

    const createMsg = (text: string): OwnerMessage => ({
      messageId: `msg_${Date.now()}`,
      channel: 'telegram',
      senderId: '123456789',
      senderUsername: 'ayub_owner',
      senderFirstName: 'Ayub',
      text,
      conversationId: 'conv_p20_test',
      timestamp: new Date().toISOString(),
    });

    // 1. /engineering portfolio
    const r1 = await orchestrator.handleOwnerMessage(createMsg('/engineering portfolio'), 'corr_p20_1');
    assert.equal(r1.type, 'SYSTEM_STATE');
    assert.match(r1.responseMessage, /PORTFOLIO/i);

    // 2. /engineering workload
    const r2 = await orchestrator.handleOwnerMessage(createMsg('/engineering workload'), 'corr_p20_2');
    assert.equal(r2.type, 'SYSTEM_STATE');
    assert.match(r2.responseMessage, /WORKFORCE/i);

    // 3. /engineering run-top
    const r3 = await orchestrator.handleOwnerMessage(createMsg('/engineering run-top'), 'corr_p20_3');
    assert.equal(r3.type, 'TASK_CREATED');
    assert.match(r3.responseMessage, /MEMULAI TASK TERPENTING/i);

    // 4. Natural language: "Kerjakan bug backend SIMMACI yang prioritas tinggi."
    const r4 = await orchestrator.handleOwnerMessage(createMsg('Kerjakan bug backend SIMMACI yang prioritas tinggi.'), 'corr_p20_4');
    assert.equal(r4.type, 'TASK_CREATED');
    assert.match(r4.responseMessage, /SIMMACI/i);

    // 5. Natural language: "Kerjakan task ILMORA yang tidak bergantung task lain."
    const r5 = await orchestrator.handleOwnerMessage(createMsg('Kerjakan task ILMORA yang tidak bergantung task lain.'), 'corr_p20_5');
    assert.equal(r5.type, 'TASK_CREATED');
    assert.match(r5.responseMessage, /ILMORA/i);

    // 6. Natural language: "Bagaimana pekerjaan KDI hari ini?"
    const r6 = await orchestrator.handleOwnerMessage(createMsg('Bagaimana pekerjaan KDI hari ini?'), 'corr_p20_6');
    assert.equal(r6.type, 'TASK_CREATED');
    assert.match(r6.responseMessage, /KDI AI OFFICE/i);
  });

  // ── Test 6: Independent Verification & Zero False Success Guarantee (§15) ────
  await suite.test('Test 6: Independent Verification & Strict 0% False Success (§15)', async () => {
    const engine = new Phase20LiveBenchmarkEngine({
      hostId: 'WINDOWS-HOST-VERIFY',
      simulateInterventions: false,
    });

    // Run easy calculator task
    const calcTask = PHASE_20_REAL_TASK_CATALOG.find((t) => t.taskId === 'KDI-P20-01')!;
    const metrics = await engine.runBenchmark([calcTask]);

    assert.equal(metrics.completedTasks, 1);
    assert.equal(metrics.falseSuccessRate, 0, 'False success rate must be strictly 0%');

    const records = engine.getExecutionRecords();
    const rec = records[0];
    assert.equal(rec.falseSuccess, false);
    assert.equal(rec.testPass, true);
    assert.ok(rec.reviewScore >= 90);
  });

  // ── Test 7: Cryptographic Human Approval Gate on High-Risk Tasks (§16, §22) ───
  await suite.test('Test 7: Cryptographic Approval Gate on High-Risk Tasks (§16 & §22)', async () => {
    const approvalGate = new ApprovalGateService();

    const highRiskTask = PHASE_20_REAL_TASK_CATALOG.find((t) => t.taskId === 'SIMMACI-P20-04')!;
    assert.equal(highRiskTask.riskLevel, 'HIGH');

    // 1. Create approval request
    const req = approvalGate.createApprovalRequest(
      'exec_SIMMACI-P20-04',
      highRiskTask.taskId,
      'SECURITY',
      'git commit -m "feat(security): sanitize student profile export"',
      highRiskTask.riskLevel,
      highRiskTask.description
    );

    assert.equal(req.status, 'PENDING');
    assert.ok(req.approvalId.startsWith('appr_'));
    assert.ok(req.command.includes('git commit'));

    // 2. Human approval via Telegram
    const resolved = approvalGate.resolveApproval(req.approvalId, true, 'Ayub (Owner Telegram)');
    assert.equal(resolved?.status, 'APPROVED');
    assert.equal(resolved?.resolvedBy, 'Ayub (Owner Telegram)');
  });

  // ── Test 8: Human Intervention Tracking & Duration Metrics (§7, §8) ───────────
  await suite.test('Test 8: Human Intervention Tracking & Metric Calculations (§7 & §8)', async () => {
    const engine = new Phase20LiveBenchmarkEngine({
      hostId: 'WINDOWS-HOST-INTERVENTIONS',
      simulateInterventions: true,
    });

    // Run hard task requiring security clarification
    const hardTask = PHASE_20_REAL_TASK_CATALOG.find((t) => t.taskId === 'SIMMACI-P20-04')!;
    const metrics = await engine.runBenchmark([hardTask]);

    assert.equal(metrics.completedTasks, 1);
    assert.equal(metrics.humanInterventionRate, 100);
    assert.ok(metrics.avgInterventionMinutes > 0);

    const rec = engine.getExecutionRecords()[0];
    assert.equal(rec.humanIntervention, true);
    assert.equal(rec.interventionType, 'MANUAL_CLARIFICATION');
    assert.equal(rec.interventionReason, 'SECURITY');
    assert.ok(rec.humanInterventionMinutes > 0);
  });

  // ── Test 9: Complete 10-Task Live Operations Benchmark Suite Execution (§6, §8, §9) ─
  await suite.test('Test 9: Full 10 Real Engineering Tasks Live Operations Benchmark Execution (§6, §8, §9)', async () => {
    const engine = new Phase20LiveBenchmarkEngine({
      hostId: 'WINDOWS-HOST-LIVE-01',
      simulateInterventions: true,
    });

    // Run entire 10-task catalog
    const metrics = await engine.runBenchmark(PHASE_20_REAL_TASK_CATALOG);

    assert.equal(metrics.totalTasks, 10);
    assert.equal(metrics.eligibleTasks, 10);
    assert.equal(metrics.completedTasks, 10);
    assert.equal(metrics.failedTasks, 0);

    // Primary rates (§9)
    assert.equal(metrics.successRate, 100);
    assert.ok(metrics.autonomyRate >= 80, `Expected autonomy rate >= 80%, got ${metrics.autonomyRate}%`);
    assert.ok(metrics.humanInterventionRate <= 20, `Expected human intervention rate <= 20%, got ${metrics.humanInterventionRate}%`);
    assert.equal(metrics.falseSuccessRate, 0, 'False success rate must be 0%');

    // Averages (§9)
    assert.ok(metrics.avgCycleTimeMinutes > 0);
    assert.ok(metrics.benchmarkWindow.durationMs > 0);

    // Project breakdown (§19)
    assert.equal(metrics.byProject['simmaci'].total, 4);
    assert.equal(metrics.byProject['ilmora'].total, 3);
    assert.equal(metrics.byProject['kdi'].total, 3);

    // Difficulty breakdown (§19)
    assert.equal(metrics.byDifficulty['EASY'].total, 4);
    assert.equal(metrics.byDifficulty['MEDIUM'].total, 4);
    assert.equal(metrics.byDifficulty['HARD'].total, 2);
    assert.equal(metrics.byDifficulty['EASY'].autonomyRate, 100, 'EASY tasks must achieve 100% autonomy');
  });

  // ── Test 10: Markdown Report Generation & Core Question Analysis (§21, §22) ──
  await suite.test('Test 10: Markdown Report Generator & Core Autonomy Analysis (§21 & §22)', async () => {
    const engine = new Phase20LiveBenchmarkEngine({
      hostId: 'WINDOWS-HOST-REPORT',
      simulateInterventions: true,
    });

    const metrics = await engine.runBenchmark(PHASE_20_REAL_TASK_CATALOG);
    const records = engine.getExecutionRecords();

    const markdown = Phase20ReportGenerator.generateMarkdownReport(metrics, records);
    assert.ok(markdown.includes('# KDI — LIVE OPERATIONS BENCHMARK REPORT'));
    assert.ok(markdown.includes('Autonomy Rate:'));
    assert.ok(markdown.includes('SIMMACI'));
    assert.ok(markdown.includes('ILMORA'));
    assert.ok(markdown.includes('KDI'));
    assert.ok(markdown.includes('SIMMACI-P20-01'));
    assert.ok(markdown.includes('THE CORE ANSWER: AUTONOMY REALITY'));

    // Write report artifact
    const reportPath = path.join(wsRoot, 'PHASE_20_LIVE_OPERATIONS_BENCHMARK_REPORT.md');
    fs.writeFileSync(reportPath, markdown, 'utf8');
    assert.ok(fs.existsSync(reportPath));
  });
});
