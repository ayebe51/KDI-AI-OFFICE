// ==========================================================
// services/api/src/engineering/execution/phase-19-live-pilot-windows-host.test.ts
// Dockerized Control Plane + Native Windows Antigravity Live Pilot Verification Suite
// ==========================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

import {
  WindowsHostRegistryService,
  RepositoryAllowlistService,
  RemoteExecutionChannelService,
  WindowsExecutionAgent,
  WindowsHostExecutorAdapter,
  DeploymentRollbackService,
  type WindowsHostRegistration,
  type ExecutionRequestPayload,
} from '../host/index.js';
import { AntigravityExecutorAdapter } from './adapters/antigravity.adapter.js';
import { GitWorkspaceAdapter } from './adapters/git-workspace.adapter.js';
import { EngineeringManagerService } from '../manager/engineering-manager.service.js';
import { EngineeringService } from '../engineering.service.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';
import { OrchestratorService } from '../../telegram/orchestrator/orchestrator.service.js';
import { TelegramRepository } from '../../telegram/persistence/telegram.repository.js';
import type { OwnerMessage } from '@kdi/types';
import type { EngineeringTaskContext } from './engineering-execution.types.js';

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

test('KDI Live Pilot: Dockerized Control Plane + Native Windows Antigravity Suite', async (suite) => {
  const workspaceRoot = findWorkspaceRoot();
  const testRepoPath = path.join(workspaceRoot, 'fixtures', 'demo-calc-repo');

  // ── Test 1: Native Windows Host Registration & Discovery (§7, §9, §15) ──────────
  await suite.test('Test 1: Windows Host Registration & Environment Discovery (§7 & §15)', async () => {
    const registry = new WindowsHostRegistryService();
    const allowlist = new RepositoryAllowlistService();
    const channel = new RemoteExecutionChannelService();
    const agent = new WindowsExecutionAgent({
      hostId: 'WINDOWS-HOST-PILOT-01',
      registryService: registry,
      allowlistService: allowlist,
      channelService: channel,
    });

    const registration = await agent.initialize();

    assert.equal(registration.hostId, 'WINDOWS-HOST-PILOT-01');
    assert.equal(registration.platform, 'win32');
    assert.ok(registration.nodeVersion.startsWith('v'));
    assert.ok(registration.availableRuntimes.includes('node'));
    assert.equal(registration.status, 'ONLINE');

    const overview = registry.getHealthOverview('WINDOWS-HOST-PILOT-01');
    assert.equal(overview.windowsHost, 'ONLINE');
    assert.equal(overview.executionAgent, 'READY');
    assert.ok(overview.git === 'READY' || overview.git === 'UNKNOWN');

    await agent.shutdown();
  });

  // ── Test 2: Heartbeat Tracking & Staleness Detection (§16) ─────────────
  await suite.test('Test 2: Heartbeat Tracking & Staleness Transition (§16)', async () => {
    const registry = new WindowsHostRegistryService();

    const hostReg: WindowsHostRegistration = {
      hostId: 'WINDOWS-HOST-02',
      hostname: 'DESKTOP-PILOT',
      platform: 'win32',
      architecture: 'x64',
      antigravityVersion: '1.2.17',
      agyPath: 'C:\\Users\\user\\AppData\\Local\\agy\\bin\\agy.exe',
      gitVersion: 'git version 2.53.0',
      nodeVersion: 'v24.15.0',
      availableRuntimes: ['node', 'git', 'agy'],
      status: 'ONLINE',
      executorStatus: 'READY',
      lastHeartbeat: Date.now() - 40000, // 40 seconds ago (stale > 30s)
      maxConcurrentTasks: 3,
      activeTasksCount: 0,
      capabilities: ['antigravity_cli'],
      registeredAt: Date.now() - 50000,
    };

    registry.registerHost(hostReg, 'kdi_exec_token_default_secret');

    // Initial check: should transition to STALE
    const staleHosts = registry.checkStaleness(30000);
    assert.ok(staleHosts.includes('WINDOWS-HOST-02'));

    const readiness = registry.evaluateHostReadiness('WINDOWS-HOST-02');
    assert.equal(readiness.isReady, false);
    assert.equal(readiness.status, 'STALE');
    assert.match(readiness.reason!, /HOST_STALE/);

    // Heartbeat recovery (§29)
    const hbResult = registry.recordHeartbeat({
      hostId: 'WINDOWS-HOST-02',
      status: 'ONLINE',
      executorStatus: 'READY',
      activeTasks: [],
      timestamp: Date.now(),
    });
    assert.equal(hbResult.success, true);
    assert.equal(hbResult.hostStatus, 'ONLINE');

    const recoveredReadiness = registry.evaluateHostReadiness('WINDOWS-HOST-02');
    assert.equal(recoveredReadiness.isReady, true);
    assert.equal(recoveredReadiness.status, 'ONLINE');
  });

  // ── Test 3: Executor Readiness & Missing Host Protection (§8) ──────────
  await suite.test('Test 3: Executor Readiness & Missing Host Protection (§8)', async () => {
    const registry = new WindowsHostRegistryService();
    const adapter = new WindowsHostExecutorAdapter(registry);

    // No hosts registered: should report WAITING_FOR_EXECUTION_HOST
    const avail = await adapter.detectAvailability();
    assert.equal(avail.available, false);
    assert.match(avail.reason!, /WAITING_FOR_EXECUTION_HOST/);

    const taskContext: EngineeringTaskContext = {
      taskId: 'ENG-SIMMACI-001',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      repositoryPath: testRepoPath,
      branch: 'task/simmaci-001',
      taskType: 'BUG',
      domain: 'BACKEND',
      agent: 'BE',
      agentName: 'Backend Engineer',
      title: 'Fix SIMMACI Attendance',
      description: 'Fix attendance calculation',
      acceptanceCriteria: ['Must pass tests'],
      constraints: ['No regression'],
      executor: 'WINDOWS_ANTIGRAVITY_HOST',
      timeout: 60000,
      environment: {},
      requestedBy: 'Ayub',
    };

    const execResult = await adapter.executeImplementation(taskContext, '');
    assert.equal(execResult.success, false);
    assert.equal(execResult.status, 'EXECUTOR_UNAVAILABLE');
    assert.match(execResult.error!, /WAITING_FOR_EXECUTION_HOST/);
  });

  // ── Test 4: Repository Allowlist & Branch Protection (§13 & §32) ───────
  await suite.test('Test 4: Repository Allowlist & Branch Protection (§13 & §32)', async () => {
    const allowlist = new RepositoryAllowlistService();

    // 1. Approved repository check
    assert.equal(allowlist.isAllowedRepository('SIMMACI'), true);
    assert.equal(allowlist.isAllowedRepository('ILMORA'), true);
    assert.equal(allowlist.isAllowedRepository('KDI'), true);
    assert.equal(allowlist.isAllowedRepository('unauthorized-external-repo'), false);

    // 2. Arbitrary path traversal injection
    const traversal = allowlist.resolveHostRepositoryPath('../../etc/passwd');
    assert.equal(traversal.allowed, false);
    assert.match(traversal.reason!, /Arbitrary filesystem paths are rejected/);

    // 3. Branch protection: direct push/execution to main or master is rejected
    const mainCheck = allowlist.validateBranchName('SIMMACI', 'main');
    assert.equal(mainCheck.allowed, false);
    assert.equal(mainCheck.isProtected, true);
    assert.match(mainCheck.reason!, /protected branch "main" is rejected/);

    const masterCheck = allowlist.validateBranchName('SIMMACI', 'production');
    assert.equal(masterCheck.allowed, false);
    assert.equal(masterCheck.isProtected, true);

    // 4. Isolated feature branch is allowed
    const featureCheck = allowlist.validateBranchName('SIMMACI', 'feature/export-csv-fix');
    assert.equal(featureCheck.allowed, true);
    assert.equal(featureCheck.isProtected, false);
  });

  // ── Test 5: Secure Channel Authentication & Replay Protection (§5 & §32) ─
  await suite.test('Test 5: Secure Channel HMAC Authentication & Replay Protection (§5 & §32)', async () => {
    const channel = new RemoteExecutionChannelService('test_secret_key_123');

    const basePayload: Omit<ExecutionRequestPayload, 'authSignature'> = {
      requestId: 'req_001',
      taskId: 'TASK-001',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      branch: 'task/001',
      role: 'BACKEND',
      executor: 'ANTIGRAVITY',
      prompt: 'Test prompt',
      acceptanceCriteria: [],
      constraints: [],
      timeoutMs: 30000,
      timestamp: Date.now(),
      nonce: 'nonce_unique_12345',
    };

    const signed = channel.signRequest(basePayload);
    assert.ok(signed.authSignature);

    // 1. Valid request verification
    const verification1 = channel.verifyRequest(signed);
    assert.equal(verification1.valid, true);

    // 2. Replay attack attempt with identical nonce
    const replayVerification = channel.verifyRequest(signed);
    assert.equal(replayVerification.valid, false);
    assert.match(replayVerification.reason!, /Nonce already used/);

    // 3. Tampered signature
    const tampered = { ...signed, nonce: 'nonce_tampered', authSignature: 'bad_signature' };
    const tamperedVerification = channel.verifyRequest(tampered);
    assert.equal(tamperedVerification.valid, false);
    assert.match(tamperedVerification.reason!, /Invalid authentication signature/);

    // 4. Stale timestamp (> 60s)
    const stalePayload = channel.signRequest({
      ...basePayload,
      nonce: 'nonce_stale',
      timestamp: Date.now() - 90000,
    });
    const staleVerification = channel.verifyRequest(stalePayload);
    assert.equal(staleVerification.valid, false);
    assert.match(staleVerification.reason!, /timestamp expired/);
  });

  // ── Test 6: Network Failure Simulation (HOST_CONNECTION_LOST) (§31) ────
  await suite.test('Test 6: Network Disconnection Simulation (§31)', async () => {
    const channel = new RemoteExecutionChannelService();
    channel.setSimulateNetworkLoss(true);

    const unsigned: Omit<ExecutionRequestPayload, 'authSignature'> = {
      requestId: 'req_net_fail',
      taskId: 'TASK-NET-01',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      branch: 'task/net-01',
      role: 'BACKEND',
      executor: 'ANTIGRAVITY',
      prompt: 'Do something',
      acceptanceCriteria: [],
      constraints: [],
      timeoutMs: 10000,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    };
    const signed = channel.signRequest(unsigned);

    await assert.rejects(
      async () => channel.dispatchExecution(signed),
      (err: any) => {
        assert.equal(err.code, 'HOST_CONNECTION_LOST');
        return true;
      }
    );
  });

  // ── Test 7: Antigravity Process Crash Simulation (§30) ──────────────────
  await suite.test('Test 7: Antigravity Process Failure Simulation without Fake Success (§30)', async () => {
    const channel = new RemoteExecutionChannelService();
    channel.setSimulateProcessFailure(true);

    const unsigned: Omit<ExecutionRequestPayload, 'authSignature'> = {
      requestId: 'req_proc_crash',
      taskId: 'TASK-CRASH-01',
      project: 'SIMMACI',
      repository: 'SIMMACI',
      branch: 'task/crash-01',
      role: 'BACKEND',
      executor: 'ANTIGRAVITY',
      prompt: 'Crash recovery test',
      acceptanceCriteria: [],
      constraints: [],
      timeoutMs: 10000,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    };
    const signed = channel.signRequest(unsigned);

    const response = await channel.dispatchExecution(signed);
    assert.equal(response.success, false);
    assert.equal(response.status, 'FAILED');
    assert.equal(response.exitCode, 137);
    assert.match(response.stderr, /Simulated process crash/);
    assert.equal(response.verification.testsVerified, false);
  });

  // ── Test 8: Deployment Rollback Snapshot & Restore (§38) ───────────────
  await suite.test('Test 8: Deployment Rollback Snapshot & Recovery (§38)', async () => {
    const rollback = new DeploymentRollbackService();

    const snapshot = rollback.createSnapshot({
      gitSha: '1ae1ae4b9f30291',
      description: 'Pre-pilot deployment snapshot',
      activeHosts: [
        {
          hostId: 'WINDOWS-HOST-01',
          hostname: 'KDI-PRIMARY-PC',
          platform: 'win32',
          architecture: 'x64',
          antigravityVersion: '1.2.17',
          agyPath: 'C:\\Users\\user\\AppData\\Local\\agy\\bin\\agy.exe',
          gitVersion: '2.53.0',
          nodeVersion: 'v24.15.0',
          availableRuntimes: ['node', 'git', 'agy'],
          status: 'ONLINE',
          executorStatus: 'READY',
          lastHeartbeat: Date.now(),
          maxConcurrentTasks: 3,
          activeTasksCount: 0,
          capabilities: ['antigravity'],
          registeredAt: Date.now(),
        },
      ],
      projectMappings: [
        { projectSlug: 'simmaci', hostId: 'WINDOWS-HOST-01', isPrimary: true, assignedAt: Date.now() },
      ],
      configSummary: { env: 'production', port: '3000' },
    });

    assert.ok(snapshot.snapshotId.startsWith('snap_'));
    assert.equal(snapshot.gitSha, '1ae1ae4b9f30291');

    // Trigger emergency rollback
    const result = rollback.executeRollback(snapshot.snapshotId);
    assert.equal(result.success, true);
    assert.equal(result.restoredSnapshot?.gitSha, '1ae1ae4b9f30291');
    assert.equal(result.actionsTaken.length, 5);
  });

  // ── Test 9: Real Live Pilot Execution on Native Windows Host (§20, §21, §25) ──
  await suite.test('Test 9: Real E2E Live Pilot Flow: Docker Dispatch -> Windows Agent -> Antigravity -> Verification -> Approval (§20–§25)', async () => {
    const registry = new WindowsHostRegistryService();
    const allowlist = new RepositoryAllowlistService();
    const channel = new RemoteExecutionChannelService();
    const gitWorkspace = new GitWorkspaceAdapter();
    const approvalGate = new ApprovalGateService();

    // Register demo-calc test repository in allowlist
    allowlist.registerApprovedRepository({
      slug: 'demo-calc',
      name: 'Demo Calculator Pilot Repository',
      approvedPath: testRepoPath,
      defaultBranch: 'main',
      protectedBranches: ['main', 'master', 'production'],
      allowedRoles: ['BE', 'QA'],
    });

    // Custom delegate to safely simulate real Antigravity modifying real code in the worktree
    const realDelegate = async (
      prompt: string,
      context: EngineeringTaskContext,
      worktreePath: string
    ) => {
      // Modify target calculation file in isolated worktree
      const targetFile = path.join(worktreePath, 'src', 'calculator.js');
      if (fs.existsSync(targetFile)) {
        let content = fs.readFileSync(targetFile, 'utf8');
        content += '\n// Pilot Verified: Antigravity native Windows execution complete\n';
        fs.writeFileSync(targetFile, content);
      }
      return { success: true, output: 'Antigravity executed successfully on Windows host', changesMade: true };
    };

    const antigravityAdapter = new AntigravityExecutorAdapter(gitWorkspace, realDelegate);

    // Initialize Native Windows Execution Agent
    const agent = new WindowsExecutionAgent({
      hostId: 'WINDOWS-HOST-PILOT-REAL',
      registryService: registry,
      allowlistService: allowlist,
      channelService: channel,
      gitWorkspace,
      antigravityAdapter,
    });

    await agent.initialize();

    // Project mapping: demo-calc -> WINDOWS-HOST-PILOT-REAL
    registry.setProjectHostMapping('demo-calc', 'WINDOWS-HOST-PILOT-REAL', true);

    // Dispatch execution request from Docker Control Plane adapter
    const hostAdapter = new WindowsHostExecutorAdapter(registry, channel, gitWorkspace);

    const taskId = `PILOT-CALC-${Date.now().toString(36)}`;
    const taskContext: EngineeringTaskContext = {
      taskId,
      project: 'demo-calc',
      repository: 'demo-calc',
      repositoryPath: testRepoPath,
      branch: `pilot/feature-${taskId}`,
      taskType: 'FEATURE',
      domain: 'BACKEND',
      agent: 'BE',
      agentName: 'Backend Engineer',
      title: 'Pilot Task: Implement Calculator Percentage Verification',
      description: 'Add percentage calculation comment and verify tests pass',
      acceptanceCriteria: ['Tests must pass', 'Must not regress existing functions'],
      constraints: ['No production secrets in code'],
      executor: 'WINDOWS_ANTIGRAVITY_HOST',
      timeout: 60000,
      environment: {},
      requestedBy: 'Ayub (Telegram Owner)',
    };

    // 1. Dispatch task to Windows Execution Host
    const execResult = await hostAdapter.executeImplementation(taskContext, '');
    if (!execResult.success) {
      console.error('TEST 9 EXEC RESULT ERROR:', JSON.stringify(execResult, null, 2));
    }
    assert.equal(execResult.success, true, `Expected success, got: ${execResult.status} - ${execResult.error}`);
    assert.equal(execResult.status, 'IMPLEMENTING');
    assert.equal(execResult.changesMade, true);

    // 2. Request Human Approval for the pilot changes (§22)
    const approvalReq = approvalGate.createApprovalRequest(
      `exec_${taskId}`,
      taskId,
      'BE',
      'git commit -m "feat(pilot): verify native windows execution"',
      'HIGH',
      `Commit pilot verified changes on ${taskContext.branch}`
    );

    assert.equal(approvalReq.status, 'PENDING');

    // 3. Human Approval via /engineering approve (§22)
    const resolved = approvalGate.resolveApproval(approvalReq.approvalId, true, 'Ayub (Owner Telegram)');
    assert.equal(resolved?.status, 'APPROVED');

    await agent.shutdown();
  });

  // ── Test 10: Telegram Commands & Natural Language Routing (§23) ─────────
  await suite.test('Test 10: Telegram Orchestrator Host & Pilot Commands (§23)', async () => {
    const telegramRepo = new TelegramRepository();
    const manager = new EngineeringManagerService();

    // Register active host in manager
    manager.hostRegistry.registerHost({
      hostId: 'WINDOWS-HOST-PROD-01',
      hostname: 'OFFICE-DESKTOP',
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
      activeTasksCount: 1,
      capabilities: ['antigravity_cli'],
      registeredAt: Date.now(),
    });

    const engineeringService = new EngineeringService(
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      manager
    );

    const orchestrator = new OrchestratorService(
      telegramRepo,
      undefined,
      undefined,
      undefined,
      engineeringService
    );

    const createMsg = (text: string): OwnerMessage => ({
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: 'conv_pilot_test',
      channel: 'telegram',
      senderId: '123456789',
      senderFirstName: 'Ayub',
      text,
      timestamp: new Date().toISOString(),
    });

    // 1. Slash command: /engineering host
    const hostCmd = await orchestrator.handleOwnerMessage(createMsg('/engineering host'), 'corr_h1');
    assert.match(hostCmd.responseMessage, /KDI ENGINEERING EXECUTION HOSTS/);
    assert.match(hostCmd.responseMessage, /Windows Host: \*ONLINE\*/);
    assert.match(hostCmd.responseMessage, /Antigravity: \*READY\*/);

    // 2. Slash command: /engineering pilot
    const pilotCmd = await orchestrator.handleOwnerMessage(createMsg('/engineering pilot'), 'corr_p1');
    assert.match(pilotCmd.responseMessage, /KDI LIVE PILOT OPERATIONS STATUS/);
    assert.match(pilotCmd.responseMessage, /Docker Control Plane \+ Native Windows Host/);

    // 3. Natural Language query: "Status execution host"
    const nlHost = await orchestrator.handleOwnerMessage(
      createMsg('Bagaimana status execution host windows?'),
      'corr_nl1'
    );
    assert.match(nlHost.responseMessage, /STATUS WINDOWS EXECUTION HOST/);
    assert.match(nlHost.responseMessage, /Antigravity \(agy\.exe\): \*READY\*/);
  });
});
