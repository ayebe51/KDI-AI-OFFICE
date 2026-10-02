// ==========================================================
// services/api/src/engineering/execution/phase-15-3-real-workforce.test.ts
// Phase 15.3: Real AI Engineering Workforce Execution Test Suite
// ==========================================================

process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'node:child_process';
import { CommandPolicyEngine } from './command-policy.engine.js';
import { GitWorkspaceAdapter } from './adapters/git-workspace.adapter.js';
import { AntigravityExecutorAdapter } from './adapters/antigravity.adapter.js';
import { CodingWorkerAdapter } from './adapters/coding-worker.adapter.js';
import { EngineeringCodingWorker } from './coding-worker.service.js';
import { AcceptanceCriteriaEngine } from './acceptance-criteria.engine.js';
import { EngineeringAgentService } from './engineering-agent.service.js';
import { EngineeringExecutorService } from './engineering-executor.service.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import type { EngineeringTaskContext } from './engineering-execution.types.js';

function ensureAiRepoGit(aiRepo: string): void {
  const gitDir = path.join(aiRepo, '.git');
  if (!fs.existsSync(gitDir)) {
    try {
      execSync('git init && git config user.name "AI Fixture" && git config user.email "fixture@kdi.ai" && git add -A && git commit -m "init: initial fixture repository with deliberate auth bug" && git branch -M main', { cwd: aiRepo, stdio: 'pipe' });
    } catch {}
  }
}

function getAiRepoPath(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, 'fixtures/ai-engineering-repo');
    if (fs.existsSync(candidate)) {
      ensureAiRepoGit(candidate);
      return candidate;
    }
    cur = path.dirname(cur);
  }
  const fallback = path.resolve(process.cwd(), 'fixtures/ai-engineering-repo');
  ensureAiRepoGit(fallback);
  return fallback;
}

function getDemoRepoPath(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, 'fixtures/demo-calc-repo');
    if (fs.existsSync(candidate)) return candidate;
    cur = path.dirname(cur);
  }
  return path.resolve(process.cwd(), 'fixtures/demo-calc-repo');
}

test('Phase 15.3: Real AI Engineering Workforce Execution Suite', async (suite) => {
  const aiRepo = getAiRepoPath();
  const demoRepo = getDemoRepoPath();

  assert.ok(fs.existsSync(aiRepo), `ai-engineering-repo fixture must exist at ${aiRepo}`);
  assert.ok(fs.existsSync(demoRepo), `demo-calc-repo fixture must exist at ${demoRepo}`);

  // ==========================================================
  // 1. REPOSITORY UNDERSTANDING & GENUINE INSPECTION (§6)
  // ==========================================================

  await suite.test('Inspection: Genuinely inspects repository structure and tooling without fabrication', async () => {
    const worker = new EngineeringCodingWorker();
    const inspection = await worker.inspectRepository(aiRepo);

    assert.strictEqual(inspection.packageManager, 'npm');
    assert.strictEqual(inspection.language, 'JavaScript');
    assert.strictEqual(inspection.testScriptFound, true);
    assert.strictEqual(inspection.testFramework, 'node:test');
    assert.ok(inspection.entryPoints.includes('src/auth.service.js'));
    assert.ok(inspection.existingTests.some((t) => t.includes('auth.test.js')));
    assert.ok(inspection.totalFiles >= 2);
  });

  // ==========================================================
  // 2. TASK DECOMPOSITION & WORKFORCE SPECIALIZATION (§7 & §16)
  // ==========================================================

  await suite.test('Decomposition: Role-aware planning differentiates Backend, Frontend, QA & Security agents', async () => {
    const worker = new EngineeringCodingWorker();
    const inspection = await worker.inspectRepository(aiRepo);

    // Backend Engineer Decomposition
    const beContext: EngineeringTaskContext = {
      taskId: 'ENG-BE-1',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: aiRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (BE Engineer)',
      title: 'Perbaiki bug autentikasi login SIMMACI',
      description: 'Token refresh flow fails to persist session state',
      acceptanceCriteria: ['Login succeeds with valid credentials', 'Refresh token flow remains functional'],
      constraints: ['Work only in isolated worktree'],
      branch: 'fix/simmaci-auth-be',
      executor: 'CODING_WORKER',
      timeout: 30000,
      environment: {},
      requestedBy: 'Owner',
    };

    const bePlan = worker.decomposeTask(beContext, inspection);
    assert.strictEqual(bePlan.agentRole, 'BACKEND');
    assert.ok(bePlan.likelyRootCause.includes('Authentication') || bePlan.likelyRootCause.includes('token'));
    assert.ok(bePlan.filesExpectedToChange.some((f) => f.includes('auth')));

    // Security Engineer Decomposition
    const secContext: EngineeringTaskContext = {
      ...beContext,
      agent: 'SECURITY_ENGINEER',
      domain: 'SECURITY',
      agentName: 'Rizki Purnama (Security Engineer)',
      title: 'Audit token validation and secret leakage',
    };
    const secPlan = worker.decomposeTask(secContext, inspection);
    assert.ok(secPlan.likelyRootCause.includes('Security'));

    // QA Engineer Decomposition
    const qaContext: EngineeringTaskContext = {
      ...beContext,
      agent: 'QA_ENGINEER',
      domain: 'QA',
      agentName: 'Siti Rahayu (QA Engineer)',
      title: 'Regression test coverage for auth endpoints',
    };
    const qaPlan = worker.decomposeTask(qaContext, inspection);
    assert.ok(qaPlan.likelyRootCause.includes('QA'));
  });

  // ==========================================================
  // 3. MACHINE-READABLE ACCEPTANCE CRITERIA ENGINE (§13)
  // ==========================================================

  await suite.test('AcceptanceEngine: Evaluates criteria into PASS, FAIL, UNKNOWN with evidence', () => {
    const engine = new AcceptanceCriteriaEngine();

    const mockContext: EngineeringTaskContext = {
      taskId: 'ENG-AC-1',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: aiRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Fix auth bug',
      description: 'Fix auth bug',
      acceptanceCriteria: [
        'Automated test suite must pass without regressions',
        'No secret files are modified',
        'Refresh token flow remains functional',
      ],
      constraints: ['DO NOT CHANGE: database schema'],
      branch: 'fix/ac-1',
      executor: 'CODING_WORKER',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    // Scenario A: Passing tests & clean diff
    const passTest = { run: 3, passed: 3, failed: 0, output: '3 passed', status: 'PASSED' as const };
    const passDiff = { diff: '+ code', summary: '1 file changed' };
    const passChanged = ['src/auth.service.js'];

    const passEval = engine.evaluate(mockContext, passTest, passDiff, passChanged, true);
    assert.strictEqual(passEval.allSatisfied, true);
    assert.strictEqual(passEval.failedCount, 0);
    assert.strictEqual(passEval.passedCount, 3);
    assert.strictEqual(passEval.evaluations[0].status, 'PASS');
    assert.strictEqual(passEval.evaluations[1].status, 'PASS');

    // Scenario B: Test failure triggers FAIL status
    const failTest = { run: 3, passed: 2, failed: 1, output: '1 failed test', status: 'FAILED' as const };
    const failEval = engine.evaluate(mockContext, failTest, passDiff, passChanged, true);
    assert.strictEqual(failEval.allSatisfied, false);
    assert.ok(failEval.failedCount >= 1);
    assert.strictEqual(failEval.evaluations[0].status, 'FAIL');

    // Scenario C: Prohibited secret file triggers FAIL status
    const secChanged = ['src/auth.service.js', '.env'];
    const secEval = engine.evaluate(mockContext, passTest, passDiff, secChanged, true);
    assert.strictEqual(secEval.allSatisfied, false);
    assert.ok(secEval.blockers.some((b) => b.includes('.env')));
  });

  // ==========================================================
  // 4. BOUNDED ITERATIVE REPAIR LOOP (§9)
  // ==========================================================

  await suite.test('RepairLoop: Iteratively repairs failure, tracks attempt history, and succeeds (§9)', async () => {
    const service = new EngineeringExecutorService();

    let attemptsExecuted = 0;
    const worker = new EngineeringCodingWorker();

    // Delegate simulating: Attempt 1 fails tests, Attempt 2 fixes code and passes tests
    worker.setDelegate(async (_ctx, worktree, attemptNumber) => {
      attemptsExecuted++;
      const target = path.join(worktree, 'src/calculator.js');

      if (attemptNumber === 1) {
        // Deliberately introduce bad code on attempt 1
        if (fs.existsSync(target)) {
          fs.writeFileSync(target, 'throw new Error("Syntax error on attempt 1");', 'utf-8');
        }
        return { success: true, changesMade: true };
      }

      // Fix cleanly on attempt 2
      if (fs.existsSync(target)) {
        fs.writeFileSync(
          target,
          `export class Calculator {\n  add(a, b) { return a + b; }\n  subtract(a, b) { return a - b; }\n  multiply(a, b) { return a * b; }\n  divide(a, b) { if (b === 0) throw new Error('DIVISION_BY_ZERO'); return a / b; }\n  percentage(part, total) { if (total === 0) return 0; return (part / total) * 100; }\n}\n`,
          'utf-8'
        );
      }
      return { success: true, changesMade: true };
    });

    const codingAdapter = new CodingWorkerAdapter(new GitWorkspaceAdapter(), worker);
    service.registerExecutor('REPAIR_TEST_EXECUTOR', codingAdapter);

    const context: EngineeringTaskContext = {
      taskId: `ENG-LOOP-${Date.now()}`,
      project: 'DEMO-CALC',
      repository: 'demo-calc-repo',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (BE Engineer)',
      title: 'Fix calculator methods through repair loop',
      description: 'Repair defective operations',
      acceptanceCriteria: ['Automated test suite must pass without regressions'],
      constraints: [],
      branch: `fix/repair-loop-${Date.now().toString(36)}`,
      executor: 'REPAIR_TEST_EXECUTOR',
      timeout: 30000,
      environment: {},
      requestedBy: 'Owner',
      maxAttempts: 3,
    };

    const result = await service.executeTask(context);

    // Assert that the bounded repair loop succeeded on attempt 2
    assert.strictEqual(result.status, 'READY_FOR_APPROVAL');
    assert.strictEqual(result.attempts.length, 2, 'Should preserve both attempt 1 and attempt 2 in attempts history');
    assert.strictEqual(result.attempts[0].attemptNumber, 1);
    assert.strictEqual(result.attempts[0].status, 'TEST_FAILED'); // Attempt 1 recorded as TEST_FAILED
    assert.strictEqual(result.attempts[1].attemptNumber, 2);
    assert.strictEqual(result.attempts[1].status, 'READY_FOR_APPROVAL'); // Attempt 2 passed cleanly
    assert.strictEqual(result.currentAttempt.attemptNumber, 2);
    assert.ok(result.tests.passed >= 1);

    await service.cancelTask(result.taskId);
  });

  // ==========================================================
  // 5. REAL REPOSITORY SMOKE TEST ON AI FIXTURE (§19)
  // ==========================================================

  await suite.test('Real Smoke Test: AI Workforce modifies real files, executes real tests & reaches READY_FOR_APPROVAL', async () => {
    const approvalGate = new ApprovalGateService();
    const service = new EngineeringExecutorService(approvalGate);

    const taskId = `ENG-SMOKE-${Date.now()}`;
    const branchName = `ai/eng/task-${Date.now().toString(36)}`;

    const context: EngineeringTaskContext = {
      taskId,
      project: 'SIMMACI',
      repository: 'ai-engineering-repo',
      repositoryPath: aiRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (Backend Engineer)',
      title: 'Perbaiki bug autentikasi login pada SIMMACI',
      description: 'Token refresh flow fails to persist session state in auth.service.js',
      acceptanceCriteria: [
        'Login succeeds with valid credentials',
        'Invalid credentials remain rejected',
        'Refresh token flow remains functional',
        'No secret files are modified',
      ],
      constraints: [
        'Work only inside assigned isolated worktree',
        'Do not modify production branches directly',
        'DO NOT CHANGE: package.json',
      ],
      branch: branchName,
      executor: 'CODING_WORKER',
      timeout: 30000,
      environment: {},
      requestedBy: 'Budi (Owner)',
      maxAttempts: 3,
    };

    // ── 1. Execute task through AI Workforce Execution Bridge ─────
    const result = await service.executeTask(context);

    // ── 2. Real File Modification Evidence (§8) ──────────────────
    assert.strictEqual(result.status, 'READY_FOR_APPROVAL');
    assert.ok(result.worktreePath, 'Worktree path must be populated');
    assert.ok(fs.existsSync(result.worktreePath), 'Isolated worktree must exist on disk');

    const modifiedAuthPath = path.join(result.worktreePath, 'src/auth.service.js');
    assert.ok(fs.existsSync(modifiedAuthPath), 'src/auth.service.js must exist in worktree');
    const modifiedContent = fs.readFileSync(modifiedAuthPath, 'utf-8');
    assert.ok(
      modifiedContent.includes('tok_refreshed_') || modifiedContent.includes('refreshedAt'),
      'Real file must be modified with actual bug fix'
    );

    // ── 3. Real Test Execution Evidence (§10) ────────────────────
    assert.strictEqual(result.tests.status, 'PASSED');
    assert.ok(result.tests.passed >= 3, 'All 3 tests must pass after bug fix');
    assert.strictEqual(result.tests.failed, 0);

    // ── 4. Real Git Diff & Changed Files Evidence (§8) ───────────
    assert.ok(result.changedFiles.length >= 1);
    assert.ok(result.changedFiles.some((f) => f.includes('auth.service.js')));
    assert.ok(result.diffSummary.length > 0);

    // ── 5. AI Engineering Supervisor Review Evidence (§12 & §13) ─
    assert.ok(result.currentAttempt.reviewResult);
    assert.strictEqual(result.currentAttempt.reviewResult?.passed, true);
    assert.strictEqual(result.currentAttempt.reviewResult?.reviewer, 'Farhan Hakim (Backend Engineer)');
    assert.ok(result.currentAttempt.reviewResult?.acceptanceCriteriaResults);
    assert.ok(
      result.currentAttempt.reviewResult!.acceptanceCriteriaResults!.every((c) => c.status === 'PASS'),
      'All acceptance criteria must be evaluated as PASS'
    );

    // ── 6. Approval Gate & Boundary Protection (§18) ──────────────
    assert.ok(result.approvalId, 'Must generate approvalId at approval boundary');
    const pendingApproval = approvalGate.getApproval(result.approvalId!);
    assert.ok(pendingApproval);
    assert.strictEqual(pendingApproval.status, 'PENDING');

    // ── 7. Explicit Human Approval -> Commit -> READY_FOR_DEPLOY ─
    const approvedResult = await service.handleApprovalResolution(taskId, true, 'Budi (Owner)');
    assert.ok(approvedResult);
    assert.strictEqual(approvedResult.status, 'READY_FOR_DEPLOY');
    assert.ok(approvedResult.commit, 'Commit SHA must be generated on task branch');

    // ── 8. Rich Telegram Formatting Evidence (§17) ───────────────
    const telegramText = service.formatTelegramSummary(approvedResult);
    assert.match(telegramText, /SIMMACI — Engineering Execution/);
    assert.match(telegramText, /READY_FOR_DEPLOY/);
    assert.match(telegramText, /\*Tests:\*\s*PASSED/);

    // ── 9. Verification that Original Repo was NOT modified (§5) ──
    const originalAuthContent = fs.readFileSync(path.join(aiRepo, 'src/auth.service.js'), 'utf-8');
    assert.ok(
      originalAuthContent.includes('// BUG: Missing session persistence, returns null'),
      'Original protected repository path must remain untouched'
    );

    // Cleanup
    await service.cancelTask(taskId);
  });

  // ==========================================================
  // 6. NO-FAKE-EXECUTION TESTS (§20)
  // ==========================================================

  await suite.test('NoFake: EXECUTOR_UNAVAILABLE returned honestly when runtime is missing', async () => {
    const origPath = process.env.ANTIGRAVITY_CLI_PATH;
    process.env.ANTIGRAVITY_CLI_PATH = '__UNAVAILABLE__';
    try {
      const service = new EngineeringExecutorService();
      // ANTIGRAVITY without CLI in PATH or delegate must return EXECUTOR_UNAVAILABLE
      const context: EngineeringTaskContext = {
        taskId: 'ENG-NOFAKE-1',
        project: 'SIMMACI',
        repository: 'SIMMACI',
        repositoryPath: demoRepo,
        taskType: 'BUG',
        domain: 'BACKEND',
        agent: 'BE_ENGINEER',
        agentName: 'Farhan Hakim',
        title: 'Honest unavailable runtime check',
        description: 'Verify no fake success when executor is missing',
        acceptanceCriteria: ['Tests pass'],
        constraints: [],
        branch: 'fix/nofake-probe',
        executor: 'ANTIGRAVITY',
        timeout: 10000,
        environment: {},
        requestedBy: 'Owner',
      };

      const res = await service.executeTask(context);
      assert.ok(
        res.status === 'EXECUTOR_UNAVAILABLE' || res.status === 'ANTIGRAVITY_UNAVAILABLE',
        `Expected EXECUTOR_UNAVAILABLE or ANTIGRAVITY_UNAVAILABLE, got ${res.status}`
      );
      assert.ok(res.error?.includes('unavailable') || res.error?.includes('not found'));
      assert.strictEqual(res.changedFiles.length, 0);
    } finally {
      if (origPath !== undefined) process.env.ANTIGRAVITY_CLI_PATH = origPath;
      else delete process.env.ANTIGRAVITY_CLI_PATH;
    }
  });

  await suite.test('NoFake: TEST_FAILED returned when test assertions fail', async () => {
    const service = new EngineeringExecutorService();

    const worker = new EngineeringCodingWorker();
    worker.setDelegate(async (_ctx, worktree) => {
      // Intentionally break calculator so test fails
      const target = path.join(worktree, 'src/calculator.js');
      if (fs.existsSync(target)) {
        fs.writeFileSync(target, 'export class Calculator { add() { return -999; } }', 'utf-8');
      }
      return { success: true, changesMade: true };
    });

    const mockAdapter = new CodingWorkerAdapter(new GitWorkspaceAdapter(), worker);
    service.registerExecutor('MOCK_TEST_FAIL', mockAdapter);

    const context: EngineeringTaskContext = {
      taskId: 'ENG-NOFAKE-2',
      project: 'DEMO-CALC',
      repository: 'demo-calc-repo',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Failing tests task',
      description: 'Simulate persistent test failure',
      acceptanceCriteria: ['Tests pass cleanly'],
      constraints: [],
      branch: 'fix/nofake-test-fail',
      executor: 'MOCK_TEST_FAIL',
      timeout: 15000,
      environment: {},
      requestedBy: 'Owner',
      maxAttempts: 1,
    };

    const res = await service.executeTask(context);
    assert.strictEqual(res.status, 'TEST_FAILED');
    assert.ok(res.error?.includes('Test suite failed'));
    assert.notStrictEqual(res.status, 'READY_FOR_APPROVAL');

    await service.cancelTask('ENG-NOFAKE-2');
  });

  await suite.test('NoFake: REVIEW_FAILED returned when forbidden .env file is touched', async () => {
    const service = new EngineeringExecutorService();

    const worker = new EngineeringCodingWorker();
    worker.setDelegate(async (_ctx, worktree) => {
      // Modify code AND create a prohibited .env file
      fs.writeFileSync(path.join(worktree, '.env'), 'SECRET_TOKEN=compromised', 'utf-8');
      const target = path.join(worktree, 'src/calculator.js');
      if (fs.existsSync(target)) {
        fs.appendFileSync(target, '\n// touched\n');
      }
      return { success: true, changesMade: true };
    });

    const mockAdapter = new CodingWorkerAdapter(new GitWorkspaceAdapter(), worker);
    service.registerExecutor('MOCK_ENV_BREACH', mockAdapter);

    const context: EngineeringTaskContext = {
      taskId: 'ENG-NOFAKE-3',
      project: 'DEMO-CALC',
      repository: 'demo-calc-repo',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'SECURITY',
      agent: 'SECURITY_ENGINEER',
      agentName: 'Rizki Purnama',
      title: 'Secret violation check',
      description: 'Security breach attempt',
      acceptanceCriteria: ['No secret files are modified'],
      constraints: [],
      branch: 'fix/nofake-env-breach',
      executor: 'MOCK_ENV_BREACH',
      timeout: 15000,
      environment: {},
      requestedBy: 'Owner',
      maxAttempts: 1,
    };

    const res = await service.executeTask(context);
    assert.strictEqual(res.status, 'REVIEW_FAILED');
    assert.ok(res.error?.includes('.env') || res.error?.includes('Security'));

    await service.cancelTask('ENG-NOFAKE-3');
  });

  await suite.test('NoFake: REVIEW_FAILED returned when scope constraint (DO NOT CHANGE) is violated', async () => {
    const service = new EngineeringExecutorService();

    const worker = new EngineeringCodingWorker();
    worker.setDelegate(async (_ctx, worktree) => {
      // Violate "DO NOT CHANGE: package.json"
      fs.writeFileSync(path.join(worktree, 'package.json'), '{"name":"altered"}', 'utf-8');
      return { success: true, changesMade: true };
    });

    const mockAdapter = new CodingWorkerAdapter(new GitWorkspaceAdapter(), worker);
    service.registerExecutor('MOCK_SCOPE_BREACH', mockAdapter);

    const context: EngineeringTaskContext = {
      taskId: 'ENG-NOFAKE-4',
      project: 'DEMO-CALC',
      repository: 'demo-calc-repo',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Scope violation check',
      description: 'Scope breach attempt',
      acceptanceCriteria: ['Tests pass'],
      constraints: ['DO NOT CHANGE: package.json'],
      branch: 'fix/nofake-scope-breach',
      executor: 'MOCK_SCOPE_BREACH',
      timeout: 15000,
      environment: {},
      requestedBy: 'Owner',
      maxAttempts: 1,
    };

    const res = await service.executeTask(context);
    assert.strictEqual(res.status, 'REVIEW_FAILED');
    assert.ok(res.error?.includes('Scope') || res.error?.includes('package.json'));

    await service.cancelTask('ENG-NOFAKE-4');
  });

  await suite.test('NoFake: Direct modification of protected branches is strictly blocked', async () => {
    const gitAdapter = new GitWorkspaceAdapter();
    const context: EngineeringTaskContext = {
      taskId: 'ENG-NOFAKE-5',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: aiRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Protected branch violation',
      description: 'Attempt to prepare workspace on master',
      acceptanceCriteria: [],
      constraints: [],
      branch: 'master', // Protected branch!
      executor: 'CODING_WORKER',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    await assert.rejects(async () => {
      await gitAdapter.prepareWorkspace(context);
    }, /SECURITY_VIOLATION.*protected branch/);
  });
});
