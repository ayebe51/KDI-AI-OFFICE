// ==========================================================
// services/api/src/engineering/execution/adapters/coding-worker.adapter.ts
// Phase 15.3: Autonomous AI Workforce Coding Adapter
// ==========================================================

import { StructuredLogger } from '@kdi/shared';
import { GitWorkspaceAdapter } from './git-workspace.adapter.js';
import { EngineeringCodingWorker } from '../coding-worker.service.js';
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
} from '../engineering-execution.types.js';

export class CodingWorkerAdapter implements EngineeringExecutor {
  public readonly id: string;
  public readonly name: string;

  private readonly logger = new StructuredLogger('CodingWorkerAdapter');
  private readonly gitWorkspace: GitWorkspaceAdapter;
  public readonly codingWorker: EngineeringCodingWorker;

  constructor(
    gitWorkspace?: GitWorkspaceAdapter,
    codingWorker?: EngineeringCodingWorker,
    id = 'CODING_WORKER',
    name = 'KDI Autonomous AI Engineering Coding Worker'
  ) {
    this.gitWorkspace = gitWorkspace || new GitWorkspaceAdapter();
    this.codingWorker = codingWorker || new EngineeringCodingWorker();
    this.id = id;
    this.name = name;
  }

  public async detectAvailability(): Promise<ExecutorAvailability> {
    return {
      available: true,
      reason: 'KDI AI Workforce Coding Worker is active and ready in workspace',
      version: '15.3.0',
    };
  }

  public async inspectRepository(repoPath: string): Promise<RepositoryInspection> {
    return this.codingWorker.inspectRepository(repoPath);
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

  public async executeImplementation(
    context: EngineeringTaskContext,
    worktreePath: string,
    attemptNumber?: number,
    previousFailure?: string
  ): Promise<ImplementationResult> {
    return this.codingWorker.executeWork(
      context,
      worktreePath,
      attemptNumber || 1,
      previousFailure,
      this
    );
  }
}
