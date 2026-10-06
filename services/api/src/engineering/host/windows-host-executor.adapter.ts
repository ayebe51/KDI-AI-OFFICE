// ==========================================================
// services/api/src/engineering/host/windows-host-executor.adapter.ts
// Windows Execution Host Adapter implementing EngineeringExecutor (§3, §8, §17, §27)
// ==========================================================

import * as crypto from 'crypto';
import { Injectable, Optional } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  EngineeringExecutor,
  ExecutorAvailability,
  ImplementationResult,
  CommandRunResult,
  TestRunResult,
  DiffResult,
  GitStatusResult,
} from '../execution/executor.interface.js';
import type {
  EngineeringTaskContext,
  WorkspaceInfo,
  RepositoryInspection,
} from '../execution/engineering-execution.types.js';
import { WindowsHostRegistryService } from './host-registry.service.js';
import { RemoteExecutionChannelService } from './remote-execution-channel.service.js';
import { GitWorkspaceAdapter } from '../execution/adapters/git-workspace.adapter.js';
import type {
  ExecutionRequestPayload,
  ExecutionResponsePayload,
} from './host.types.js';

@Injectable()
export class WindowsHostExecutorAdapter implements EngineeringExecutor {
  public readonly id = 'WINDOWS_ANTIGRAVITY_HOST';
  public readonly name = 'Native Windows Antigravity Execution Host';

  private readonly logger = new StructuredLogger('WindowsHostExecutorAdapter');
  private readonly registry: WindowsHostRegistryService;
  private readonly channel: RemoteExecutionChannelService;
  private readonly gitWorkspace: GitWorkspaceAdapter;

  constructor(
    @Optional() registry?: WindowsHostRegistryService,
    @Optional() channel?: RemoteExecutionChannelService,
    @Optional() gitWorkspace?: GitWorkspaceAdapter
  ) {
    this.registry = registry || new WindowsHostRegistryService();
    this.channel = channel || new RemoteExecutionChannelService();
    this.gitWorkspace = gitWorkspace || new GitWorkspaceAdapter();
  }

  /**
   * Detect whether designated Windows Execution Host is online and ready (§8)
   */
  public async detectAvailability(): Promise<ExecutorAvailability> {
    const hosts = this.registry.listHosts();
    if (hosts.length === 0) {
      return {
        available: false,
        reason: 'No Windows Execution Host registered. State: WAITING_FOR_EXECUTION_HOST (§8)',
      };
    }

    const onlineHost = hosts.find((h) => {
      const readiness = this.registry.evaluateHostReadiness(h.hostId);
      return readiness.isReady;
    });

    if (!onlineHost) {
      const firstHost = hosts[0];
      const readiness = this.registry.evaluateHostReadiness(firstHost.hostId);
      return {
        available: false,
        reason: readiness.reason || `Host ${firstHost.hostId} is not ready (Status: ${readiness.status})`,
      };
    }

    return {
      available: true,
      version: `Host: ${onlineHost.hostId} | agy: ${onlineHost.antigravityVersion}`,
      reason: `Windows Execution Host ${onlineHost.hostId} is online and Antigravity is ready.`,
      binaryPath: onlineHost.agyPath,
    };
  }

  /**
   * Dispatch implementation task to Windows Host via secure channel (§4, §5, §17)
   */
  public async executeImplementation(
    context: EngineeringTaskContext,
    worktreePath: string,
    attemptNumber = 1,
    previousFailure?: string
  ): Promise<ImplementationResult> {
    const projectSlug = (context as any).projectSlug || context.project || 'KDI';

    // 1. Host selection based on project mapping (§14 & §17)
    const host = this.registry.getDesignatedHostForProject(projectSlug);
    if (!host) {
      this.logger.warn('executeImplementation', `No online Windows host available for project ${projectSlug}`);
      return {
        success: false,
        status: 'EXECUTOR_UNAVAILABLE',
        error: `WAITING_FOR_EXECUTION_HOST: No online Windows Execution Host available for project "${projectSlug}".`,
        changesMade: false,
      };
    }

    // 2. Validate host readiness (§8)
    const readiness = this.registry.evaluateHostReadiness(host.hostId);
    if (!readiness.isReady) {
      this.logger.warn('executeImplementation', `Host ${host.hostId} readiness check failed: ${readiness.reason}`);
      const status =
        readiness.executorStatus === 'AUTH_REQUIRED'
          ? 'ANTIGRAVITY_AUTH_REQUIRED'
          : readiness.status === 'BUSY'
          ? 'WAITING_FOR_RESOURCES'
          : 'EXECUTOR_UNAVAILABLE';

      return {
        success: false,
        status,
        error: readiness.reason,
        changesMade: false,
      };
    }

    // 3. Build structured execution request (§6)
    const unsignedPayload: Omit<ExecutionRequestPayload, 'authSignature'> = {
      requestId: `req_${context.taskId}_${Date.now()}`,
      taskId: context.taskId,
      project: projectSlug,
      repository: context.repository || projectSlug,
      branch: context.branch,
      role: context.domain || (context as any).role || 'BACKEND',
      executor: 'ANTIGRAVITY',
      prompt: context.description,
      acceptanceCriteria: context.acceptanceCriteria || [],
      constraints: context.constraints || [],
      timeoutMs: context.timeout || 120000,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
      metadata: {
        attemptNumber,
        previousFailure,
      },
    };

    const signedRequest = this.channel.signRequest(unsignedPayload);

    this.logger.info(
      'executeImplementation',
      `Dispatching task ${context.taskId} to Windows Host ${host.hostId} (Request: ${signedRequest.requestId})`
    );

    try {
      // 4. Transmit request over secure channel (§5)
      const response: ExecutionResponsePayload = await this.channel.dispatchExecution(signedRequest);

      // 5. Evaluate response
      if (!response.success) {
        const failureStatus =
          response.status === 'AUTH_REQUIRED'
            ? 'ANTIGRAVITY_AUTH_REQUIRED'
            : 'COMMAND_FAILED';

        return {
          success: false,
          status: failureStatus,
          output: response.stdout,
          error: response.error || response.stderr || 'Remote execution failed on Windows host',
          changesMade: response.changedFiles.length > 0,
        };
      }

      return {
        success: true,
        status: 'IMPLEMENTING',
        output: response.stdout,
        changesMade: response.changedFiles.length > 0,
      };
    } catch (err: any) {
      this.logger.error('executeImplementation', `Failed to execute on Windows host: ${err.message}`);

      const errCode =
        err.code === 'ANTIGRAVITY_TIMEOUT'
          ? 'ANTIGRAVITY_TIMEOUT'
          : 'COMMAND_FAILED';

      return {
        success: false,
        status: errCode,
        error: err.message,
        changesMade: false,
      };
    }
  }

  // ── Delegated Workspace Operations (§7 & Phase 15.3) ─────────
  public async inspectRepository(repoPath: string): Promise<RepositoryInspection> {
    return this.gitWorkspace.inspectRepository(repoPath);
  }

  public async prepareWorkspace(context: EngineeringTaskContext): Promise<WorkspaceInfo> {
    return this.gitWorkspace.prepareWorkspace(context);
  }

  public async createBranch(repoPath: string, branch: string): Promise<void> {
    return this.gitWorkspace.createBranch(repoPath, branch);
  }

  public async createWorktree(repoPath: string, worktreePath: string, branch: string): Promise<string> {
    return this.gitWorkspace.createWorktree(repoPath, worktreePath, branch);
  }

  public async runCommand(cmd: string, cwd: string, timeoutMs?: number): Promise<CommandRunResult> {
    return this.gitWorkspace.runCommand(cmd, cwd, timeoutMs);
  }

  public async runTests(worktreePath: string, context?: EngineeringTaskContext): Promise<TestRunResult> {
    return this.gitWorkspace.runTests(worktreePath, context);
  }

  public async collectDiff(worktreePath: string): Promise<DiffResult> {
    return this.gitWorkspace.collectDiff(worktreePath);
  }

  public async getChangedFiles(worktreePath: string, baseRepoPath?: string): Promise<string[]> {
    return this.gitWorkspace.getChangedFiles(worktreePath, baseRepoPath);
  }

  public async getGitStatus(worktreePath: string): Promise<GitStatusResult> {
    return this.gitWorkspace.getGitStatus(worktreePath);
  }

  public async getCommit(worktreePath: string): Promise<string | undefined> {
    return this.gitWorkspace.getCommit(worktreePath);
  }

  public async commitChanges(worktreePath: string, message: string): Promise<string> {
    return this.gitWorkspace.commitChanges(worktreePath, message);
  }

  public async cleanupWorkspace(worktreePath: string, repoPath?: string): Promise<void> {
    return this.gitWorkspace.cleanupWorkspace(worktreePath, repoPath);
  }
}
