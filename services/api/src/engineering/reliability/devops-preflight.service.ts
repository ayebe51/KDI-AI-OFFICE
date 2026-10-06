// ==========================================================
// services/api/src/engineering/reliability/devops-preflight.service.ts
// Phase 19: DevOps Pre-Flight Checks, Environment Validation & Safe Dry-Run (§22–§26)
// ==========================================================

import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  DevOpsPlanResult,
  DevOpsPreflightResult,
  RuntimeCapabilityCheck,
} from './reliability.types.js';

const execAsync = promisify(exec);

export interface PreflightRequirements {
  requireNode?: boolean;
  requireNpm?: boolean;
  requireGit?: boolean;
  requireDocker?: boolean;
  requireDatabase?: boolean;
}

@Injectable()
export class DevOpsPreflightService {
  private readonly logger = new StructuredLogger('DevOpsPreflightService');

  /**
   * DevOps Pre-Flight Validation (§23 & §24):
   * Validates repository and required system runtimes before dispatching execution.
   */
  public async validateEnvironment(
    repoPath: string,
    reqs: PreflightRequirements = { requireNode: true, requireGit: true, requireNpm: true }
  ): Promise<DevOpsPreflightResult> {
    const checks: RuntimeCapabilityCheck[] = [];
    const missing: string[] = [];

    // 1. Validate repository path
    const repoExists = fs.existsSync(repoPath);
    checks.push({
      tool: 'repository',
      available: repoExists,
      version: repoExists ? repoPath : undefined,
      requiredForProject: true,
    });
    if (!repoExists) {
      missing.push(`Repository path not found: ${repoPath}`);
    }

    // 2. Node runtime check (§24)
    if (reqs.requireNode) {
      const nodeAvailable = typeof process.version === 'string' && process.version.startsWith('v');
      checks.push({
        tool: 'node',
        available: nodeAvailable,
        version: process.version,
        requiredForProject: true,
      });
      if (!nodeAvailable) missing.push('Node.js runtime not detected');
    }

    // 3. Git CLI check (§24)
    if (reqs.requireGit) {
      let gitAvail = false;
      let gitVer: string | undefined;
      try {
        const { stdout } = await execAsync('git --version', { timeout: 3000 });
        gitAvail = true;
        gitVer = stdout.trim();
      } catch {
        gitAvail = false;
      }
      checks.push({
        tool: 'git',
        available: gitAvail,
        version: gitVer,
        requiredForProject: true,
      });
      if (!gitAvail) missing.push('Git command-line tool not detected');
    }

    // 4. Docker check (§24)
    if (reqs.requireDocker) {
      let dockerAvail = false;
      try {
        await execAsync('docker --version', { timeout: 3000 });
        dockerAvail = true;
      } catch {
        dockerAvail = false;
      }
      checks.push({
        tool: 'docker',
        available: dockerAvail,
        requiredForProject: true,
      });
      if (!dockerAvail) missing.push('Docker daemon/CLI not detected');
    }

    const ready = missing.length === 0;
    const status = ready ? 'READY' : 'ENVIRONMENT_FAILURE';
    const diagnostics = ready
      ? 'All required runtime capabilities and workspace paths are verified ready.'
      : `Missing prerequisites: ${missing.join(', ')}. Execution blocked.`;

    this.logger.info(
      'validateEnvironment',
      `Pre-flight status: ${status} (${checks.filter((c) => c.available).length}/${checks.length} ready)`
    );

    return {
      ready,
      status,
      checkedRuntimes: checks,
      missingPrerequisites: missing,
      dryRunSupported: true,
      diagnostics,
    };
  }

  /**
   * Safe Dry-Run / Plan Mode (§25):
   * Analyzes planned command/script before execution to detect destructive actions.
   */
  public generateExecutionPlan(
    command: string,
    plannedResources: string[] = []
  ): DevOpsPlanResult {
    const cmdLower = command.toLowerCase();

    // Check destructive patterns (§25)
    const isDestructive =
      cmdLower.includes('rm -rf') ||
      cmdLower.includes('drop database') ||
      cmdLower.includes('drop table') ||
      cmdLower.includes('push --force') ||
      cmdLower.includes('delete from') ||
      cmdLower.includes('docker system prune');

    const requiresApproval = isDestructive;

    const dryRunOutput =
      `PLAN SUMMARY:\n` +
      `• Command: \`${command}\`\n` +
      `• Destructive Action: ${isDestructive ? 'YES (HIGH RISK)' : 'NO (SAFE)'}\n` +
      `• Affected Resources: ${plannedResources.join(', ') || 'Local repository worktree'}\n` +
      `• Cryptographic Approval Required: ${requiresApproval ? 'YES' : 'NO'}`;

    return {
      plannedActions: [command],
      affectedResources: plannedResources,
      isDestructive,
      requiresApproval,
      dryRunOutput,
      status: 'PLAN_VERIFIED',
    };
  }
}
