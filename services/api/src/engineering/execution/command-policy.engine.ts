// ==========================================================
// services/api/src/engineering/execution/command-policy.engine.ts
// Phase 15.2: Security Policy Engine for Command Execution & Secret Safety
// ==========================================================

import * as path from 'path';
import { redactSecretsFromString } from '@kdi/shared';
import type {
  CommandSecurityCategory,
  CommandSecurityDecision,
} from './engineering-execution.types.js';

export class CommandPolicyEngine {
  // ── 1. SAFE Commands: Zero or localized side-effects ────────
  private static readonly SAFE_COMMAND_PATTERNS = [
    // Inspection & status
    /^git\s+(status|diff|log|show|branch|rev-parse|describe)(\s+.*)?$/i,
    /^(ls|dir|pwd|echo|cat|type|head|tail|find|grep|rg|which|where)(\s+.*)?$/i,
    // Testing & verification
    /^(npm\s+test|npm\s+run\s+test|node\s+--test|npm\s+run\s+lint|npm\s+run\s+typecheck|npm\s+run\s+build|npx\s+tsc)(\s+.*)?$/i,
    /^(pytest|python\s+-m\s+unittest|python\s+-m\s+pytest|vitest|jest|composer\s+test|cargo\s+test|cargo\s+check|go\s+test)(\s+.*)?$/i,
  ];

  // ── 2. RESTRICTED Commands: Package installation, git staging ─
  private static readonly RESTRICTED_COMMAND_PATTERNS = [
    /^git\s+(add|commit|checkout\s+-b|switch\s+-c)(\s+.*)?$/i,
    /^(npm\s+install|npm\s+ci|composer\s+install|cargo\s+build|pip\s+install)(\s+.*)?$/i,
    /^docker\s+(build|compose\s+build)(\s+.*)?$/i,
  ];

  // ── 3. DANGEROUS Commands: Destructive git, external publish, prod modifications
  private static readonly DANGEROUS_COMMAND_PATTERNS = [
    /git\s+push(\s+.*)?/i,
    /git\s+reset\s+--hard/i,
    /git\s+clean\s+-fd/i,
    /git\s+checkout\s+(main|master|production|release)/i,
    /git\s+branch\s+-D/i,
    /npm\s+publish/i,
    /docker\s+push/i,
    /deploy/i,
    /DROP\s+(DATABASE|SCHEMA|TABLE)/i,
    /TRUNCATE\s+TABLE/i,
    /migration\s+run/i,
  ];

  // ── 4. FORBIDDEN Commands: Irreversible destruction, privilege escalation, secret dumping
  private static readonly FORBIDDEN_COMMAND_PATTERNS = [
    /rm\s+-rf\s+[\/~]/i,
    /sudo/i,
    /su\s+/i,
    /chmod\s+(-R\s+)?777/i,
    /chown/i,
    /mkfs/i,
    /dd\s+if=/i,
    /docker\s+system\s+prune/i,
    /format\s+[a-z]:/i,
    /curl.*\|\s*sh/i,
    /wget.*\|\s*sh/i,
    /cat\s+.*\.env(\b|$)/i, // reading raw env secrets
    /type\s+.*\.env(\b|$)/i,
    /id_rsa/i,
    /secret_key/i,
    /export\s+\w+=(password|token|secret|key)/i,
  ];

  /**
   * Evaluate a command string against security policy rules
   */
  public static evaluate(command: string): CommandSecurityDecision {
    const trimmed = command.trim();

    // 1. Check FORBIDDEN first
    for (const pattern of this.FORBIDDEN_COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          command: this.scrub(trimmed),
          category: 'FORBIDDEN',
          action: 'DENY',
          reason: 'Command strictly forbidden: potential privilege escalation, destructive data loss, or secret dumping.',
        };
      }
    }

    // 2. Check DANGEROUS
    for (const pattern of this.DANGEROUS_COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          command: this.scrub(trimmed),
          category: 'DANGEROUS',
          action: 'HUMAN_APPROVAL_REQUIRED',
          reason: 'Dangerous operation targeting external systems, protected branches, or destructive git states. Requires explicit approval.',
        };
      }
    }

    // 3. Check RESTRICTED
    for (const pattern of this.RESTRICTED_COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          command: this.scrub(trimmed),
          category: 'RESTRICTED',
          action: 'ALLOW', // Allowed in isolated worktree, but logged
          reason: 'Restricted engineering operation allowed inside isolated workspace.',
        };
      }
    }

    // 4. Check SAFE
    for (const pattern of this.SAFE_COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          command: this.scrub(trimmed),
          category: 'SAFE',
          action: 'ALLOW',
        };
      }
    }

    // 5. Default posture for unrecognized commands
    return {
      command: this.scrub(trimmed),
      category: 'RESTRICTED',
      action: 'HUMAN_APPROVAL_REQUIRED',
      reason: 'Command not recognized in verified engineering policy whitelist; requires human approval.',
    };
  }

  /**
   * Redact secrets from command string
   */
  public static scrub(text: string): string {
    return redactSecretsFromString(text);
  }

  /**
   * Check if a path stays within the assigned worktree boundary
   */
  public static isPathWithinWorktree(targetPath: string, worktreePath: string): boolean {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedWorktree = path.resolve(worktreePath);
    return (
      resolvedTarget === resolvedWorktree ||
      resolvedTarget.startsWith(resolvedWorktree + path.sep)
    );
  }
}
