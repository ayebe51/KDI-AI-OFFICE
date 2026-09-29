// ==========================================================
// services/api/src/engineering/security/command-classifier.ts
// Command Risk Classification & Permission Policy Enforcement
// ==========================================================

import type {
  CommandCategory,
  CommandPermissionAction,
  CommandPolicyDecision,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

export class CommandClassifier {
  private static readonly logger = new StructuredLogger('CommandClassifier');

  // Read-only inspection commands (Zero side-effects)
  private static readonly READ_ONLY_PREFIXES = [
    'ls',
    'dir',
    'pwd',
    'echo',
    'cat',
    'type',
    'head',
    'tail',
    'find',
    'grep',
    'rg',
    'which',
    'where',
    'git status',
    'git diff',
    'git log',
    'git branch',
    'git show',
    'git rev-parse',
  ];

  // Standard safe engineering commands in repository workspace
  private static readonly NORMAL_ENGINEERING_PREFIXES = [
    'npm test',
    'npm run test',
    'npm run lint',
    'npm run typecheck',
    'npm run build',
    'npm install',
    'npm ci',
    'npx tsc',
    'pytest',
    'python -m unittest',
    'python -m pytest',
    'node --test',
    'vitest',
    'jest',
    'composer test',
    'php artisan test',
    'cargo test',
    'cargo check',
    'go test',
  ];

  // Explicitly forbidden commands that are always DENIED
  private static readonly FORBIDDEN_PATTERNS = [
    /rm\s+-rf\s+[\/~]/i,
    /sudo/i,
    /su\s+/i,
    /chmod\s+(-R\s+)?777/i,
    /chown/i,
    /mkfs/i,
    /dd\s+if=/i,
    /docker\s+system\s+prune/i,
    /DROP\s+(DATABASE|SCHEMA|TABLE)/i,
    /TRUNCATE\s+TABLE/i,
    /DELETE\s+FROM\s+\w+\s*;?$/i, // unconditional delete
    /format\s+[a-z]:/i,
    /curl.*\|\s*sh/i,
    /wget.*\|\s*sh/i,
  ];

  // High-risk commands that REQUIRE explicit human approval
  private static readonly HIGH_RISK_PATTERNS = [
    /git\s+push/i,
    /git\s+reset\s+--hard/i,
    /git\s+clean\s+-fd/i,
    /git\s+checkout\s+(main|master|production)/i,
    /npm\s+publish/i,
    /docker\s+push/i,
    /deploy/i,
    /prod/i,
    /secret/i,
    /credential/i,
    /keytool/i,
    /ssh-keygen/i,
    /export\s+\w+=\w+/i,
  ];

  /**
   * Classify a command string into category and permission decision
   */
  public static evaluate(command: string): CommandPolicyDecision {
    const trimmed = command.trim();

    // 1. Check for immediate DENY rules
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(trimmed)) {
        this.logger.warn('evaluate', `Command explicitly DENIED by policy: "${trimmed}"`);
        return {
          command: trimmed,
          category: 'HIGH_RISK',
          action: 'DENY',
          reason: 'Command violates strict system safety policy (destructive or privilege escalation)',
        };
      }
    }

    // 2. Check for HIGH_RISK approval gates
    for (const pattern of this.HIGH_RISK_PATTERNS) {
      if (pattern.test(trimmed)) {
        this.logger.info('evaluate', `Command flagged HIGH_RISK: requires human approval: "${trimmed}"`);
        return {
          command: trimmed,
          category: 'HIGH_RISK',
          action: 'HUMAN_APPROVAL_REQUIRED',
          reason: 'High-risk operation targeting protected branch, repository history, or external deployment',
        };
      }
    }

    // 3. Check for READ_ONLY
    const lower = trimmed.toLowerCase();
    const isReadOnly = this.READ_ONLY_PREFIXES.some((prefix) =>
      lower === prefix || lower.startsWith(`${prefix} `) || lower.startsWith(`${prefix}.`)
    );

    if (isReadOnly) {
      return {
        command: trimmed,
        category: 'READ_ONLY',
        action: 'ALLOW',
      };
    }

    // 4. Check for NORMAL_ENGINEERING
    const isNormalEngineering = this.NORMAL_ENGINEERING_PREFIXES.some((prefix) =>
      lower === prefix || lower.startsWith(`${prefix} `)
    );

    if (isNormalEngineering) {
      return {
        command: trimmed,
        category: 'NORMAL_ENGINEERING',
        action: 'ALLOW',
      };
    }

    // 5. Default posture for unrecognized commands
    // In secure enterprise environment, unknown non-standard commands require approval
    return {
      command: trimmed,
      category: 'HIGH_RISK',
      action: 'HUMAN_APPROVAL_REQUIRED',
      reason: 'Command is not in verified engineering whitelist; human approval required',
    };
  }
}
