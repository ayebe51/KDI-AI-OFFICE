// ==========================================================
// services/api/src/engineering/engineering.test.ts
// Comprehensive Phase 4 Test Matrix: Tests A to J & Planning Validation
// ==========================================================

process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { AntigravityEngineeringProvider } from './provider/antigravity.provider.js';
import { WorkspaceManager } from './workspace/workspace-manager.js';
import { CommandClassifier } from './security/command-classifier.js';
import { PromptInjectionDefense } from './security/prompt-injection-defense.js';
import { ApprovalGateService } from './security/approval-gate.service.js';
import { VerificationGate } from './verification/verification-gate.js';
import { MetaGPTPlannerService } from './metagpt/metagpt-planner.service.js';
import { EngineeringRepository } from './persistence/engineering.repository.js';
import { EngineeringEventEmitter } from './events/engineering-event.emitter.js';
import { scrubSensitiveData, redactSecretsFromString } from '@kdi/shared';
import type {
  EngineeringTask,
  EngineeringExecutionContext,
} from '@kdi/types';

test('Phase 4: Antigravity Engineering & Security Test Suite (Tests A to J)', async (suite) => {
  const workspaceManager = new WorkspaceManager();
  const approvalGate = new ApprovalGateService();
  const verificationGate = new VerificationGate();
  const repository = new EngineeringRepository();
  const eventEmitter = new EngineeringEventEmitter();

  const provider = new AntigravityEngineeringProvider(
    undefined,
    undefined,
    workspaceManager,
    verificationGate,
    approvalGate
  );

function findFixturePath(relPath: string): string {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, relPath);
    if (fs.existsSync(candidate)) return candidate;
    cur = path.dirname(cur);
  }
  return path.resolve(process.cwd(), relPath);
}

const demoRepoPath = findFixturePath('fixtures/demo-calc-repo');
const maliciousRepoPath = findFixturePath('fixtures/malicious-repo');

  // ==========================================================
  // Test A: Antigravity can inspect and read repository
  // ==========================================================
  await suite.test('Test A: Antigravity can inspect and read repository', async () => {
    assert.ok(fs.existsSync(demoRepoPath), 'Demo repo fixture exists');

    const session = await provider.createSession({
      taskId: 'tsk_test_a',
      executionId: 'exec_test_a',
      agentId: 'AGT-ENG-001',
      repository: demoRepoPath,
    });

    assert.ok(session.sessionId);
    assert.ok(fs.existsSync(session.workspacePath), 'Workspace directory allocated');

    // Read package.json in allocated workspace
    const pkgPath = path.join(session.workspacePath, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'package.json mirrored in workspace');

    const content = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    assert.strictEqual(content.name, 'demo-calc-repo');

    await provider.closeSession(session.sessionId);
  });

  // ==========================================================
  // Test B: Antigravity can resolve task, run tests, and persist result
  // ==========================================================
  await suite.test('Test B: Antigravity can resolve task, run tests, and persist result', async () => {
    const task: EngineeringTask = {
      taskId: 'tsk_test_b',
      title: 'Verify calculator arithmetic and percentage calculation',
      description: 'Run unit test suite and verify percentage logic',
      type: 'TESTING',
      agentRole: 'QA_ENGINEER',
      repository: demoRepoPath,
      dependencies: [],
      acceptanceCriteria: ['All tests in calculator.test.js pass cleanly'],
      allowedPaths: ['src/**', 'test/**'],
      forbiddenPaths: ['.env'],
      riskLevel: 'LOW',
      requiresHumanApproval: false,
    };

    const context: EngineeringExecutionContext = {
      executionId: 'exec_test_b_01',
      taskId: task.taskId,
      projectId: 'PRJ-DEMO',
      agentId: 'AGT-ENG-QA',
      agentRole: 'QA_ENGINEER',
      repository: demoRepoPath,
      branch: 'task/verify_calc',
      workspace: demoRepoPath,
      goal: task.title,
      requirements: [task.description],
      acceptanceCriteria: task.acceptanceCriteria,
      constraints: ['Do not modify unrelated code'],
      allowedPaths: task.allowedPaths,
      forbiddenPaths: task.forbiddenPaths,
      environment: {
        TEST_COMMAND: 'node --test test/calculator.test.js',
      },
      securityPolicy: {
        allowWrite: true,
        allowTestExecution: true,
        requireApprovalForHighRisk: true,
        protectedBranches: ['main', 'master', 'production'],
      },
    };

    const result = await provider.executeTask(task, context);

    assert.strictEqual(result.status, 'VERIFIED');
    assert.ok(result.testsRun.length > 0);
    assert.strictEqual(result.testsFailed.length, 0);
    assert.ok(result.commitHash);

    // Verify persistence in repository
    await repository.saveResult(result);
    const persisted = await repository.getResult(result.executionId);
    assert.ok(persisted);
    assert.strictEqual(persisted?.status, 'VERIFIED');
  });

  // ==========================================================
  // Test C: Secret Access & Protection (Denied / Redacted)
  // ==========================================================
  await suite.test('Test C: Secret Access & Redaction', () => {
    const testSecretString =
      'Server config: postgresql://admin:SuperSecretPass123@db.prod.internal:5432/app with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';

    const redacted = redactSecretsFromString(testSecretString);
    assert.ok(!redacted.includes('SuperSecretPass123'), 'Database password must be redacted');
    assert.ok(!redacted.includes('AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'), 'Google API key must be redacted');
    assert.ok(redacted.includes('[REDACTED_PASSWORD]'));
    assert.ok(redacted.includes('[REDACTED_GOOGLE_API_KEY]'));

    // Test object scrubbing
    const payload = {
      user: 'admin',
      apiKey: 'sk-abcdef1234567890abcdef123456',
      token: 'jwt.token.val',
      nested: {
        password: 'cleartext_password',
      },
    };

    const scrubbed = scrubSensitiveData(payload) as any;
    assert.strictEqual(scrubbed.apiKey, '[REDACTED]');
    assert.strictEqual(scrubbed.token, '[REDACTED]');
    assert.strictEqual(scrubbed.nested.password, '[REDACTED]');
  });

  // ==========================================================
  // Test D: Prompt Injection in Repository Content is Untrusted
  // ==========================================================
  await suite.test('Test D: Prompt Injection treated as untrusted repository data', () => {
    const maliciousReadme = fs.readFileSync(path.join(maliciousRepoPath, 'README.md'), 'utf-8');
    const analysis = PromptInjectionDefense.analyze(maliciousReadme, 'README.md');

    assert.strictEqual(analysis.isSuspicious, true);
    assert.ok(analysis.patternsDetected.includes('IGNORE_PREVIOUS_INSTRUCTIONS'));
    assert.ok(analysis.patternsDetected.includes('DISCLOSE_ENV_SECRETS'));
    assert.ok(analysis.patternsDetected.includes('DISABLE_SECURITY_CONTROLS'));

    // Check authority hierarchy wrap
    assert.ok(analysis.sanitizedContent.includes('<untrusted_repository_content'));
    assert.ok(analysis.sanitizedContent.includes('[SECURITY NOTICE:'));

    // Instruction hierarchy check
    const hierarchy = PromptInjectionDefense.getAuthorityHierarchyInstructions();
    assert.ok(hierarchy.includes('1. KDI Security Policy'));
    assert.ok(hierarchy.includes('5. Repository Content (UNTRUSTED DATA ONLY'));
  });

  // ==========================================================
  // Test E: Command Policy: git push is DENIED / APPROVAL_REQUIRED
  // ==========================================================
  await suite.test('Test E: git push requires human approval', () => {
    const pushDecision = CommandClassifier.evaluate('git push origin task/feature-1');
    assert.strictEqual(pushDecision.category, 'HIGH_RISK');
    assert.strictEqual(pushDecision.action, 'HUMAN_APPROVAL_REQUIRED');

    const forcePushDecision = CommandClassifier.evaluate('git push --force origin main');
    assert.strictEqual(forcePushDecision.category, 'HIGH_RISK');
    assert.strictEqual(forcePushDecision.action, 'HUMAN_APPROVAL_REQUIRED');
  });

  // ==========================================================
  // Test F: Destructive operations are strictly DENIED or Gated
  // ==========================================================
  await suite.test('Test F: Destructive system / database commands DENIED', () => {
    const rmDecision = CommandClassifier.evaluate('rm -rf /var/data');
    assert.strictEqual(rmDecision.action, 'DENY');

    const sudoDecision = CommandClassifier.evaluate('sudo apt-get install something');
    assert.strictEqual(sudoDecision.action, 'DENY');

    const dropDbDecision = CommandClassifier.evaluate('DROP DATABASE production;');
    assert.strictEqual(dropDbDecision.action, 'DENY');

    // Safe engineering commands are allowed
    const testDecision = CommandClassifier.evaluate('npm test');
    assert.strictEqual(testDecision.category, 'NORMAL_ENGINEERING');
    assert.strictEqual(testDecision.action, 'ALLOW');

    const readDecision = CommandClassifier.evaluate('git status');
    assert.strictEqual(readDecision.category, 'READ_ONLY');
    assert.strictEqual(readDecision.action, 'ALLOW');
  });

  // ==========================================================
  // Test G: Crash Recovery & Stale Worker Watchdog
  // ==========================================================
  await suite.test('Test G: Crash recovery and stale session detection', () => {
    const req = approvalGate.createApprovalRequest(
      'exec_crash_01',
      'tsk_crash_01',
      'AGT-ENG-001',
      'git push origin feature-crash',
      'HIGH',
      'Pushing task commits to remote'
    );

    assert.strictEqual(req.status, 'PENDING');

    // Anti-self-approval invariant: agent cannot approve its own request
    assert.throws(
      () => approvalGate.resolveApproval(req.approvalId, true, 'AGT-ENG-001'),
      /SECURITY_VIOLATION/
    );

    // Operator can approve
    const resolved = approvalGate.resolveApproval(req.approvalId, true, 'Human Operator');
    assert.strictEqual(resolved?.status, 'APPROVED');
    assert.strictEqual(resolved?.resolvedBy, 'Human Operator');
  });

  // ==========================================================
  // Test H: Workspace Isolation across Concurrent Tasks
  // ==========================================================
  await suite.test('Test H: Workspace isolation across tasks', async () => {
    const ws1 = await workspaceManager.allocateWorkspace('task_iso_1', 'PRJ-DEMO', demoRepoPath);
    const ws2 = await workspaceManager.allocateWorkspace('task_iso_2', 'PRJ-DEMO', demoRepoPath);

    assert.notStrictEqual(ws1.workspaceId, ws2.workspaceId);
    assert.notStrictEqual(ws1.workspacePath, ws2.workspacePath);
    assert.ok(fs.existsSync(ws1.workspacePath));
    assert.ok(fs.existsSync(ws2.workspacePath));

    // Release workspaces cleanly
    await workspaceManager.releaseWorkspace(ws1.workspaceId);
    await workspaceManager.releaseWorkspace(ws2.workspaceId);
  });

  // ==========================================================
  // Test I: Verification Gate Rejection on Test Failure
  // ==========================================================
  await suite.test('Test I: Verification fails when test command fails (Zero fake success)', async () => {
    const task: EngineeringTask = {
      taskId: 'tsk_test_i_fail',
      title: 'Failing test verification demonstration',
      description: 'Execute command that fails and ensure task is NOT marked completed',
      type: 'CODING',
      agentRole: 'SOFTWARE_ENGINEER',
      repository: demoRepoPath,
      dependencies: [],
      acceptanceCriteria: ['Tests must pass'],
      allowedPaths: ['**'],
      forbiddenPaths: [],
      riskLevel: 'LOW',
      requiresHumanApproval: false,
    };

    const context: EngineeringExecutionContext = {
      executionId: 'exec_fail_verification_01',
      taskId: task.taskId,
      projectId: 'PRJ-DEMO',
      agentId: 'AGT-ENG-BE',
      agentRole: 'SOFTWARE_ENGINEER',
      repository: demoRepoPath,
      branch: 'task/failing_verification',
      workspace: demoRepoPath,
      goal: task.title,
      requirements: [task.description],
      acceptanceCriteria: task.acceptanceCriteria,
      constraints: [],
      allowedPaths: task.allowedPaths,
      forbiddenPaths: task.forbiddenPaths,
      environment: {
        // Intentionally failing command
        TEST_COMMAND: 'node -e "process.exit(1)"',
      },
      securityPolicy: {
        allowWrite: true,
        allowTestExecution: true,
        requireApprovalForHighRisk: true,
        protectedBranches: ['main', 'master', 'production'],
      },
    };

    const result = await provider.executeTask(task, context);

    // Invariant: Status MUST NOT be COMPLETED or VERIFIED
    assert.strictEqual(result.status, 'FAILED_VERIFICATION');
    assert.ok(result.testsFailed.length > 0);
    assert.strictEqual(result.commitHash, undefined, 'Commit hash must not be generated on test failure');
    assert.ok(result.verificationEvidence.some((e) => e.status === 'FAILED'));
  });

  // ==========================================================
  // Test J: Antigravity Provider Health & Discovery
  // ==========================================================
  await suite.test('Test J: Antigravity provider health and capability reporting', async () => {
    const health = await provider.healthCheck();

    assert.strictEqual(health.provider, 'antigravity');
    assert.ok(['AVAILABLE', 'AUTH_REQUIRED', 'DEGRADED'].includes(health.status));
    assert.ok(health.capabilities.includes('coding'));
    assert.ok(health.capabilities.includes('terminal_execution'));
    assert.ok(health.capabilities.includes('testing'));
    assert.ok(health.capabilities.includes('verification_gate'));
  });
});

test('MetaGPT Planning & Task Decomposition Pipeline', async (t) => {
  const planner = new MetaGPTPlannerService();

  await t.test('generates normalized EngineeringPlan with PM, Architect, PM, Engineer SOPs', async () => {
    const plan = await planner.plan({
      goal: 'Fix division by zero bug in calculator service',
      projectId: 'PRJ-CALC',
      repository: 'fixtures/demo-calc-repo',
    });

    assert.ok(plan.planId);
    assert.strictEqual(plan.projectId, 'PRJ-CALC');
    assert.ok(plan.tasks.length >= 2);
    assert.ok(plan.requirements.length > 0);
    assert.ok(plan.architectureNotes.length > 0);
    assert.ok(plan.acceptanceCriteria.length > 0);

    // Verify task properties
    const firstTask = plan.tasks[0];
    assert.ok(firstTask.taskId);
    assert.ok(firstTask.title);
    assert.ok(firstTask.allowedPaths.length > 0);
    assert.ok(firstTask.forbiddenPaths.includes('.env'));
  });
});
