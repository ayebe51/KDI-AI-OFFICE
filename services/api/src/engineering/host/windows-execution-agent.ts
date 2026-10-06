// ==========================================================
// services/api/src/engineering/host/windows-execution-agent.ts
// Native Windows Execution Agent (§3, §4, §7, §9, §11, §13, §18, §25)
// ==========================================================

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { StructuredLogger } from '@kdi/shared';
import { AntigravityDiscoveryService } from '../execution/antigravity-discovery.service.js';
import { AntigravityExecutorAdapter } from '../execution/adapters/antigravity.adapter.js';
import { GitWorkspaceAdapter } from '../execution/adapters/git-workspace.adapter.js';
import { RepositoryAllowlistService } from './repository-allowlist.service.js';
import { WindowsHostRegistryService } from './host-registry.service.js';
import { RemoteExecutionChannelService } from './remote-execution-channel.service.js';
import type {
  WindowsHostRegistration,
  HostHeartbeat,
  ExecutionRequestPayload,
  ExecutionResponsePayload,
  HostStatus,
  ExecutorReadiness,
  ExecutionVerificationReport,
} from './host.types.js';
import type { EngineeringTaskContext } from '../execution/engineering-execution.types.js';

const execAsync = promisify(exec);

export class WindowsExecutionAgent {
  private readonly logger = new StructuredLogger('WindowsExecutionAgent');

  public readonly hostId: string;
  private readonly allowlistService: RepositoryAllowlistService;
  private readonly registryService: WindowsHostRegistryService;
  private readonly channelService: RemoteExecutionChannelService;
  private readonly discoveryService: AntigravityDiscoveryService;
  private readonly gitWorkspace: GitWorkspaceAdapter;
  private readonly antigravityAdapter: AntigravityExecutorAdapter;

  private registrationInfo?: WindowsHostRegistration;
  private isRunning = false;
  private activeTaskIds = new Set<string>();
  private readonly maxConcurrentTasks: number;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(options?: {
    hostId?: string;
    maxConcurrentTasks?: number;
    allowlistService?: RepositoryAllowlistService;
    registryService?: WindowsHostRegistryService;
    channelService?: RemoteExecutionChannelService;
    discoveryService?: AntigravityDiscoveryService;
    gitWorkspace?: GitWorkspaceAdapter;
    antigravityAdapter?: AntigravityExecutorAdapter;
  }) {
    this.hostId = options?.hostId || 'WINDOWS-HOST-01';
    this.maxConcurrentTasks = options?.maxConcurrentTasks || 3;
    this.allowlistService = options?.allowlistService || new RepositoryAllowlistService();
    this.registryService = options?.registryService || new WindowsHostRegistryService();
    this.channelService = options?.channelService || new RemoteExecutionChannelService();
    this.discoveryService = options?.discoveryService || new AntigravityDiscoveryService();
    this.gitWorkspace = options?.gitWorkspace || new GitWorkspaceAdapter();
    this.antigravityAdapter =
      options?.antigravityAdapter ||
      new AntigravityExecutorAdapter(this.gitWorkspace, undefined, this.discoveryService);
  }

  /**
   * Initialize agent and register on Windows Host (§7)
   */
  public async initialize(): Promise<WindowsHostRegistration> {
    this.logger.info('initialize', `Initializing Native Windows Execution Agent on host "${this.hostId}"...`);

    // 1. Discover Antigravity environment (§9)
    const discovery = await this.discoveryService.discover(true);

    // 2. Discover local Git and Node runtimes (§7 & §24)
    let gitVersion = 'unknown';
    try {
      const { stdout } = await execAsync('git --version', { timeout: 3000 });
      gitVersion = stdout.trim();
    } catch {}

    let nodeVersion = process.version;

    const availableRuntimes: string[] = ['node'];
    if (gitVersion !== 'unknown') availableRuntimes.push('git');
    if (discovery.available) availableRuntimes.push('agy');

    const executorStatus: ExecutorReadiness =
      discovery.status === 'READY'
        ? 'READY'
        : discovery.status === 'ANTIGRAVITY_AUTH_REQUIRED'
        ? 'AUTH_REQUIRED'
        : 'UNAVAILABLE';

    const registration: WindowsHostRegistration = {
      hostId: this.hostId,
      hostname: os.hostname(),
      platform: 'win32',
      architecture: os.arch(),
      antigravityVersion: discovery.version || 'unknown',
      agyPath: discovery.executablePath || '',
      gitVersion,
      nodeVersion,
      availableRuntimes,
      status: 'ONLINE',
      executorStatus,
      lastHeartbeat: Date.now(),
      maxConcurrentTasks: this.maxConcurrentTasks,
      activeTasksCount: 0,
      capabilities: [
        'antigravity_cli',
        'git_worktree_isolation',
        'independent_testing',
        'native_windows_execution',
        'build_verification',
      ],
      registeredAt: Date.now(),
      metadata: {
        cpus: os.cpus().length,
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      },
    };

    // 3. Register in host registry (§7)
    this.registryService.registerHost(registration, 'kdi_exec_token_default_secret');
    this.registrationInfo = registration;
    this.isRunning = true;

    // 4. Hook transport into remote execution channel
    this.channelService.setTransportHandler(async (req) => this.handleExecutionRequest(req));

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch(() => {});
    }, 10000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }

    this.logger.info(
      'initialize',
      `Windows Execution Agent ready on ${this.hostId} (Antigravity: ${discovery.version}, Executor: ${executorStatus})`
    );

    return registration;
  }

  /**
   * Emit periodic heartbeat to control plane (§16)
   */
  public async sendHeartbeat(): Promise<HostHeartbeat> {
    const memoryFreeMb = Math.round(os.freemem() / (1024 * 1024));
    const memoryTotalMb = Math.round(os.totalmem() / (1024 * 1024));

    const discovery = await this.discoveryService.discover();
    const executorStatus: ExecutorReadiness =
      discovery.status === 'READY'
        ? 'READY'
        : discovery.status === 'ANTIGRAVITY_AUTH_REQUIRED'
        ? 'AUTH_REQUIRED'
        : 'UNAVAILABLE';

    const heartbeat: HostHeartbeat = {
      hostId: this.hostId,
      status: this.isRunning ? 'ONLINE' : 'OFFLINE',
      executorStatus,
      activeTasks: Array.from(this.activeTaskIds),
      timestamp: Date.now(),
      metrics: {
        memoryAvailableMb: memoryFreeMb,
        memoryTotalMb,
        activeProcessesCount: this.activeTaskIds.size,
      },
    };

    this.registryService.recordHeartbeat(heartbeat);
    return heartbeat;
  }

  /**
   * Handle incoming structured execution request from Docker Control Plane (§4, §6, §11, §21, §25)
   */
  public async handleExecutionRequest(
    request: ExecutionRequestPayload
  ): Promise<ExecutionResponsePayload> {
    const startTime = Date.now();
    this.logger.info(
      'handleExecutionRequest',
      `Received authorized execution request ${request.requestId} for task ${request.taskId} (${request.project})`
    );

    // Refresh heartbeat on incoming activity
    await this.sendHeartbeat().catch(() => {});

    // 1. Concurrency and resource check (§18 & §19)
    if (this.activeTaskIds.size >= this.maxConcurrentTasks) {
      return {
        requestId: request.requestId,
        taskId: request.taskId,
        hostId: this.hostId,
        status: 'BLOCKED',
        success: false,
        stdout: '',
        stderr: `Host ${this.hostId} is at maximum concurrent tasks (${this.activeTaskIds.size}/${this.maxConcurrentTasks}). WAITING_FOR_RESOURCES`,
        exitCode: 1,
        changedFiles: [],
        verification: {
          gitStatusClean: true,
          testsVerified: false,
          buildVerified: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
        },
        durationMs: Date.now() - startTime,
        error: 'Host concurrency capacity exceeded',
        timestamp: Date.now(),
      };
    }

    // 2. Repository allowlist resolution (§12 & §13)
    const targetRepoSlug = request.repository || request.project;
    const repoResolution = this.allowlistService.resolveHostRepositoryPath(targetRepoSlug);
    if (!repoResolution.allowed || !repoResolution.resolvedPath) {
      return {
        requestId: request.requestId,
        taskId: request.taskId,
        hostId: this.hostId,
        status: 'REJECTED',
        success: false,
        stdout: '',
        stderr: repoResolution.reason || `Repository ${request.project} is not allowlisted`,
        exitCode: 1,
        changedFiles: [],
        verification: {
          gitStatusClean: true,
          testsVerified: false,
          buildVerified: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
        },
        durationMs: Date.now() - startTime,
        error: repoResolution.reason,
        timestamp: Date.now(),
      };
    }

    // 3. Branch protection check (§32)
    const branchCheck = this.allowlistService.validateBranchName(request.project, request.branch);
    if (!branchCheck.allowed) {
      return {
        requestId: request.requestId,
        taskId: request.taskId,
        hostId: this.hostId,
        status: 'REJECTED',
        success: false,
        stdout: '',
        stderr: branchCheck.reason || 'Protected branch policy violation',
        exitCode: 1,
        changedFiles: [],
        verification: {
          gitStatusClean: true,
          testsVerified: false,
          buildVerified: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
        },
        durationMs: Date.now() - startTime,
        error: branchCheck.reason,
        timestamp: Date.now(),
      };
    }

    const hostRepoPath = repoResolution.resolvedPath;

    this.activeTaskIds.add(request.taskId);
    this.registryService.incrementActiveTask(this.hostId);

    let worktreePath = '';

    try {
      // 4. Convert request payload into EngineeringTaskContext
      const taskContext: EngineeringTaskContext = {
        taskId: request.taskId,
        project: request.project,
        repository: request.repository || request.project,
        repositoryPath: hostRepoPath,
        taskType: 'FEATURE',
        domain: (request.role as any) || 'BACKEND',
        agent: 'BE',
        agentName: 'Backend Engineer',
        title: `Remote Execution: ${request.taskId}`,
        description: request.prompt,
        acceptanceCriteria: request.acceptanceCriteria || [],
        constraints: request.constraints || [],
        branch: request.branch,
        executor: 'ANTIGRAVITY',
        timeout: request.timeoutMs || 120000,
        environment: {},
        requestedBy: 'ControlPlane',
      };

      // 5. Create isolated git worktree on native Windows host via GitWorkspaceAdapter (§11)
      const workspaceInfo = await this.gitWorkspace.prepareWorkspace(taskContext);
      worktreePath = workspaceInfo.worktreePath;
      taskContext.worktree = worktreePath;

      this.logger.info(
        'handleExecutionRequest',
        `Created isolated worktree on Windows host: ${worktreePath}`
      );

      // 6. Invoke Antigravity natively on Windows (§9 & §21)
      const implementation = await this.antigravityAdapter.executeImplementation(
        taskContext,
        worktreePath
      );

      // Handle auth required status
      if (implementation.status === 'ANTIGRAVITY_AUTH_REQUIRED') {
        return {
          requestId: request.requestId,
          taskId: request.taskId,
          hostId: this.hostId,
          status: 'AUTH_REQUIRED',
          success: false,
          stdout: implementation.output || '',
          stderr: implementation.error || 'Authentication required on Windows execution host',
          exitCode: 1,
          changedFiles: [],
          verification: {
            gitStatusClean: true,
            testsVerified: false,
            buildVerified: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
          },
          durationMs: Date.now() - startTime,
          error: 'ANTIGRAVITY_AUTH_REQUIRED',
          timestamp: Date.now(),
        };
      }

      // 7. Independent verification (§25)
      const verification = await this.performIndependentVerification(worktreePath, hostRepoPath, taskContext);

      // 8. Capture git diff and changed files
      const changedFiles = await this.gitWorkspace.getChangedFiles(worktreePath, hostRepoPath);
      const diffResult = await this.gitWorkspace.collectDiff(worktreePath);

      const isOverallSuccess =
        implementation.success &&
        (changedFiles.length > 0 || implementation.changesMade) &&
        verification.testsVerified;

      const response: ExecutionResponsePayload = {
        requestId: request.requestId,
        taskId: request.taskId,
        hostId: this.hostId,
        status: isOverallSuccess ? 'COMPLETED' : 'FAILED',
        success: isOverallSuccess,
        stdout: implementation.output || '',
        stderr: implementation.error || '',
        exitCode: isOverallSuccess ? 0 : 1,
        changedFiles,
        diff: diffResult.diff,
        verification,
        reviewResult: {
          approved: isOverallSuccess,
          score: isOverallSuccess ? 95 : 40,
          summary: isOverallSuccess
            ? `Changes verified independently on ${this.hostId}: ${changedFiles.length} files modified, all tests passed.`
            : `Execution incomplete: tests or modifications did not verify.`,
          issues: isOverallSuccess ? [] : ['Verification test suite failed or no valid changes detected.'],
        },
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      };

      return response;
    } catch (err: any) {
      this.logger.error('handleExecutionRequest', `Execution error on host ${this.hostId}: ${err.message}`);
      return {
        requestId: request.requestId,
        taskId: request.taskId,
        hostId: this.hostId,
        status: 'FAILED',
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        changedFiles: [],
        verification: {
          gitStatusClean: false,
          testsVerified: false,
          buildVerified: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
        },
        durationMs: Date.now() - startTime,
        error: err.message,
        timestamp: Date.now(),
      };
    } finally {
      this.activeTaskIds.delete(request.taskId);
      this.registryService.decrementActiveTask(this.hostId);
    }
  }

  /**
   * Conduct independent verification without trusting Antigravity self-reporting (§25)
   */
  public async performIndependentVerification(
    worktreePath: string,
    repoPath: string,
    context?: EngineeringTaskContext
  ): Promise<ExecutionVerificationReport> {
    this.logger.info('performIndependentVerification', `Verifying worktree state independently at ${worktreePath}`);

    let testsVerified = false;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let testOutput = '';

    // 1. Run independent test suite
    try {
      const testRes = await this.gitWorkspace.runTests(worktreePath, context);
      testsVerified = testRes.status === 'PASSED';
      totalTests = testRes.run;
      passedTests = testRes.passed;
      failedTests = testRes.failed;
      testOutput = testRes.output;
    } catch (err: any) {
      testOutput = `Test runner error: ${err.message}`;
    }

    // 2. Run typecheck / build check if package.json has typecheck script
    let buildVerified = true;
    const pkgPath = path.join(worktreePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.scripts && pkg.scripts.typecheck) {
          await execAsync('npm run typecheck', { cwd: worktreePath, timeout: 15000 });
          buildVerified = true;
        }
      } catch {
        buildVerified = false;
      }
    }

    // 3. Inspect git status
    const statusResult = await this.gitWorkspace.getGitStatus(worktreePath);

    return {
      gitStatusClean: statusResult.clean,
      testsVerified,
      buildVerified,
      totalTests,
      passedTests,
      failedTests,
      testOutput,
    };
  }

  /**
   * Graceful shutdown of agent
   */
  public async shutdown(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (this.registrationInfo) {
      this.registrationInfo.status = 'OFFLINE';
      this.registryService.recordHeartbeat({
        hostId: this.hostId,
        status: 'OFFLINE',
        executorStatus: 'UNAVAILABLE',
        activeTasks: [],
        timestamp: Date.now(),
      });
    }
    this.logger.info('shutdown', `Windows Execution Agent on host ${this.hostId} stopped`);
  }
}
