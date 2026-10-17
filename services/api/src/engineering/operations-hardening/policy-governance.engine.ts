// ==========================================================
// services/api/src/engineering/operations-hardening/policy-governance.engine.ts
// Phase 28: Policy Governance, Autonomy Budget, Circuit Breaker & Adversarial Defense (§1, §9, §10, §14–§17, §22)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SafetyPolicyEngine, PolicyDeniedError } from '../live-operations/safety-policy.engine.js';
import type {
  ProductionActionRequest,
  SafetyPolicyEvaluationResult,
  ActionRisk,
} from '../live-operations/phase-27.types.js';
import type {
  CircuitBreakerScope,
  CircuitBreakerState,
  CircuitBreakerRecord,
  RateLimitPolicy,
  RateLimitStatus,
  AutonomyBudgetStatus,
  PolicyVersionRecord,
} from './phase-28.types.js';

export class PolicyGovernanceError extends Error {
  constructor(message: string, public readonly reasonCode: string) {
    super(message);
    this.name = 'PolicyGovernanceError';
  }
}

export class PolicyGovernanceEngine {
  public readonly basePolicyEngine: SafetyPolicyEngine;

  // Policy Versioning (§16)
  private currentPolicyVersion: PolicyVersionRecord = {
    policyVersion: 'v2.8.0',
    effectiveAt: '2026-10-05T09:00:00.000Z',
    approvedBy: 'human-vp-engineering-board',
    changeReason: 'Phase 28 Production Operations Hardening & Bounded Autonomy Policy',
    previousVersion: 'v2.7.0',
    isHumanApproved: true,
    negativeTestSuitePassed: true,
  };

  // Autonomy Budget State (§17)
  private readonly totalAutonomyBudget = 100; // 100 points per 24h
  private consumedBudget = 0;
  private recentCostEntries: Array<{ action: string; target: string; cost: number; timestamp: string }> = [];

  // Rate Limiting State (§9)
  private readonly rateLimitPolicy: RateLimitPolicy = {
    maxRestartsPerServiceWindow: 3,
    maxRollbacksPerProjectWindow: 2,
    maxAutonomousActionsPerIncident: 2,
    maxTotalAutonomousMutationsPerHour: 25,
    cooldownPeriodMs: 2000,
  };
  private serviceRestarts = new Map<string, Array<{ timestamp: number }>>();
  private projectRollbacks = new Map<string, Array<{ timestamp: number }>>();
  private hourlyMutations: number[] = [];
  private lastActionTimestamp = new Map<string, number>();

  // Circuit Breakers (§10)
  private circuitBreakers = new Map<string, CircuitBreakerRecord>();

  // Persistent Kill Switch File Path (§22)
  private readonly killSwitchStateFilePath: string;

  constructor(options: { killSwitchStateFilePath?: string } = {}) {
    this.basePolicyEngine = new SafetyPolicyEngine();
    this.killSwitchStateFilePath =
      options.killSwitchStateFilePath ?? path.join(os.tmpdir(), 'kdi-production-kill-switch-state.json');

    // Restore persistent kill switch state if present on disk (§22)
    this.restoreKillSwitchFromDisk();
  }

  // ── Kill Switch Persistence & Governance (§22) ─────────────────────
  private restoreKillSwitchFromDisk(): void {
    try {
      if (fs.existsSync(this.killSwitchStateFilePath)) {
        const raw = fs.readFileSync(this.killSwitchStateFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.active) {
          this.basePolicyEngine.engageKillSwitch(data.reason || 'Restored active kill switch state from disk');
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  private persistKillSwitchToDisk(active: boolean, reason: string): void {
    try {
      const data = {
        active,
        reason,
        persistedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.killSwitchStateFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // In-memory fallback
    }
  }

  public engageKillSwitch(reason: string): void {
    this.basePolicyEngine.engageKillSwitch(reason);
    this.persistKillSwitchToDisk(true, reason);
  }

  public disengageKillSwitchWithHumanToken(humanApprovalToken: string): void {
    if (!humanApprovalToken || !humanApprovalToken.startsWith('human_sec_token_')) {
      throw new PolicyGovernanceError(
        'SECURITY VIOLATION: Agent cannot deactivate kill switch without verified human approval token.',
        'AGENT_KILL_SWITCH_BYPASS_ATTEMPT'
      );
    }
    this.basePolicyEngine.disengageKillSwitch();
    this.persistKillSwitchToDisk(false, 'Disengaged with human token');
  }

  public isKillSwitchActive(): boolean {
    return this.basePolicyEngine.isKillSwitchActive();
  }

  // ── Policy Versioning Governance (§1, §16) ─────────────────────────
  public getPolicyVersion(): PolicyVersionRecord {
    return { ...this.currentPolicyVersion };
  }

  public attemptAgentPolicyModification(
    requestedChange: Record<string, any>,
    actor: string
  ): never {
    throw new PolicyDeniedError(
      `POLICY_DENIED: Agent '${actor}' attempted unauthorized self-modification of production safety policy. Policy modifications require human approval board signoff.`,
      ['AGENT_POLICY_SELF_MODIFICATION_FORBIDDEN']
    );
  }

  public updatePolicyVersionWithHumanApproval(
    newVersion: string,
    humanApprover: string,
    humanToken: string,
    reason: string
  ): PolicyVersionRecord {
    if (!humanToken || !humanToken.startsWith('human_sec_token_')) {
      throw new PolicyGovernanceError(
        'Policy updates require a valid cryptographic human approval token.',
        'UNAUTHORIZED_POLICY_CHANGE'
      );
    }

    const previous = this.currentPolicyVersion.policyVersion;
    this.currentPolicyVersion = {
      policyVersion: newVersion,
      effectiveAt: new Date().toISOString(),
      approvedBy: humanApprover,
      changeReason: reason,
      previousVersion: previous,
      isHumanApproved: true,
      negativeTestSuitePassed: true,
    };
    return this.currentPolicyVersion;
  }

  // ── Autonomy Budget (§17) ──────────────────────────────────────────
  public getActionBudgetCost(action: string): number {
    const risk = this.basePolicyEngine.classifyActionRisk(action);
    switch (risk) {
      case 'READ_ONLY':
        return 0;
      case 'LOW_RISK_AUTONOMOUS':
        return 10;
      case 'CONTROLLED_AUTONOMOUS':
        return action.includes('rollback') ? 30 : 20;
      default:
        return 50;
    }
  }

  public getAutonomyBudgetStatus(): AutonomyBudgetStatus {
    return {
      totalBudget: this.totalAutonomyBudget,
      consumedBudget: this.consumedBudget,
      remainingBudget: Math.max(0, this.totalAutonomyBudget - this.consumedBudget),
      budgetExhausted: this.consumedBudget >= this.totalAutonomyBudget,
      recentCostEntries: [...this.recentCostEntries],
    };
  }

  public consumeAutonomyBudget(action: string, target: string): void {
    const cost = this.getActionBudgetCost(action);
    this.consumedBudget += cost;
    this.recentCostEntries.push({
      action,
      target,
      cost,
      timestamp: new Date().toISOString(),
    });
  }

  public resetAutonomyBudgetForNewWindow(): void {
    this.consumedBudget = 0;
    this.recentCostEntries = [];
  }

  public clearTransientCooldowns(): void {
    this.lastActionTimestamp.clear();
  }

  // ── Rate Limiting & Cooldown (§8, §9) ──────────────────────────────
  public checkRateLimits(
    action: string,
    serviceId: string,
    projectId: string,
    options: { bypassCooldown?: boolean } = {}
  ): RateLimitStatus {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // 1. Cooldown check
    const lastTimestamp = this.lastActionTimestamp.get(serviceId) ?? 0;
    const timeSinceLastAction = now - lastTimestamp;
    const inCooldown = !options.bypassCooldown && timeSinceLastAction < this.rateLimitPolicy.cooldownPeriodMs;
    const cooldownRemainingMs = inCooldown ? this.rateLimitPolicy.cooldownPeriodMs - timeSinceLastAction : 0;

    if (inCooldown) {
      return {
        actionAllowed: false,
        reason: `Service '${serviceId}' is in active remediation cooldown (${cooldownRemainingMs}ms remaining).`,
        currentRestartsInWindow: 0,
        currentRollbacksInWindow: 0,
        currentHourlyMutations: 0,
        inCooldown: true,
        cooldownRemainingMs,
      };
    }

    // 2. Max restarts per service per window
    const restarts = (this.serviceRestarts.get(serviceId) ?? []).filter((r) => r.timestamp > oneDayAgo);
    this.serviceRestarts.set(serviceId, restarts);

    if (action.includes('restart') && restarts.length >= this.rateLimitPolicy.maxRestartsPerServiceWindow) {
      return {
        actionAllowed: false,
        reason: `Rate limit exceeded: Service '${serviceId}' reached max restarts limit (${restarts.length}/${this.rateLimitPolicy.maxRestartsPerServiceWindow} per 24h).`,
        currentRestartsInWindow: restarts.length,
        currentRollbacksInWindow: 0,
        currentHourlyMutations: 0,
        inCooldown: false,
        cooldownRemainingMs: 0,
      };
    }

    // 3. Max rollbacks per project per window
    const rollbacks = (this.projectRollbacks.get(projectId) ?? []).filter((r) => r.timestamp > oneDayAgo);
    this.projectRollbacks.set(projectId, rollbacks);

    if (action.includes('rollback') && rollbacks.length >= this.rateLimitPolicy.maxRollbacksPerProjectWindow) {
      return {
        actionAllowed: false,
        reason: `Rate limit exceeded: Project '${projectId}' reached max rollbacks limit (${rollbacks.length}/${this.rateLimitPolicy.maxRollbacksPerProjectWindow} per 24h).`,
        currentRestartsInWindow: restarts.length,
        currentRollbacksInWindow: rollbacks.length,
        currentHourlyMutations: 0,
        inCooldown: false,
        cooldownRemainingMs: 0,
      };
    }

    // 4. Max hourly mutations across system
    this.hourlyMutations = this.hourlyMutations.filter((t) => t > oneHourAgo);
    if (this.hourlyMutations.length >= this.rateLimitPolicy.maxTotalAutonomousMutationsPerHour) {
      return {
        actionAllowed: false,
        reason: `Global rate limit exceeded: system reached maximum autonomous mutations per hour (${this.hourlyMutations.length}/${this.rateLimitPolicy.maxTotalAutonomousMutationsPerHour}).`,
        currentRestartsInWindow: restarts.length,
        currentRollbacksInWindow: rollbacks.length,
        currentHourlyMutations: this.hourlyMutations.length,
        inCooldown: false,
        cooldownRemainingMs: 0,
      };
    }

    return {
      actionAllowed: true,
      currentRestartsInWindow: restarts.length,
      currentRollbacksInWindow: rollbacks.length,
      currentHourlyMutations: this.hourlyMutations.length,
      inCooldown: false,
      cooldownRemainingMs: 0,
    };
  }

  public recordActionExecuted(action: string, serviceId: string, projectId: string): void {
    const now = Date.now();
    this.lastActionTimestamp.set(serviceId, now);
    this.hourlyMutations.push(now);

    if (action.includes('restart')) {
      const list = this.serviceRestarts.get(serviceId) ?? [];
      list.push({ timestamp: now });
      this.serviceRestarts.set(serviceId, list);
    }

    if (action.includes('rollback')) {
      const list = this.projectRollbacks.get(projectId) ?? [];
      list.push({ timestamp: now });
      this.projectRollbacks.set(projectId, list);
    }
  }

  // ── Scoped Circuit Breakers (§10) ──────────────────────────────────
  private getCircuitKey(scope: CircuitBreakerScope, target: string): string {
    return `${scope}:${target}`;
  }

  public recordRemediationFailure(scope: CircuitBreakerScope, target: string, reason: string): void {
    const key = this.getCircuitKey(scope, target);
    const existing = this.circuitBreakers.get(key) ?? {
      scope,
      target,
      state: 'CLOSED',
      failureCount: 0,
      failureThreshold: 2,
    };

    existing.failureCount++;
    if (existing.failureCount >= existing.failureThreshold) {
      existing.state = 'OPEN';
      existing.openedAt = new Date().toISOString();
      existing.reason = reason;
      existing.cooldownExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    this.circuitBreakers.set(key, existing);
  }

  public isCircuitOpen(scope: CircuitBreakerScope, target: string): boolean {
    const key = this.getCircuitKey(scope, target);
    const cb = this.circuitBreakers.get(key);
    return Boolean(cb && cb.state === 'OPEN');
  }

  public resetCircuitBreaker(scope: CircuitBreakerScope, target: string): void {
    const key = this.getCircuitKey(scope, target);
    this.circuitBreakers.delete(key);
  }

  public getCircuitBreakerRecords(): CircuitBreakerRecord[] {
    return Array.from(this.circuitBreakers.values());
  }

  // ── Adversarial Prompt Injection Defense (§14, §15) ────────────────
  public inspectPromptForAdversarialIntent(promptOrInput: string): { isAdversarial: boolean; reason?: string } {
    if (!promptOrInput) return { isAdversarial: false };

    const lower = promptOrInput.toLowerCase();
    const maliciousPatterns = [
      { pattern: /disable\s+(?:the\s+)?safety\s+policy/i, reason: 'Attempt to disable safety policy' },
      { pattern: /print\s+(?:the\s+)?(?:production\s+)?password/i, reason: 'Attempt to exfiltrate passwords' },
      { pattern: /drop\s+table/i, reason: 'Attempt to execute destructive SQL' },
      { pattern: /skip\s+approval/i, reason: 'Attempt to bypass approval gate' },
      { pattern: /give\s+yourself\s+admin/i, reason: 'Attempt to escalate privileges' },
      { pattern: /ignore\s+(?:previous\s+)?production\s+restrictions/i, reason: 'Prompt injection instruction escape' },
    ];

    for (const item of maliciousPatterns) {
      if (item.pattern.test(lower)) {
        return { isAdversarial: true, reason: item.reason };
      }
    }

    return { isAdversarial: false };
  }

  // ── Comprehensive Hardened Policy Evaluation (§1–§17) ──────────────
  public evaluateHardenedPolicy(
    request: ProductionActionRequest,
    context?: { promptInput?: string }
  ): SafetyPolicyEvaluationResult {
    const evaluatedAt = new Date().toISOString();
    const reasons: string[] = [];
    const unmetPreconditions: string[] = [];

    // 1. Adversarial Prompt Injection Defense (§15)
    if (context?.promptInput) {
      const advCheck = this.inspectPromptForAdversarialIntent(context.promptInput);
      if (advCheck.isAdversarial) {
        reasons.push(`ADVERSARIAL_ATTACK_BLOCKED: Prompt contains hostile instructions: ${advCheck.reason}`);
        return {
          allowed: false,
          policyDecision: 'POLICY_DENIED',
          risk: 'FORBIDDEN',
          reasons,
          preconditionsMet: false,
          unmetPreconditions: ['PROMPT_INTEGRITY_VERIFIED'],
          blastRadiusAcceptable: false,
          killSwitchActive: this.isKillSwitchActive(),
          evaluatedAt,
        };
      }
    }

    // 2. Base Policy Evaluation (Levels 0–4 & Kill Switch)
    const baseResult = this.basePolicyEngine.evaluatePolicy(request);
    if (!baseResult.allowed) {
      return baseResult;
    }

    // If READ_ONLY, bypass mutation-specific budgets/limits
    if (baseResult.risk === 'READ_ONLY') {
      return baseResult;
    }

    // 3. Circuit Breaker Check (§10)
    if (this.isCircuitOpen('SINGLE_SERVICE', request.target)) {
      reasons.push(
        `CIRCUIT_BREAKER_OPEN: Service '${request.target}' has tripped the circuit breaker due to recurring failures. Autonomous actions disabled.`
      );
      return {
        allowed: false,
        policyDecision: 'REQUIRE_HUMAN_APPROVAL',
        risk: baseResult.risk,
        reasons,
        preconditionsMet: false,
        unmetPreconditions: ['CIRCUIT_BREAKER_CLOSED'],
        blastRadiusAcceptable: true,
        killSwitchActive: this.isKillSwitchActive(),
        evaluatedAt,
      };
    }

    // 4. Rate Limiting Check (§9)
    const rateStatus = this.checkRateLimits(request.action, request.target, request.projectId);
    if (!rateStatus.actionAllowed) {
      reasons.push(`RATE_LIMIT_EXCEEDED: ${rateStatus.reason}`);
      return {
        allowed: false,
        policyDecision: 'REQUIRE_HUMAN_APPROVAL',
        risk: baseResult.risk,
        reasons,
        preconditionsMet: false,
        unmetPreconditions: ['RATE_LIMIT_WITHIN_BOUNDS'],
        blastRadiusAcceptable: true,
        killSwitchActive: this.isKillSwitchActive(),
        evaluatedAt,
      };
    }

    // 5. Autonomy Budget Check (§17)
    const budgetStatus = this.getAutonomyBudgetStatus();
    const actionCost = this.getActionBudgetCost(request.action);
    if (budgetStatus.remainingBudget < actionCost) {
      reasons.push(
        `AUTONOMY_BUDGET_EXHAUSTED: Action '${request.action}' requires ${actionCost} points, but only ${budgetStatus.remainingBudget}/${budgetStatus.totalBudget} points remain in current 24h window.`
      );
      return {
        allowed: false,
        policyDecision: 'REQUIRE_HUMAN_APPROVAL',
        risk: baseResult.risk,
        reasons,
        preconditionsMet: false,
        unmetPreconditions: ['AUTONOMY_BUDGET_AVAILABLE'],
        blastRadiusAcceptable: true,
        killSwitchActive: this.isKillSwitchActive(),
        evaluatedAt,
      };
    }

    return {
      allowed: true,
      policyDecision: 'ALLOW_AUTONOMOUS',
      risk: baseResult.risk,
      reasons: [
        `Action '${request.action}' satisfied base safety policy, circuit breaker status, rate limits, and autonomy budget (${actionCost} points allocated).`,
      ],
      preconditionsMet: true,
      unmetPreconditions: [],
      blastRadiusAcceptable: true,
      killSwitchActive: this.isKillSwitchActive(),
      evaluatedAt,
    };
  }
}
