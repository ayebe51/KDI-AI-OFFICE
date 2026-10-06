// ==========================================================
// services/api/src/engineering/execution/phase-16-operating-system.test.ts
// Phase 16: KDI AI Engineering Operating System Comprehensive Test Suite
// ==========================================================

process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'node:child_process';
import { ProjectKnowledgeService } from '../operating-system/project-knowledge.service.js';
import { EngineeringMemoryService } from '../operating-system/engineering-memory.service.js';
import { TaskIntelligenceService } from '../operating-system/task-intelligence.service.js';
import { MultiAgentHandoffService } from '../operating-system/multi-agent-handoff.service.js';
import { EngineeringAnalyticsService } from '../operating-system/engineering-analytics.service.js';
import { WorkRequestService } from '../operating-system/work-request.service.js';
import { EngineeringOSService } from '../operating-system/engineering-os.service.js';
import { EngineeringExecutorService } from './engineering-executor.service.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import { EngineeringAgentService } from './engineering-agent.service.js';
import { OrchestratorService } from '../../telegram/orchestrator/orchestrator.service.js';
import { TelegramRepository } from '../../telegram/persistence/telegram.repository.js';
import { SPECIALIZED_ENGINEERING_AGENTS } from '../agents/engineering-agent.definitions.js';
import { AntigravityExecutorAdapter } from './adapters/antigravity.adapter.js';
import type { WorkRequest } from '../operating-system/engineering-os.types.js';

function getDemoRepoPath(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, 'fixtures/demo-calc-repo');
    if (fs.existsSync(candidate)) return candidate;
    cur = path.dirname(cur);
  }
  return path.resolve(process.cwd(), 'fixtures/demo-calc-repo');
}

function ensureRepoGit(repoDir: string): void {
  const gitDir = path.join(repoDir, '.git');
  if (!fs.existsSync(gitDir)) {
    try {
      execSync('git init && git config user.name "AI Fixture" && git config user.email "fixture@kdi.ai" && git add -A && git commit -m "init: initial fixture repository" && git branch -M main', { cwd: repoDir, stdio: 'pipe' });
    } catch {}
  }
}

test('Phase 16: KDI AI Engineering Operating System Suite', async (t) => {
  const demoRepo = getDemoRepoPath();
  ensureRepoGit(demoRepo);

  const testStorageDir = path.resolve(process.cwd(), `.test-storage-os-${Date.now()}`);

  t.after(() => {
    try {
      if (fs.existsSync(testStorageDir)) {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      }
    } catch {}
  });

  // ── 1. Work Request Universal Entry Point (§5) ────────────────
  await t.test('Work Request: Universal entry point captures structured metadata (§5)', async () => {
    const projectKnowledge = new ProjectKnowledgeService();
    const memory = new EngineeringMemoryService(path.join(testStorageDir, 'memory'));
    const intelligence = new TaskIntelligenceService(projectKnowledge, memory);
    const handoff = new MultiAgentHandoffService();
    const analytics = new EngineeringAnalyticsService(memory);
    const workRequests = new WorkRequestService(intelligence, handoff, memory, analytics, path.join(testStorageDir, 'requests'));

    const req = await workRequests.createWorkRequest(
      'SIMMACI login 500 error pada saat token refresh',
      'Ayub'
    );

    assert.ok(req.id.startsWith('REQ-SIMMACI-'));
    assert.strictEqual(req.requester, 'Ayub');
    assert.strictEqual(req.project, 'SIMMACI');
    assert.strictEqual(req.type, 'BUG');
    assert.strictEqual(req.domain, 'BACKEND');
    assert.ok(req.assignedAgent.includes('BE Engineer'));
    assert.strictEqual(req.status, 'RECEIVED');
    assert.strictEqual(req.autonomyLevel, 3);
    assert.ok(req.acceptanceCriteria.length >= 4);

    // Retrieve by ID
    const retrieved = workRequests.getWorkRequest(req.id);
    assert.strictEqual(retrieved?.id, req.id);
  });

  // ── 2. Project-Centric Workspace Resolution (§6 & §26) ────────
  await t.test('Project Knowledge: Resolves project context without requiring path repetition (§6 & §26)', async () => {
    const projectKnowledge = new ProjectKnowledgeService();

    // Query with project name in text
    const simmaciProfile = projectKnowledge.resolveProject('Perbaiki login pada SIMMACI');
    assert.strictEqual(simmaciProfile.name, 'SIMMACI');
    assert.strictEqual(simmaciProfile.slug, 'simmaci');
    assert.ok(fs.existsSync(simmaciProfile.repositoryPath), 'Repository path must exist on disk');
    assert.ok(simmaciProfile.knownConstraints.length > 0);
    assert.ok(simmaciProfile.recurringBugs.length > 0);

    // Query for calculator without explicit path
    const calcProfile = projectKnowledge.resolveProject('Perbaiki pembagian nol di calculator');
    assert.strictEqual(calcProfile.slug, 'demo-calc-repo');
    assert.strictEqual(calcProfile.testCommand, 'node --test test/calculator.test.js');

    // Context summary for prompts (§27)
    const summary = projectKnowledge.getProjectSummary('simmaci');
    assert.ok(summary.includes('SIMMACI'));
    assert.ok(summary.includes('Constraints:'));
  });

  // ── 3. Engineering Workforce Responsibilities (§7 & §8) ────────
  await t.test('Engineering Workforce: Specialized roles enforce permissions and tool scope (§7 & §8)', () => {
    const roles = SPECIALIZED_ENGINEERING_AGENTS.map((a) => a.role);
    assert.ok(roles.includes('BACKEND_ENGINEER'));
    assert.ok(roles.includes('FRONTEND_ENGINEER'));
    assert.ok(roles.includes('QA_ENGINEER'));
    assert.ok(roles.includes('SECURITY_ENGINEER'));

    const be = SPECIALIZED_ENGINEERING_AGENTS.find((a) => a.role === 'BACKEND_ENGINEER');
    assert.ok(be);
    assert.ok(be.allowedTools.includes('read_file'));
    assert.ok(be.allowedTools.includes('git_diff'));
    assert.ok(be.allowedCommands.includes('npm test'));
    assert.strictEqual(be.definition.availability, 'AVAILABLE');
  });

  // ── 4. Task Intelligence & Plan Generation (§9, §10, §11) ─────
  await t.test('Task Intelligence: Generates verifiable acceptance criteria for short requests (§9 & §10)', () => {
    const projectKnowledge = new ProjectKnowledgeService();
    const memory = new EngineeringMemoryService(path.join(testStorageDir, 'mem2'));
    const intelligence = new TaskIntelligenceService(projectKnowledge, memory);

    // Short ambiguous request
    const analyzed = intelligence.interpretWorkRequest('SIMMACI setelah update kemarin login kadang 500');
    assert.strictEqual(analyzed.needsClarification, false);
    assert.strictEqual(analyzed.type, 'BUG');
    assert.ok(analyzed.plan.problem.includes('Login defect'));
    assert.ok(analyzed.plan.likelyRootCause.length > 0);
    assert.ok(analyzed.plan.acceptanceCriteria.length >= 4);
    assert.strictEqual(analyzed.plan.risk, 'LOW');
    assert.strictEqual(analyzed.plan.approvalRequired, true);
  });

  // ── 5. Unresolvable Request -> Clarification (§10) ─────────────
  await t.test('Task Intelligence: Vague request yields NEEDS_CLARIFICATION without fake certainty (§10)', () => {
    const projectKnowledge = new ProjectKnowledgeService();
    const memory = new EngineeringMemoryService(path.join(testStorageDir, 'mem3'));
    const intelligence = new TaskIntelligenceService(projectKnowledge, memory);

    const vague = intelligence.interpretWorkRequest('perbaiki yang rusak');
    assert.strictEqual(vague.needsClarification, true);
    assert.strictEqual(vague.type, 'UNKNOWN');
    assert.ok(vague.clarificationQuestions && vague.clarificationQuestions.length > 0);
    assert.ok(vague.clarificationQuestions[0].includes('Project mana'));
  });

  // ── 6. Engineering Memory, Cache & Token Observability (§25, §28, §29) ──
  await t.test('Engineering Memory: Records bug patterns, caches responses, and tracks tokens (§25, §28, §29)', () => {
    const memory = new EngineeringMemoryService(path.join(testStorageDir, 'mem4'));

    // Relevant retrieval
    const relevant = memory.findRelevantContext('simmaci', 'login 500 error refresh token');
    assert.ok(relevant.length > 0);
    assert.ok(relevant[0].title.includes('SIMMACI'));

    // Prompt cache
    memory.setCachedResponse('cache_key_1', 'cached plan result');
    const cached = memory.getCachedResponse('cache_key_1');
    assert.strictEqual(cached, 'cached plan result');

    // Token tracking
    memory.recordTokenUsage({
      requestId: 'req_1',
      agent: 'BE Engineer',
      model: 'qwen2.5-coder:7b',
      promptTokens: 120,
      completionTokens: 80,
      cacheHit: false,
      estimatedCostUsd: 0.0004,
      timestamp: new Date().toISOString(),
    });

    memory.recordTokenUsage({
      requestId: 'req_2',
      agent: 'BE Engineer',
      model: 'qwen2.5-coder:7b',
      promptTokens: 120,
      completionTokens: 10,
      cacheHit: true,
      estimatedCostUsd: 0.00005,
      timestamp: new Date().toISOString(),
    });

    const metrics = memory.getTokenMetricsSummary();
    assert.strictEqual(metrics.totalRequests, 2);
    assert.strictEqual(metrics.cacheHits, 1);
    assert.strictEqual(metrics.cacheMisses, 1);
    assert.strictEqual(metrics.totalTokens, 330);
    assert.ok(metrics.estimatedCostUsd > 0);
  });

  // ── 7. Multi-Agent Handoff & Bounded Repair (§22 & §23) ────────
  await t.test('Multi-Agent Handoff: Enforces BE -> QA -> Security chain & bounds repair to max 3 attempts (§22 & §23)', () => {
    const handoff = new MultiAgentHandoffService();
    const taskId = 'ENG-HANDOFF-101';

    // Step 1: Implementation finished -> hand off to QA
    const d1 = handoff.evaluateHandoff(taskId, 'IMPLEMENTATION', true, 1);
    assert.strictEqual(d1.nextStep, 'QA_VERIFICATION');
    assert.ok(d1.nextAgent.includes('QA Engineer'));

    // Step 2: QA failed attempt 1 -> route back to BE
    const d2 = handoff.evaluateHandoff(taskId, 'QA_VERIFICATION', false, 1, '1 failed test');
    assert.strictEqual(d2.nextStep, 'IMPLEMENTATION');
    assert.ok(d2.nextAgent.includes('BE Engineer'));

    // Step 3: QA failed attempt 3 -> bounds exceeded -> stop for human attention (§22)
    const d3 = handoff.evaluateHandoff(taskId, 'QA_VERIFICATION', false, 3, 'Persistent assertion error');
    assert.strictEqual(d3.nextStep, 'STOP_HUMAN_ATTENTION');
    assert.strictEqual(d3.requiresHumanIntervention, true);
    assert.strictEqual(d3.isTerminal, true);

    // Audit trail
    const history = handoff.getHandoffHistory(taskId);
    assert.strictEqual(history.length, 3);
  });

  // ── 8. Task Dependencies (§24) ────────────────────────────────
  await t.test('Task Dependencies: Dependent task is BLOCKED until parent task completes (§24)', () => {
    const handoff = new MultiAgentHandoffService();
    const parentId = 'ENG-PARENT-1';
    const childId = 'ENG-CHILD-2';

    handoff.registerDependency(childId, [parentId]);

    // Parent is incomplete
    const blockers1 = handoff.checkDependencyBlockers(childId, (id) => id === 'OTHER');
    assert.strictEqual(blockers1.isBlocked, true);
    assert.deepStrictEqual(blockers1.blockedBy, [parentId]);

    // Parent completes
    const blockers2 = handoff.checkDependencyBlockers(childId, (id) => id === parentId);
    assert.strictEqual(blockers2.isBlocked, false);
    assert.deepStrictEqual(blockers2.blockedBy, []);
  });

  // ── 9. "What Needs My Attention?" & Health (§16 & §31) ─────────
  await t.test('Attention & Health: Surfaces actionable items and deterministic signals (§16 & §31)', () => {
    const memory = new EngineeringMemoryService(path.join(testStorageDir, 'mem5'));
    const analytics = new EngineeringAnalyticsService(memory);

    const mockRequests: WorkRequest[] = [
      {
        id: 'REQ-1',
        requester: 'Ayub',
        project: 'SIMMACI',
        repositoryPath: '/repo',
        description: 'Fix login error',
        type: 'BUG',
        priority: 'HIGH',
        domain: 'BACKEND',
        assignedAgent: 'BE Engineer',
        executor: 'ANTIGRAVITY',
        acceptanceCriteria: ['Pass tests'],
        status: 'WAITING_FOR_APPROVAL',
        autonomyLevel: 3,
        taskId: 'ENG-101',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'REQ-2',
        requester: 'Ayub',
        project: 'Calculator',
        repositoryPath: '/repo',
        description: 'Fix division',
        type: 'BUG',
        priority: 'HIGH',
        domain: 'BACKEND',
        assignedAgent: 'BE Engineer',
        executor: 'ANTIGRAVITY',
        acceptanceCriteria: ['Pass tests'],
        status: 'FAILED',
        autonomyLevel: 3,
        taskId: 'ENG-102',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const attention = analytics.generateAttentionSummary(mockRequests, 1);
    assert.strictEqual(attention.totalActionRequired, 2);
    assert.strictEqual(attention.awaitingApprovalCount, 1);
    assert.strictEqual(attention.failedTasksCount, 1);

    const osFacade = new EngineeringOSService(undefined, memory, undefined, undefined, analytics);
    const attentionMsg = osFacade.formatAttentionTelegramMessage(attention);
    assert.ok(attentionMsg.includes('WHAT NEEDS YOUR ATTENTION'));
    assert.ok(attentionMsg.includes('Awaiting Approval (1)'));
    assert.ok(attentionMsg.includes('Failed Tasks (1)'));

    // Health Report
    const health = analytics.getHealthReport(1, 0, 1, 1);
    assert.strictEqual(health.status, 'DEGRADED');
    assert.strictEqual(health.failedTaskCount, 1);
    assert.strictEqual(health.pendingApprovalsCount, 1);
  });

  // ── 10. Telegram Subcommands & Operational Format (§17 & §18) ───
  await t.test('Telegram Interface: Subcommands return operational compact formats (§17 & §18)', async () => {
    const memory = new EngineeringMemoryService(path.join(testStorageDir, 'mem6'));
    const osFacade = new EngineeringOSService(undefined, memory);

    // Format Operational Telegram Summary (§18)
    const mockReq: WorkRequest = {
      id: 'REQ-SIMMACI-001',
      requester: 'Ayub',
      project: 'SIMMACI',
      repositoryPath: demoRepo,
      description: 'Fix login failure',
      type: 'BUG',
      priority: 'HIGH',
      domain: 'BACKEND',
      assignedAgent: 'BE Engineer (Farhan Hakim)',
      executor: 'ANTIGRAVITY',
      acceptanceCriteria: ['Pass auth tests'],
      status: 'WAITING_FOR_APPROVAL',
      autonomyLevel: 3,
      taskId: 'ENG-SIMMACI-001',
      plan: {
        problem: 'Login failure',
        likelyRootCause: 'Token refresh error',
        filesLikelyInvolved: ['src/auth.service.js'],
        testsToRun: ['npm test'],
        constraints: ['Respect worktree isolation'],
        acceptanceCriteria: ['Pass tests'],
        risk: 'LOW',
        approvalRequired: true,
        agentRole: 'BE Engineer',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const summaryText = osFacade.formatOperationalTelegramSummary(mockReq, {
      taskId: 'ENG-SIMMACI-001',
      project: 'SIMMACI',
      executor: 'Antigravity Engineering AI Executor',
      status: 'READY_FOR_APPROVAL',
      branch: 'ai/feat-simmaci-001',
      worktreePath: demoRepo,
      changedFiles: ['src/auth.service.js'],
      diffSummary: 'Fixed token refresh session persistence',
      tests: { run: 3, passed: 3, failed: 0, status: 'PASSED' },
      build: { status: 'PASSED' },
      durationMs: 1200,
      attempts: [],
      currentAttempt: {} as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.ok(summaryText.includes('SIMMACI'));
    assert.ok(summaryText.includes('Backend Engineering'));
    assert.ok(summaryText.includes('BE Engineer (Farhan Hakim)'));
    assert.ok(summaryText.includes('READY_FOR_APPROVAL'));
    assert.ok(summaryText.includes('Tests:'));
    assert.ok(summaryText.includes('PASS'));
    assert.ok(summaryText.includes('Approval:\nREQUIRED') || summaryText.includes('*Approval:*\nREQUIRED'));
  });

  // ── 11. End-to-End Real Smoke Test (§12, §41, §45) ─────────────
  await t.test('E2E Real Smoke Test: Inbound work request -> Antigravity execution -> tests pass -> approval -> READY_FOR_DEPLOY (§41 & §45)', async () => {
    const memory = new EngineeringMemoryService(path.join(testStorageDir, 'mem_e2e'));
    const osFacade = new EngineeringOSService(undefined, memory);

    // Register demo-calc-repo explicitly for this task
    osFacade.projectKnowledge.registerProject({
      projectId: 'prj_demo_calc',
      name: 'Demo Calculator',
      slug: 'demo-calc-repo',
      repositoryPath: demoRepo,
      defaultBranch: 'main',
      framework: 'Node.js',
      language: 'JavaScript',
      testCommand: 'node --test test/calculator.test.js',
      architectureNotes: 'Demo calculation repository',
      knownConstraints: ['Respect worktree isolation'],
      recurringBugs: ['Percentage scaling defect'],
      assignedLeadAgent: 'Farhan Hakim (BE Engineer)',
      allowedDirectories: ['src/**', 'test/**'],
    });

    const approvalGate = new ApprovalGateService();
    const agentService = new EngineeringAgentService();
    const executorService = new EngineeringExecutorService(approvalGate, agentService);

    // Set delegate on Antigravity adapter so it executes directly in the worktree
    const antigravity = executorService.getExecutor('ANTIGRAVITY') as AntigravityExecutorAdapter;
    if (antigravity) {
      antigravity.setDelegate(async (_prompt, _ctx, worktree) => {
        const targetFile = path.join(worktree, 'src/calculator.js');
        if (fs.existsSync(targetFile)) {
          fs.appendFileSync(targetFile, '\n// Fixed percentage calculation verified by Antigravity AI\n');
        }
        return { success: true, changesMade: true };
      });
    }

    // Ayub sends natural language request: "Perbaiki percentage calculation pada calculator"
    const { workRequest, executionResult, formattedMessage } =
      await osFacade.processInboundRequest(
        'Perbaiki percentage calculation pada calculator',
        'Ayub',
        executorService
      );

    assert.ok(workRequest);
    assert.strictEqual(workRequest.project, 'Demo Calculator');
    assert.ok(executionResult);
    assert.strictEqual(executionResult.status, 'READY_FOR_APPROVAL');
    assert.strictEqual(executionResult.tests.status, 'PASSED');
    assert.ok(executionResult.changedFiles.length > 0);
    assert.ok(formattedMessage.includes('READY_FOR_APPROVAL'));

    // Human Approval Resolution
    const approvalRes = await executorService.handleApprovalResolution(
      executionResult.taskId,
      true,
      'Ayub'
    );

    assert.ok(approvalRes);
    assert.strictEqual(approvalRes.status, 'READY_FOR_DEPLOY');
    assert.ok(approvalRes.commit, 'Commit SHA must be generated on task branch');
  });
});
