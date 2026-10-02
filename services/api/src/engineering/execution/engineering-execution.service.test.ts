// ==========================================================
// services/api/src/engineering/execution/engineering-execution.service.test.ts
// Phase 15.2: AI Engineering Execution Bridge Test Suite
// ==========================================================

process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { CommandPolicyEngine } from './command-policy.engine.js';
import { GitWorkspaceAdapter } from './adapters/git-workspace.adapter.js';
import { AntigravityExecutorAdapter } from './adapters/antigravity.adapter.js';
import { EngineeringAgentService } from './engineering-agent.service.js';
import { EngineeringExecutorService } from './engineering-executor.service.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import type { EngineeringTaskContext } from './engineering-execution.types.js';

function getDemoRepoPath(): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, 'fixtures/demo-calc-repo');
    if (fs.existsSync(candidate)) return candidate;
    cur = path.dirname(cur);
  }
  return path.resolve(process.cwd(), 'fixtures/demo-calc-repo');
}

test('Phase 15.2: AI Engineering Execution Bridge Verification Suite', async (suite) => {
  const demoRepo = getDemoRepoPath();

  // ==========================================================
  // 1. COMMAND POLICY ENGINE & SECRET SAFETY (§12 & §13)
  // ==========================================================

  await suite.test('Unit: CommandPolicyEngine correctly categorizes commands', () => {
    // SAFE commands
    const safeStatus = CommandPolicyEngine.evaluate('git status');
    assert.strictEqual(safeStatus.category, 'SAFE');
    assert.strictEqual(safeStatus.action, 'ALLOW');

    const safeTest = CommandPolicyEngine.evaluate('npm test');
    assert.strictEqual(safeTest.category, 'SAFE');
    assert.strictEqual(safeTest.action, 'ALLOW');

    const safeNodeTest = CommandPolicyEngine.evaluate('node --test test/calculator.test.js');
    assert.strictEqual(safeNodeTest.category, 'SAFE');
    assert.strictEqual(safeNodeTest.action, 'ALLOW');

    // RESTRICTED commands (allowed in isolated workspace)
    const restrictedAdd = CommandPolicyEngine.evaluate('git add src/calculator.js');
    assert.strictEqual(restrictedAdd.category, 'RESTRICTED');
    assert.strictEqual(restrictedAdd.action, 'ALLOW');

    const restrictedInstall = CommandPolicyEngine.evaluate('npm install lodash');
    assert.strictEqual(restrictedInstall.category, 'RESTRICTED');
    assert.strictEqual(restrictedInstall.action, 'ALLOW');

    // DANGEROUS commands (requires human approval)
    const dangerousPush = CommandPolicyEngine.evaluate('git push origin main');
    assert.strictEqual(dangerousPush.category, 'DANGEROUS');
    assert.strictEqual(dangerousPush.action, 'HUMAN_APPROVAL_REQUIRED');

    const dangerousDrop = CommandPolicyEngine.evaluate('DROP TABLE users');
    assert.strictEqual(dangerousDrop.category, 'DANGEROUS');
    assert.strictEqual(dangerousDrop.action, 'HUMAN_APPROVAL_REQUIRED');

    // FORBIDDEN commands (strict deny)
    const forbiddenRm = CommandPolicyEngine.evaluate('rm -rf /');
    assert.strictEqual(forbiddenRm.category, 'FORBIDDEN');
    assert.strictEqual(forbiddenRm.action, 'DENY');

    const forbiddenSudo = CommandPolicyEngine.evaluate('sudo systemctl restart');
    assert.strictEqual(forbiddenSudo.category, 'FORBIDDEN');
    assert.strictEqual(forbiddenSudo.action, 'DENY');

    const forbiddenEnvDump = CommandPolicyEngine.evaluate('cat .env');
    assert.strictEqual(forbiddenEnvDump.category, 'FORBIDDEN');
    assert.strictEqual(forbiddenEnvDump.action, 'DENY');
  });

  await suite.test('Unit: Secret scrubbing redacts credentials in commands & logs', () => {
    const raw = 'npm test --token=sk-proj-abc12345678901234567890 and key=AIzaSyA1234567890123456789012345678901';
    const scrubbed = CommandPolicyEngine.scrub(raw);
    assert.strictEqual(scrubbed.includes('sk-proj'), false);
    assert.strictEqual(scrubbed.includes('AIzaSy'), false);
    assert.ok(scrubbed.includes('[REDACTED_API_KEY]'));
    assert.ok(scrubbed.includes('[REDACTED_GOOGLE_API_KEY]'));
  });

  await suite.test('Unit: Path boundary checking prevents directory traversal', () => {
    const worktree = path.resolve('C:/workspace/task-123');
    const insidePath = path.resolve('C:/workspace/task-123/src/index.ts');
    const outsidePath = path.resolve('C:/workspace/task-123/../../etc/passwd');

    assert.strictEqual(CommandPolicyEngine.isPathWithinWorktree(insidePath, worktree), true);
    assert.strictEqual(CommandPolicyEngine.isPathWithinWorktree(outsidePath, worktree), false);
  });

  // ==========================================================
  // 2. EXECUTOR ADAPTER & AVAILABILITY DETECTION (§4 & §7)
  // ==========================================================

  await suite.test('Unit: AntigravityExecutorAdapter honest availability detection without hardcoding', async () => {
    const gitAdapter = new GitWorkspaceAdapter();
    const adapter = new AntigravityExecutorAdapter(gitAdapter);

    // In environment where agy is not in PATH and no delegate set
    const probe = await adapter.detectAvailability();
    assert.strictEqual(typeof probe.available, 'boolean');

    // If unavailable, executeImplementation must return EXECUTOR_UNAVAILABLE (no fake success!)
    if (!probe.available) {
      const mockContext: EngineeringTaskContext = {
        taskId: 'tsk_probe_test',
        project: 'SIMMACI',
        repository: 'SIMMACI',
        repositoryPath: demoRepo,
        taskType: 'BUG',
        domain: 'BACKEND',
        agent: 'BE_ENGINEER',
        agentName: 'Farhan Hakim',
        title: 'Fix auth bug',
        description: 'Resolve login defect',
        acceptanceCriteria: ['Tests pass'],
        constraints: ['Isolated branch'],
        branch: 'fix/simmaci-probe',
        executor: 'ANTIGRAVITY',
        timeout: 10000,
        environment: {},
        requestedBy: 'Owner',
      };

      const res = await adapter.executeImplementation(mockContext, demoRepo);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.status, 'EXECUTOR_UNAVAILABLE');
      assert.ok(res.error?.includes('unavailable') || res.error?.includes('not found'));
    }
  });

  await suite.test('Unit: Antigravity prompt contract conforms to §11 specification', () => {
    const adapter = new AntigravityExecutorAdapter();
    const context: EngineeringTaskContext = {
      taskId: 'ENG-101',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: '/repos/simmaci',
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (BE Engineer)',
      title: 'Investigate and fix login HTTP 500',
      description: 'Backend authentication failing after token expiration',
      acceptanceCriteria: ['login succeeds', 'auth tests remain passing', 'no unrelated files changed'],
      constraints: ['work only inside assigned worktree', 'do not modify production'],
      branch: 'fix/simmaci-auth-login',
      executor: 'ANTIGRAVITY',
      timeout: 30000,
      environment: {},
      requestedBy: 'Owner',
    };

    const prompt = adapter.buildStructuredPrompt(context, '/worktrees/ws_101');
    assert.match(prompt, /PROJECT:\s*SIMMACI/);
    assert.match(prompt, /TASK:\s*Investigate and fix login HTTP 500/);
    assert.match(prompt, /DOMAIN:\s*BACKEND/);
    assert.match(prompt, /ACCEPTANCE CRITERIA:/);
    assert.match(prompt, /- login succeeds/);
    assert.match(prompt, /- auth tests remain passing/);
    assert.match(prompt, /CONSTRAINTS:/);
    assert.match(prompt, /WORKTREE:\s*\/worktrees\/ws_101/);
  });

  // ==========================================================
  // 3. WORKSPACE MANAGER & CONCURRENCY CONFLICTS (§8 & §9)
  // ==========================================================

  await suite.test('Unit: Protected branch invariant strictly blocks direct execution', async () => {
    const gitAdapter = new GitWorkspaceAdapter();
    const context: EngineeringTaskContext = {
      taskId: 'tsk_bad_branch',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Bad Branch Task',
      description: 'Attempting to work on main branch',
      acceptanceCriteria: [],
      constraints: [],
      branch: 'main', // Protected!
      executor: 'ANTIGRAVITY',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    await assert.rejects(
      async () => {
        await gitAdapter.prepareWorkspace(context);
      },
      /SECURITY_VIOLATION.*protected branch/
    );
  });

  await suite.test('Unit: Concurrent branch conflict detection sets status to BLOCKED (§9)', async () => {
    const approvalGate = new ApprovalGateService();
    const agentReviewer = new EngineeringAgentService();
    const service = new EngineeringExecutorService(approvalGate, agentReviewer);

    // Mock executor that succeeds
    const mockExecutor = new AntigravityExecutorAdapter();
    mockExecutor.setDelegate(async () => ({ success: true, changesMade: true }));
    service.registerExecutor('MOCK_CONCURRENT', mockExecutor);

    const contextA: EngineeringTaskContext = {
      taskId: 'ENG-TASK-A',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'FEATURE',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Feature A',
      description: 'Add feature A',
      acceptanceCriteria: ['Tests pass'],
      constraints: ['Isolated'],
      branch: 'shared/feature-conflict',
      executor: 'MOCK_CONCURRENT',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    const contextB: EngineeringTaskContext = {
      ...contextA,
      taskId: 'ENG-TASK-B',
      title: 'Feature B (conflicting branch)',
    };

    // Task A starts and occupies the branch
    const resA = await service.executeTask(contextA);
    assert.notStrictEqual(resA.status, 'BLOCKED');

    // Task B requests the same branch -> must be BLOCKED
    const resB = await service.executeTask(contextB);
    assert.strictEqual(resB.status, 'BLOCKED');
    assert.match(resB.error!, /Branch conflict.*used/);

    // Cleanup
    await service.cancelTask('ENG-TASK-A');
  });

  // ==========================================================
  // 4. AI SUPERVISOR REVIEW & ACCEPTANCE CRITERIA (§10 & §16)
  // ==========================================================

  await suite.test('Unit: AI Engineer review rejects when tests fail', async () => {
    const reviewer = new EngineeringAgentService();
    const adapter = new AntigravityExecutorAdapter();

    const context: EngineeringTaskContext = {
      taskId: 'ENG-REV-1',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (BE Engineer)',
      title: 'Fix defect',
      description: 'Fix defect',
      acceptanceCriteria: ['All tests pass'],
      constraints: [],
      branch: 'fix/rev-1',
      executor: 'ANTIGRAVITY',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    const failedTest = {
      run: 5,
      passed: 3,
      failed: 2,
      output: '2 tests failed',
      status: 'FAILED' as const,
    };

    const diff = { diff: '+ fix line', summary: '1 file changed' };
    const changed = ['src/calculator.js'];

    const review = await reviewer.reviewExecution(context, adapter, '/tmp/ws', failedTest, diff, changed);
    assert.strictEqual(review.passed, false);
    assert.ok(review.pendingCriteria.some((c) => c.includes('Tests must pass')));
    assert.ok(review.feedback.includes('Review REJECTED'));
  });

  await suite.test('Unit: AI Engineer review rejects when prohibited secret file touched', async () => {
    const reviewer = new EngineeringAgentService();
    const adapter = new AntigravityExecutorAdapter();

    const context: EngineeringTaskContext = {
      taskId: 'ENG-REV-2',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (BE Engineer)',
      title: 'Fix defect',
      description: 'Fix defect',
      acceptanceCriteria: ['Tests pass'],
      constraints: [],
      branch: 'fix/rev-2',
      executor: 'ANTIGRAVITY',
      timeout: 10000,
      environment: {},
      requestedBy: 'Owner',
    };

    const passedTest = {
      run: 5,
      passed: 5,
      failed: 0,
      output: 'All tests passed',
      status: 'PASSED' as const,
    };

    const diff = { diff: '+ secret=123', summary: '.env modified' };
    const changed = ['src/calculator.js', '.env']; // Prohibited file!

    const review = await reviewer.reviewExecution(context, adapter, '/tmp/ws', passedTest, diff, changed);
    assert.strictEqual(review.passed, false);
    assert.ok(review.securityConcerns.some((c) => c.includes('.env')));
  });

  // ==========================================================
  // 5. FULL END-TO-END EXECUTION LIFECYCLE & APPROVAL GATE (§6 & §18)
  // ==========================================================

  await suite.test('Integration: Full successful execution lifecycle with Approval Gate', async () => {
    const approvalGate = new ApprovalGateService();
    const agentReviewer = new EngineeringAgentService();
    const service = new EngineeringExecutorService(approvalGate, agentReviewer);

    // Mock executor delegate that simulates successful coding
    const mockExecutor = new AntigravityExecutorAdapter();
    mockExecutor.setDelegate(async (_prompt, _ctx, worktree) => {
      // Modify a file in the workspace
      const targetFile = path.join(worktree, 'src/calculator.js');
      if (fs.existsSync(targetFile)) {
        fs.appendFileSync(targetFile, '\n// Fixed by AI Engineering Employee\n');
      }
      return { success: true, changesMade: true, output: 'Defect resolved and verified.' };
    });

    service.registerExecutor('MOCK_TEST_EXECUTOR', mockExecutor);

    const context: EngineeringTaskContext = {
      taskId: 'ENG-E2E-SUCCESS-1',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim (BE Engineer)',
      title: 'Fix authentication defect',
      description: 'Resolve login token handling',
      acceptanceCriteria: ['Existing tests pass cleanly'],
      constraints: ['Do not modify production directly'],
      branch: 'fix/simmaci-e2e-auth-1',
      executor: 'MOCK_TEST_EXECUTOR',
      timeout: 30000,
      environment: {},
      requestedBy: 'Owner',
    };

    // 1. Execute task
    const result = await service.executeTask(context);

    // Verify progression through states up to READY_FOR_APPROVAL (§6 & §7)
    assert.strictEqual(result.status, 'READY_FOR_APPROVAL');
    assert.strictEqual(result.currentAttempt.tests.status, 'PASSED');
    assert.ok(result.currentAttempt.tests.passed >= 1);
    assert.ok(result.changedFiles.length >= 1);
    assert.ok(result.approvalId, 'Approval request generated in ApprovalGate');

    // Verify in ApprovalGateService
    const approval = approvalGate.getApproval(result.approvalId!);
    assert.ok(approval);
    assert.strictEqual(approval.status, 'PENDING');

    // 2. Approve the task via ApprovalGate
    const resolvedResult = await service.handleApprovalResolution(result.taskId, true, 'Budi (Owner)');
    assert.ok(resolvedResult);
    assert.strictEqual(resolvedResult.status, 'READY_FOR_DEPLOY'); // Stopped at deploy boundary (§20)

    // 3. Format Telegram Summary (§22)
    const telegramText = service.formatTelegramSummary(resolvedResult);
    assert.match(telegramText, /SIMMACI — Engineering Execution/);
    assert.match(telegramText, /READY_FOR_DEPLOY/);
    assert.match(telegramText, /\*Tests:\*\s*PASSED/);

    // Cleanup
    await service.cancelTask(result.taskId);
  });

  await suite.test('Integration: Task rejection terminates at APPROVAL_REJECTED (§18)', async () => {
    const approvalGate = new ApprovalGateService();
    const service = new EngineeringExecutorService(approvalGate);

    const mockExecutor = new AntigravityExecutorAdapter();
    mockExecutor.setDelegate(async (_prompt, _ctx, worktree) => {
      const targetFile = path.join(worktree, 'src/calculator.js');
      if (fs.existsSync(targetFile)) {
        fs.appendFileSync(targetFile, '\n// AI Change\n');
      }
      return { success: true, changesMade: true };
    });
    service.registerExecutor('MOCK_REJECT_EXECUTOR', mockExecutor);

    const context: EngineeringTaskContext = {
      taskId: 'ENG-E2E-REJECT-1',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'FEATURE',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Experimental feature',
      description: 'Add experimental feature',
      acceptanceCriteria: ['Tests pass'],
      constraints: [],
      branch: 'feature/reject-test-1',
      executor: 'MOCK_REJECT_EXECUTOR',
      timeout: 30000,
      environment: {},
      requestedBy: 'Owner',
    };

    const result = await service.executeTask(context);
    assert.strictEqual(result.status, 'READY_FOR_APPROVAL');

    // Owner rejects approval
    const rejected = await service.handleApprovalResolution(result.taskId, false, 'Budi (Owner)');
    assert.ok(rejected);
    assert.strictEqual(rejected.status, 'APPROVAL_REJECTED');
    assert.match(rejected.error!, /Approval rejected/);

    await service.cancelTask(result.taskId);
  });

  await suite.test('Integration: Multi-attempt tracking preserves all attempt records (§23)', async () => {
    const service = new EngineeringExecutorService();

    let attemptCount = 0;
    const mockExecutor = new AntigravityExecutorAdapter();
    mockExecutor.setDelegate(async () => {
      attemptCount++;
      if (attemptCount === 1) {
        // Attempt 1 fails
        return { success: false, error: 'First attempt syntax defect', changesMade: false };
      }
      // Attempt 2 succeeds
      return { success: true, changesMade: true };
    });
    service.registerExecutor('MOCK_RETRY', mockExecutor);

    const context: EngineeringTaskContext = {
      taskId: 'ENG-RETRY-101',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: demoRepo,
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE_ENGINEER',
      agentName: 'Farhan Hakim',
      title: 'Multi attempt fix',
      description: 'Retry demonstration',
      acceptanceCriteria: ['Tests pass'],
      constraints: [],
      branch: 'fix/retry-101',
      executor: 'MOCK_RETRY',
      timeout: 30000,
      environment: {},
      requestedBy: 'Owner',
    };

    // Attempt 1
    const res1 = await service.executeTask(context);
    assert.strictEqual(res1.status, 'COMMAND_FAILED');
    assert.strictEqual(res1.attempts.length, 1);
    assert.strictEqual(res1.attempts[0].attemptNumber, 1);

    // Attempt 2 (Retry)
    const res2 = await service.executeTask(context);
    assert.strictEqual(res2.status, 'READY_FOR_APPROVAL');
    assert.strictEqual(res2.attempts.length, 2);
    assert.strictEqual(res2.attempts[0].status, 'COMMAND_FAILED'); // Previous attempt preserved!
    assert.strictEqual(res2.attempts[1].status, 'READY_FOR_APPROVAL'); // Current attempt succeeded!

    await service.cancelTask('ENG-RETRY-101');
  });

  // ==========================================================
  // 6. REAL SMOKE TEST ON REPOSITORY FIXTURE (§28)
  // ==========================================================

  await suite.test('Real Smoke Test: Real repository inspection, workspace preparation & test execution', async () => {
    assert.ok(fs.existsSync(demoRepo), `demo-calc-repo exists at ${demoRepo}`);

    const gitAdapter = new GitWorkspaceAdapter();

    // 1. Inspect repository
    const inspection = await gitAdapter.inspectRepository(demoRepo);
    assert.strictEqual(inspection.packageJsonFound, true);
    assert.strictEqual(inspection.testScriptFound, true);
    assert.ok(inspection.totalFiles >= 2);

    // 2. Prepare isolated workspace
    const context: EngineeringTaskContext = {
      taskId: `smoke_${Date.now()}`,
      project: 'DEMO-CALC',
      repository: 'demo-calc-repo',
      repositoryPath: demoRepo,
      taskType: 'TEST',
      domain: 'QA',
      agent: 'QA_ENGINEER',
      agentName: 'Siti Rahayu',
      title: 'Smoke Test Real Execution',
      description: 'Run tests in real isolated workspace',
      acceptanceCriteria: ['All tests pass'],
      constraints: [],
      branch: `smoke/test-${Date.now().toString(36)}`,
      executor: 'GIT_WORKTREE',
      timeout: 30000,
      environment: {},
      requestedBy: 'System Test',
    };

    const workspace = await gitAdapter.prepareWorkspace(context);
    assert.ok(fs.existsSync(workspace.worktreePath), 'Isolated workspace folder created');

    // 3. Run real tests inside isolated workspace
    const testResult = await gitAdapter.runTests(workspace.worktreePath, context);
    assert.strictEqual(testResult.status, 'PASSED', `Tests failed: ${testResult.output}`);
    assert.ok(testResult.passed >= 1);
    assert.strictEqual(testResult.failed, 0);

    // 4. Verify diff collection on unchanged workspace
    const diff = await gitAdapter.collectDiff(workspace.worktreePath);
    assert.ok(diff !== undefined);

    // 5. Cleanup workspace
    await gitAdapter.cleanupWorkspace(workspace.worktreePath, demoRepo);
    let removed = !fs.existsSync(workspace.worktreePath);
    for (let i = 0; i < 5 && !removed; i++) {
      await new Promise((r) => setTimeout(r, 100));
      removed = !fs.existsSync(workspace.worktreePath);
    }
    assert.strictEqual(removed, true, 'Workspace cleaned up');
  });
});
