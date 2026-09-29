// ==========================================================
// services/api/src/engineering/workspace/workspace-manager.ts
// Git Worktree & Filesystem Workspace Isolation Engine
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { StructuredLogger } from '@kdi/shared';

const execAsync = promisify(exec);

export interface IsolatedWorkspace {
  workspaceId: string;
  taskId: string;
  projectId: string;
  baseRepoPath: string;
  workspacePath: string;
  branchName: string;
  isWorktree: boolean;
  createdAt: string;
}

export class WorkspaceManager {
  private readonly logger = new StructuredLogger('WorkspaceManager');
  private readonly workspaces = new Map<string, IsolatedWorkspace>();
  private readonly protectedBranches = new Set(['main', 'master', 'production', 'release']);

  constructor(private readonly baseStorageDir = path.resolve(process.cwd(), '.worktrees')) {
    if (!fs.existsSync(this.baseStorageDir)) {
      try {
        fs.mkdirSync(this.baseStorageDir, { recursive: true });
      } catch (err: any) {
        this.logger.debug('constructor', `Could not create worktrees directory: ${err.message}`);
      }
    }
  }

  /**
   * Allocate an isolated workspace for a task, using git worktree if valid git repository
   */
  public async allocateWorkspace(
    taskId: string,
    projectId: string,
    repoPath: string,
    featureBranch?: string
  ): Promise<IsolatedWorkspace> {
    const workspaceId = `ws_${taskId}_${Date.now()}`;
    const safeBranch = featureBranch || `task/${taskId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    // Verify protected branch invariant
    if (this.protectedBranches.has(safeBranch.toLowerCase())) {
      throw new Error(`SECURITY_VIOLATION: Direct workspace on protected branch "${safeBranch}" is strictly denied`);
    }

    const workspacePath = path.join(this.baseStorageDir, workspaceId);
    let isWorktree = false;

    // Check if repoPath is a valid git repository
    const gitDir = path.join(repoPath, '.git');
    if (fs.existsSync(gitDir)) {
      try {
        // Attempt git worktree addition: git worktree add -b <safeBranch> <workspacePath>
        await execAsync(`git worktree add -b "${safeBranch}" "${workspacePath}"`, {
          cwd: repoPath,
        });
        isWorktree = true;
        this.logger.info(
          'allocateWorkspace',
          `Created git worktree at ${workspacePath} on branch ${safeBranch}`
        );
      } catch (err: any) {
        this.logger.warn(
          'allocateWorkspace',
          `Git worktree creation failed (${err.message}). Falling back to isolated directory mirror.`
        );
        isWorktree = false;
      }
    }

    // Fallback: If not a git repo or worktree creation failed, create isolated copy
    if (!isWorktree) {
      fs.mkdirSync(workspacePath, { recursive: true });
      try {
        this.copyDirectorySync(repoPath, workspacePath, ['.git', 'node_modules', '.worktrees']);
      } catch (err: any) {
        this.logger.error('allocateWorkspace', `Failed to mirror directory: ${err.message}`);
      }
    }

    const workspace: IsolatedWorkspace = {
      workspaceId,
      taskId,
      projectId,
      baseRepoPath: repoPath,
      workspacePath,
      branchName: safeBranch,
      isWorktree,
      createdAt: new Date().toISOString(),
    };

    this.workspaces.set(workspaceId, workspace);
    return workspace;
  }

  /**
   * Release and remove the isolated workspace safely
   */
  public async releaseWorkspace(workspaceId: string): Promise<void> {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return;

    if (ws.isWorktree) {
      try {
        await execAsync(`git worktree remove --force "${ws.workspacePath}"`, {
          cwd: ws.baseRepoPath,
        });
        this.logger.info('releaseWorkspace', `Removed git worktree ${ws.workspacePath}`);
      } catch (err: any) {
        this.logger.warn('releaseWorkspace', `Error removing git worktree: ${err.message}`);
      }
    }

    // Ensure directory is deleted from disk
    if (fs.existsSync(ws.workspacePath)) {
      try {
        fs.rmSync(ws.workspacePath, { recursive: true, force: true });
      } catch (err: any) {
        this.logger.debug('releaseWorkspace', `Failed to remove workspace folder: ${err.message}`);
      }
    }

    this.workspaces.delete(workspaceId);
  }

  /**
   * Collect git diff or directory changes from the workspace
   */
  public async collectDiff(workspaceId: string): Promise<string> {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return '';

    try {
      const { stdout } = await execAsync('git status --short && git diff', {
        cwd: ws.workspacePath,
      });
      return stdout || '(No changes detected in workspace)';
    } catch {
      return '(Diff collection not available for non-git workspace)';
    }
  }

  public getWorkspace(workspaceId: string): IsolatedWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  public isBranchProtected(branch: string): boolean {
    return this.protectedBranches.has(branch.toLowerCase());
  }

  private copyDirectorySync(src: string, dest: string, excludes: string[]) {
    if (!fs.existsSync(src)) return;
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      if (excludes.includes(entry.name)) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirectorySync(srcPath, destPath, excludes);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
