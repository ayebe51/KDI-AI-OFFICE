// ==========================================================
// services/api/src/engineering/execution/executor.interface.ts
// Phase 15.2: Engineering Executor Abstraction Interface
// ==========================================================

import type {
  EngineeringTaskContext,
  EngineeringExecutionStatus,
  RepositoryInspection,
  WorkspaceInfo,
} from './engineering-execution.types.js';

export interface CommandRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TestRunResult {
  run: number;
  passed: number;
  failed: number;
  output: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
}

export interface DiffResult {
  diff: string;
  summary: string;
}

export interface GitStatusResult {
  clean: boolean;
  statusOutput: string;
  modified: string[];
  untracked: string[];
}

export interface ExecutorAvailability {
  available: boolean;
  reason?: string;
  version?: string;
  binaryPath?: string;
}

export interface ImplementationResult {
  success: boolean;
  status: EngineeringExecutionStatus;
  output?: string;
  error?: string;
  changesMade?: boolean;
}

export interface EngineeringExecutor {
  readonly id: string;
  readonly name: string;

  /**
   * Probe whether the executor runtime is actually installed and functional
   * Must not assume binary path or flags.
   */
  detectAvailability(): Promise<ExecutorAvailability>;

  /**
   * Inspect target repository (structure, git state, test scripts)
   */
  inspectRepository(repoPath: string): Promise<RepositoryInspection>;

  /**
   * Prepare an isolated workspace (worktree or isolated copy)
   */
  prepareWorkspace(context: EngineeringTaskContext): Promise<WorkspaceInfo>;

  /**
   * Create an isolated branch
   */
  createBranch(repoPath: string, branch: string): Promise<void>;

  /**
   * Create an isolated git worktree
   */
  createWorktree(repoPath: string, worktreePath: string, branch: string): Promise<string>;

  /**
   * Execute command within workspace directory
   */
  runCommand(cmd: string, cwd: string, timeoutMs?: number): Promise<CommandRunResult>;

  /**
   * Run unit and regression test suite inside workspace
   */
  runTests(worktreePath: string, context?: EngineeringTaskContext): Promise<TestRunResult>;

  /**
   * Collect git diff from the workspace
   */
  collectDiff(worktreePath: string): Promise<DiffResult>;

  /**
   * List files modified, added, or deleted in the workspace
   */
  getChangedFiles(worktreePath: string, baseRepoPath?: string): Promise<string[]>;

  /**
   * Get git status overview
   */
  getGitStatus(worktreePath: string): Promise<GitStatusResult>;

  /**
   * Get the current commit SHA of the worktree
   */
  getCommit(worktreePath: string): Promise<string | undefined>;

  /**
   * Commit verified changes onto isolated branch
   */
  commitChanges(worktreePath: string, message: string): Promise<string>;

  /**
   * Remove worktree and clean workspace safely
   */
  cleanupWorkspace(worktreePath: string, repoPath?: string): Promise<void>;

  /**
   * Execute code implementation step using the executor's AI/engine
   */
  executeImplementation(
    context: EngineeringTaskContext,
    worktreePath: string
  ): Promise<ImplementationResult>;

  /**
   * Safely read a file within the isolated worktree
   */
  readFile?(filePath: string, worktreePath: string): Promise<string>;

  /**
   * Safely write a file within the isolated worktree
   */
  writeFile?(filePath: string, content: string, worktreePath: string): Promise<void>;
}
