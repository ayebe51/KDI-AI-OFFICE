// ==========================================================
// services/api/src/engineering/execution/adapters/antigravity.adapter.ts
// Phase 15.4: Real Antigravity Engineering AI Executor Adapter (§3, §4, §8, §10, §12)
// ==========================================================

import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { StructuredLogger } from '@kdi/shared';
import { GitWorkspaceAdapter } from './git-workspace.adapter.js';
import { CommandPolicyEngine } from '../command-policy.engine.js';
import { AntigravityDiscoveryService } from '../antigravity-discovery.service.js';
import type {
  EngineeringExecutor,
  ExecutorAvailability,
  ImplementationResult,
  CommandRunResult,
  TestRunResult,
  DiffResult,
  GitStatusResult,
} from '../executor.interface.js';
import type {
  EngineeringTaskContext,
  RepositoryInspection,
  WorkspaceInfo,
  AntigravityExecutionResult,
} from '../engineering-execution.types.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export type ImplementationDelegate = (
  prompt: string,
  context: EngineeringTaskContext,
  worktreePath: string,
  attemptNumber?: number,
  previousFailure?: string
) => Promise<{ success: boolean; output?: string; error?: string; changesMade?: boolean }>;

export class AntigravityExecutorAdapter implements EngineeringExecutor {
  public readonly id = 'ANTIGRAVITY';
  public readonly name = 'Antigravity Engineering AI Executor';

  private readonly logger = new StructuredLogger('AntigravityExecutorAdapter');
  private readonly gitWorkspace: GitWorkspaceAdapter;
  private readonly discoveryService: AntigravityDiscoveryService;
  private delegate?: ImplementationDelegate;

  constructor(
    gitWorkspace?: GitWorkspaceAdapter,
    customDelegate?: ImplementationDelegate,
    discoveryService?: AntigravityDiscoveryService
  ) {
    this.gitWorkspace = gitWorkspace || new GitWorkspaceAdapter();
    this.delegate = customDelegate;
    this.discoveryService = discoveryService || new AntigravityDiscoveryService();
  }

  /**
   * Set custom implementation delegate (useful for tests and headless subagent bridges)
   */
  public setDelegate(delegate: ImplementationDelegate): void {
    this.delegate = delegate;
  }

  /**
   * Detect whether an Antigravity execution runtime is truly available (§2)
   */
  public async detectAvailability(): Promise<ExecutorAvailability> {
    // If a delegate is configured (e.g. injected in test or subagent bridge)
    if (this.delegate) {
      return {
        available: true,
        reason: 'Antigravity execution delegate is active',
        version: 'subagent-delegate-1.0',
      };
    }

    const discovery = await this.discoveryService.discover(true);

    if (discovery.status === 'READY') {
      return {
        available: true,
        version: discovery.version,
        reason: discovery.diagnostics,
        binaryPath: discovery.executablePath,
      };
    }

    return {
      available: false,
      reason: discovery.diagnostics,
      binaryPath: discovery.executablePath,
    };
  }

  /**
   * Build structured instruction prompt conforming strictly to §10
   */
  public buildStructuredPrompt(
    context: EngineeringTaskContext,
    worktreePath: string,
    attemptNumber = 1,
    previousFailure?: string
  ): string {
    const acceptance = context.acceptanceCriteria?.length
      ? context.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}\n- ${c}`).join('\n')
      : '1. Reproduce the failure\n- Reproduce the failure\n2. Identify root cause\n- Identify root cause\n3. Fix root cause\n- Fix root cause\n4. Relevant tests pass\n- Relevant tests pass\n5. No unrelated files changed\n- No unrelated files changed';

    const constraints = context.constraints?.length
      ? context.constraints.map((c) => `- ${c}`).join('\n')
      : '- Work only inside assigned worktree.\n- Do not access production.\n- Do not modify protected branches.\n- Do not delete data.\n- Do not expose secrets.\n- Do not perform deployment.';

    let failureContext = '';
    if (attemptNumber > 1 && previousFailure) {
      failureContext =
        `\n\nPREVIOUS ATTEMPT FAILURE (${attemptNumber - 1}):\n` +
        `Failure Diagnosis: ${previousFailure}\n` +
        `Instruction: Fix only the root cause. Do not expand scope unnecessarily.`;
    }

    return (
      `PROJECT:\n${context.project}\n\n` +
      `TASK:\n${context.title}\n\n` +
      `DESCRIPTION:\n${context.description}\n\n` +
      `DOMAIN:\n${context.domain || 'BACKEND'}\n\n` +
      `ROLE:\n${context.agentName || context.domain || 'Backend Engineer'}\n\n` +
      `WORKTREE:\n${worktreePath}\n\n` +
      `WORKSPACE:\n${worktreePath}\n\n` +
      `ACCEPTANCE CRITERIA:\n${acceptance}\n\n` +
      `CONSTRAINTS:\n${constraints}\n\n` +
      `DO NOT CHANGE:\n- Production deployment configuration\n- Credentials, keys, and environment files (.env)\n- Database migration schemas outside declared scope\n\n` +
      `FINAL RESPONSE MUST REPORT:\n- root cause\n- files changed\n- tests executed\n- test result\n- unresolved issues` +
      failureContext
    );
  }

  /**
   * Execute code implementation step using real Antigravity CLI or delegate (§3, §4, §8)
   */
  public async executeImplementation(
    context: EngineeringTaskContext,
    worktreePath: string,
    attemptNumber = 1,
    previousFailure?: string
  ): Promise<ImplementationResult> {
    const availability = await this.detectAvailability();

    // Enforce §1 & §2: Do not fake execution if runtime is unavailable
    if (!availability.available && !this.delegate) {
      const discovery = await this.discoveryService.discover();
      this.logger.warn(
        'executeImplementation',
        `Cannot execute task ${context.taskId}: ${availability.reason} (Status: ${discovery.status})`
      );

      const status =
        discovery.status === 'ANTIGRAVITY_AUTH_REQUIRED' ||
        discovery.status === 'ANTIGRAVITY_PERMISSION_BLOCKED'
          ? discovery.status
          : 'EXECUTOR_UNAVAILABLE';

      return {
        success: false,
        status,
        error: availability.reason || 'Antigravity CLI runtime is unavailable in this environment',
        changesMade: false,
      };
    }

    const structuredPrompt = this.buildStructuredPrompt(
      context,
      worktreePath,
      attemptNumber,
      previousFailure
    );

    // If custom delegate is configured (for test fixtures or custom execution bridges)
    if (this.delegate) {
      try {
        const delegateRes = await this.delegate(
          structuredPrompt,
          context,
          worktreePath,
          attemptNumber,
          previousFailure
        );
        return {
          success: delegateRes.success,
          status: delegateRes.success ? 'IMPLEMENTING' : 'COMMAND_FAILED',
          output: delegateRes.output,
          error: delegateRes.error,
          changesMade: delegateRes.changesMade ?? delegateRes.success,
        };
      } catch (err: any) {
        return {
          success: false,
          status: 'COMMAND_FAILED',
          error: err.message,
          changesMade: false,
        };
      }
    }

    // Direct invocation of the real Antigravity executable (§3, §4, §8)
    const directResult = await this.executeAntigravityDirect(
      structuredPrompt,
      context,
      worktreePath
    );

    // Independent check of actual changes in worktree (§11 & §14)
    const changedFiles = await this.gitWorkspace.getChangedFiles(worktreePath, context.repositoryPath);
    const changesMade = changedFiles.length > 0;

    const isSuccess = directResult.exitCode === 0 && directResult.status === 'ANTIGRAVITY_COMPLETED';

    return {
      success: isSuccess,
      status: isSuccess ? 'IMPLEMENTING' : directResult.status,
      output: directResult.stdout || directResult.response,
      error: directResult.error || (isSuccess ? undefined : directResult.stderr),
      changesMade,
    };
  }

  /**
   * Execute real Antigravity headless process directly inside assigned worktree (§3, §4, §8, §12)
   */
  public async executeAntigravityDirect(
    prompt: string,
    context: EngineeringTaskContext,
    worktreePath: string
  ): Promise<AntigravityExecutionResult> {
    const startTime = Date.now();
    const discovery = await this.discoveryService.discover();

    if (!discovery.executablePath || !discovery.available) {
      const errStatus: AntigravityExecutionResult['status'] =
        discovery.status === 'READY' ? 'ANTIGRAVITY_UNAVAILABLE' : discovery.status;
      return {
        status: errStatus,
        exitCode: 1,
        stdout: '',
        stderr: discovery.diagnostics,
        durationMs: 0,
        changedFiles: [],
        error: discovery.diagnostics,
      };
    }

    // Verify workspace boundary (§8)
    if (!fs.existsSync(worktreePath)) {
      return {
        status: 'ANTIGRAVITY_FAILED',
        exitCode: 1,
        stdout: '',
        stderr: `Target worktree path does not exist on disk: ${worktreePath}`,
        durationMs: 0,
        changedFiles: [],
        error: `Target worktree path does not exist on disk: ${worktreePath}`,
      };
    }

    // Build CLI invocation arguments (§3)
    // Antigravity headless prompt: agy --print "<prompt>" --dangerously-skip-permissions
    const cliArgs = ['--print', prompt, '--dangerously-skip-permissions'];

    if (discovery.structuredOutputSupported) {
      cliArgs.push('--output-format', 'json');
    }

    // Prepare clean environment without recursive test flags (§15.3 invariant)
    const cleanEnv = { ...process.env };
    delete cleanEnv.NODE_TEST_CONTEXT;
    delete cleanEnv.NODE_TEST_WORKER_ID;

    // Timeout configuration (§30)
    const timeoutMs = context.timeout || 120000;

    this.logger.info(
      'executeAntigravityDirect',
      `Launching Antigravity headless agent in worktree: ${worktreePath} (Timeout: ${timeoutMs}ms)`
    );

    try {
      const { stdout, stderr } = await execFileAsync(discovery.executablePath, cliArgs, {
        cwd: worktreePath,
        env: cleanEnv,
        timeout: timeoutMs,
        maxBuffer: 20 * 1024 * 1024,
      });

      const scrubbedStdout = CommandPolicyEngine.scrub(stdout || '');
      const scrubbedStderr = CommandPolicyEngine.scrub(stderr || '');
      const durationMs = Date.now() - startTime;

      // Check for authentication failure in process output (§2.6 & §5)
      if (
        scrubbedStdout.toLowerCase().includes('authentication required') ||
        scrubbedStderr.toLowerCase().includes('authentication required') ||
        scrubbedStdout.toLowerCase().includes('please login') ||
        scrubbedStderr.toLowerCase().includes('please login')
      ) {
        return {
          status: 'ANTIGRAVITY_AUTH_REQUIRED',
          exitCode: 1,
          stdout: scrubbedStdout,
          stderr: scrubbedStderr,
          durationMs,
          changedFiles: [],
          error: 'Antigravity execution requires active user authentication session.',
        };
      }

      // Check for permission block in output (§6)
      if (
        scrubbedStdout.toLowerCase().includes('permission denied') ||
        scrubbedStderr.toLowerCase().includes('permission denied') ||
        scrubbedStdout.toLowerCase().includes('permission blocked')
      ) {
        return {
          status: 'ANTIGRAVITY_PERMISSION_BLOCKED',
          exitCode: 1,
          stdout: scrubbedStdout,
          stderr: scrubbedStderr,
          durationMs,
          changedFiles: [],
          error: 'Antigravity execution was blocked by security permission policy.',
        };
      }

      // Parse structured JSON response if available
      let responseText = scrubbedStdout;
      let conversationId: string | undefined;
      try {
        const parsed = JSON.parse(scrubbedStdout.trim());
        if (parsed.response) {
          responseText = parsed.response;
        }
        if (parsed.conversation_id) {
          conversationId = parsed.conversation_id;
        }
      } catch {
        // Raw text output
      }

      const changedFiles = await this.gitWorkspace.getChangedFiles(worktreePath, context.repositoryPath);

      return {
        status: 'ANTIGRAVITY_COMPLETED',
        exitCode: 0,
        stdout: scrubbedStdout,
        stderr: scrubbedStderr,
        response: responseText,
        durationMs,
        changedFiles,
        conversationId,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const scrubbedStdout = CommandPolicyEngine.scrub(err.stdout || '');
      const scrubbedStderr = CommandPolicyEngine.scrub(err.stderr || err.message || '');

      if (err.killed || err.signal === 'SIGTERM' || err.message?.includes('timed out')) {
        return {
          status: 'ANTIGRAVITY_TIMEOUT',
          exitCode: 124,
          stdout: scrubbedStdout,
          stderr: scrubbedStderr,
          durationMs,
          changedFiles: [],
          error: `Antigravity CLI execution timed out after ${timeoutMs}ms`,
        };
      }

      return {
        status: 'ANTIGRAVITY_FAILED',
        exitCode: err.code || 1,
        stdout: scrubbedStdout,
        stderr: scrubbedStderr,
        durationMs,
        changedFiles: [],
        error: scrubbedStderr || 'Antigravity process exited with failure',
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

  public async readFile(filePath: string, worktreePath: string): Promise<string> {
    return this.gitWorkspace.readFile(filePath, worktreePath);
  }

  public async writeFile(filePath: string, content: string, worktreePath: string): Promise<void> {
    return this.gitWorkspace.writeFile(filePath, content, worktreePath);
  }
}
