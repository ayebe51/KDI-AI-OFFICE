// ==========================================================
// services/api/src/engineering/phase30/phase30-policy.ts
// Phase 30.2: Authoritative Policy Engine & Safety Gates (§4, §11, §17, §18)
// ==========================================================

import { Injectable, Optional } from '@nestjs/common';
import { PolicyGovernanceEngine } from '../operations-hardening/policy-governance.engine.js';
import type {
  ExecutionRequest,
  PolicyEvaluation,
  RiskAssessment,
  AutonomyLevel,
  ApprovalRecord,
  BenchmarkEnvelope,
} from './phase30.types.js';

export class PolicyViolationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export interface Phase30PolicyConfig {
  governanceEngine?: PolicyGovernanceEngine;
  autonomousProductionEnabled?: boolean;
  killSwitchStateFilePath?: string;
}

@Injectable()
export class Phase30Policy {
  public readonly governanceEngine: PolicyGovernanceEngine;
  public readonly autonomousProductionEnabled: boolean;

  // Stored human approval records
  private readonly approvals = new Map<string, ApprovalRecord>();

  // Phase 30.3 Narrowly Scoped Benchmark Envelope (§4)
  private benchmarkEnvelope?: BenchmarkEnvelope;
  private envelopeDeploymentCount = 0;
  private envelopeRollbackCount = 0;

  constructor(@Optional() config?: Phase30PolicyConfig) {
    this.governanceEngine =
      config?.governanceEngine ||
      new PolicyGovernanceEngine(
        config?.killSwitchStateFilePath
          ? { killSwitchStateFilePath: config.killSwitchStateFilePath }
          : {}
      );
    // In Phase 30.2/30.3, Section 4 mandates this remains false by default
    this.autonomousProductionEnabled = config?.autonomousProductionEnabled ?? false;
  }

  public registerApproval(record: ApprovalRecord): void {
    this.approvals.set(record.approvalToken, record);
  }

  public setBenchmarkEnvelope(envelope: BenchmarkEnvelope): void {
    if (!envelope.benchmarkId || !envelope.humanSignatureOrAuthToken) {
      throw new Error('Invalid benchmark envelope: Missing benchmarkId or human authorization signature');
    }
    this.benchmarkEnvelope = envelope;
    this.envelopeDeploymentCount = 0;
    this.envelopeRollbackCount = 0;
  }

  public getBenchmarkEnvelope(): BenchmarkEnvelope | undefined {
    return this.benchmarkEnvelope;
  }

  public clearBenchmarkEnvelope(): void {
    this.benchmarkEnvelope = undefined;
    this.envelopeDeploymentCount = 0;
    this.envelopeRollbackCount = 0;
  }

  public recordEnvelopeDeployment(): void {
    this.envelopeDeploymentCount++;
  }

  public recordEnvelopeRollback(): void {
    this.envelopeRollbackCount++;
  }

  public evaluate(request: ExecutionRequest, risk: RiskAssessment): PolicyEvaluation {
    const now = new Date().toISOString();

    // 1. Check Kill Switch (§17)
    if (this.governanceEngine.isKillSwitchActive()) {
      return {
        allowed: false,
        autonomyLevel: 'LEVEL_4',
        requiresHumanApproval: true,
        rejectionReason: 'KILL_SWITCH_ACTIVE: Global production safety kill switch is engaged. All execution blocked.',
        circuitBreakerOpen: false,
        rateLimitExceeded: false,
        budgetExhausted: false,
        killSwitchActive: true,
        evalTimestamp: now,
      };
    }

    // 2. Destructive SQL / Forbidden Level 4 checks (§4)
    if (risk.isSchemaBreaking && request.environment === 'PRODUCTION') {
      return {
        allowed: false,
        autonomyLevel: 'LEVEL_4',
        requiresHumanApproval: true,
        rejectionReason: 'POLICY_DENIED: Schema-breaking or irreversible DDL in PRODUCTION is forbidden under Level 4.',
        circuitBreakerOpen: false,
        rateLimitExceeded: false,
        budgetExhausted: false,
        killSwitchActive: false,
        evalTimestamp: now,
      };
    }

    // 3. Section 4 & 18 Safety Boundary: Production deployment controls
    if (request.environment === 'PRODUCTION' && !this.autonomousProductionEnabled) {
      const envelope = this.benchmarkEnvelope;

      // 3.A: Check if request is targeting an active Benchmark Envelope (§4)
      if (envelope && request.benchmarkId === envelope.benchmarkId) {
        const currentTime = Date.now();
        const windowStart = new Date(envelope.approvedTimeWindow.start).getTime();
        const windowEnd = new Date(envelope.approvedTimeWindow.end).getTime();

        if (currentTime < windowStart || currentTime > windowEnd) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: `ENVELOPE_TIME_EXPIRED: Benchmark envelope time window has expired or is not yet active (Window: ${envelope.approvedTimeWindow.start} to ${envelope.approvedTimeWindow.end}).`,
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        if (envelope.approvedProject !== request.project) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: `ENVELOPE_SCOPE_MISMATCH: Request project '${request.project}' does not match approved envelope project '${envelope.approvedProject}'.`,
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        if (envelope.approvedService !== request.service) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: `ENVELOPE_SCOPE_MISMATCH: Request service '${request.service}' does not match approved envelope service '${envelope.approvedService}'.`,
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        if (envelope.approvedEnvironment !== request.environment) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: `ENVELOPE_SCOPE_MISMATCH: Request environment '${request.environment}' does not match approved envelope environment '${envelope.approvedEnvironment}'.`,
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        if (this.envelopeDeploymentCount >= envelope.maximumDeploymentCount) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: `ENVELOPE_LIMIT_EXCEEDED: Maximum deployment count (${envelope.maximumDeploymentCount}) for this benchmark envelope reached.`,
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        // Check if task / release scope matches
        const matchesScope = envelope.approvedReleaseOrTaskScope.some(
          (s) => request.requestId.includes(s) || request.version.includes(s) || s === '*'
        );
        if (!matchesScope) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: `ENVELOPE_SCOPE_MISMATCH: Request scope (${request.requestId} v${request.version}) is not included in approved envelope scope.`,
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        // Check risk eligibility for autonomous deployment (§4, §10, §14):
        // Only LOW risk changes are eligible for autonomous deployment inside the envelope!
        if (risk.riskLevel === 'LOW' && envelope.allowedAutonomyMode === 'BOUNDED_LOW_RISK_ONLY') {
          // Eligible for autonomous canary under envelope; does not require separate approval token
        } else {
          // Medium, High, Critical, or Unknown risk -> MUST REQUIRE EXPLICIT HUMAN APPROVAL!
          if (!request.approvalToken) {
            return {
              allowed: false,
              autonomyLevel: 'LEVEL_3',
              requiresHumanApproval: true,
              rejectionReason: `APPROVAL_REQUIRED: Release risk is elevated (${risk.riskLevel}). Bounded autonomy permits only LOW risk releases; human approval required.`,
              circuitBreakerOpen: false,
              rateLimitExceeded: false,
              budgetExhausted: false,
              killSwitchActive: false,
              evalTimestamp: now,
            };
          }
        }
      } else {
        // 3.B: Standard non-envelope production request -> strictly requires human approval token
        if (!request.approvalToken) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason:
              'APPROVAL_REQUIRED: Production deployment requested without human approval token. Autonomous production is disabled.',
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }
      }

      // If approvalToken is provided (either for non-envelope, or elevated risk in envelope), validate it:
      if (request.approvalToken) {
        const approval = this.approvals.get(request.approvalToken);
        if (!approval) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: 'INVALID_APPROVAL: Approval token is unrecognized, forged, or invalid.',
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        if (approval.isUsed) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: 'REPLAYED_APPROVAL: Approval token has already been consumed (replay prevention).',
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        if (new Date(approval.expiresAt).getTime() < Date.now()) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: 'EXPIRED_APPROVAL: Approval token has expired.',
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }

        if (approval.targetEnvironment !== request.environment) {
          return {
            allowed: false,
            autonomyLevel: 'LEVEL_3',
            requiresHumanApproval: true,
            rejectionReason: `WRONG_ENVIRONMENT_APPROVAL: Token granted for ${approval.targetEnvironment}, but request targets ${request.environment}.`,
            circuitBreakerOpen: false,
            rateLimitExceeded: false,
            budgetExhausted: false,
            killSwitchActive: false,
            evalTimestamp: now,
          };
        }
      }
    }

    // 4. Rate limit & Autonomy Budget from Phase 28 baseline
    const budgetStatus = this.governanceEngine.getAutonomyBudgetStatus();
    if (budgetStatus.remainingBudget <= 0) {
      return {
        allowed: false,
        autonomyLevel: 'LEVEL_3',
        requiresHumanApproval: true,
        rejectionReason: 'AUTONOMY_BUDGET_EXHAUSTED: Daily 24h autonomy budget has been depleted.',
        circuitBreakerOpen: false,
        rateLimitExceeded: false,
        budgetExhausted: true,
        killSwitchActive: false,
        evalTimestamp: now,
      };
    }

    // 5. Scoped Circuit Breaker check
    if (this.governanceEngine.isCircuitOpen('SINGLE_SERVICE', request.service)) {
      return {
        allowed: false,
        autonomyLevel: 'LEVEL_3',
        requiresHumanApproval: true,
        rejectionReason: `CIRCUIT_BREAKER_OPEN: Service ${request.service} has tripped its circuit breaker.`,
        circuitBreakerOpen: true,
        rateLimitExceeded: false,
        budgetExhausted: false,
        killSwitchActive: false,
        evalTimestamp: now,
      };
    }

    // Successful policy pass
    const isAutonomousUnderEnvelope =
      request.environment === 'PRODUCTION' &&
      this.benchmarkEnvelope &&
      request.benchmarkId === this.benchmarkEnvelope.benchmarkId &&
      risk.riskLevel === 'LOW' &&
      this.benchmarkEnvelope.allowedAutonomyMode === 'BOUNDED_LOW_RISK_ONLY';

    const autonomyLevel: AutonomyLevel =
      request.environment === 'PRODUCTION' && !isAutonomousUnderEnvelope ? 'LEVEL_3' : 'LEVEL_2';

    return {
      allowed: true,
      autonomyLevel,
      requiresHumanApproval: request.environment === 'PRODUCTION' && !isAutonomousUnderEnvelope,
      circuitBreakerOpen: false,
      rateLimitExceeded: false,
      budgetExhausted: false,
      killSwitchActive: false,
      evalTimestamp: now,
    };
  }

  public consumeApproval(token: string): void {
    const appr = this.approvals.get(token);
    if (appr) {
      appr.isUsed = true;
    }
  }
}
