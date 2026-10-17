// ==========================================================
// services/api/src/engineering/production-delivery/delivery-state-machine.engine.ts
// Phase 26: Deterministic Delivery State Machine & Security Transition Guards (§15, §16)
// ==========================================================

import type { DeliveryState } from './phase-26.types.js';

export class IllegalDeliveryStateTransitionError extends Error {
  constructor(
    public readonly fromState: DeliveryState,
    public readonly toState: DeliveryState,
    public readonly deploymentId?: string,
    message?: string
  ) {
    super(
      message ||
        `Illegal delivery state transition from "${fromState}" to "${toState}"${
          deploymentId ? ` for deployment ${deploymentId}` : ''
        }`
    );
    this.name = 'IllegalDeliveryStateTransitionError';
  }
}

export class UnauthorizedProductionDeliveryError extends Error {
  constructor(public readonly deploymentId: string, message?: string) {
    super(
      message ||
        `UnauthorizedProductionDeliveryError: Deployment ${deploymentId} attempted to transition to production without explicit human approval (§16).`
    );
    this.name = 'UnauthorizedProductionDeliveryError';
  }
}

export class DeliveryStateMachineEngine {
  /**
   * Explicit adjacency list of legal delivery transitions (§15)
   */
  private static readonly LEGAL_TRANSITIONS: Record<DeliveryState, DeliveryState[]> = {
    READY_FOR_DEPLOY: ['AWAITING_APPROVAL', 'PRECHECKING', 'DEPLOYMENT_BLOCKED'],
    AWAITING_APPROVAL: ['APPROVED', 'DEPLOYMENT_BLOCKED', 'REQUIRES_HUMAN_REVIEW'],
    APPROVED: ['PRECHECKING', 'STAGING_DEPLOYING', 'DEPLOYMENT_BLOCKED'],
    PRECHECKING: ['STAGING_DEPLOYING', 'AWAITING_APPROVAL', 'DEPLOYMENT_BLOCKED'],
    STAGING_DEPLOYING: ['STAGING_VERIFYING', 'DEPLOYMENT_FAILED'],
    STAGING_VERIFYING: ['STAGING_VERIFIED', 'DEPLOYMENT_FAILED', 'ROLLING_BACK'],
    STAGING_VERIFIED: ['PRODUCTION_CANARY', 'AWAITING_APPROVAL', 'REQUIRES_HUMAN_REVIEW'],
    PRODUCTION_CANARY: ['CANARY_VERIFYING', 'ROLLING_BACK', 'DEPLOYMENT_FAILED'],
    CANARY_VERIFYING: ['ROLLING_OUT', 'ROLLING_BACK', 'REQUIRES_HUMAN_REVIEW'],
    ROLLING_OUT: ['PRODUCTION_VERIFIED', 'ROLLING_BACK', 'DEPLOYMENT_FAILED'],
    PRODUCTION_VERIFIED: [], // Terminal success for production delivery
    ROLLING_BACK: ['ROLLBACK_VERIFYING', 'ROLLBACK_FAILED'],
    ROLLBACK_VERIFYING: ['RESTORED', 'ROLLBACK_FAILED', 'REQUIRES_HUMAN_REVIEW'],
    RESTORED: [], // Terminal restored state
    DEPLOYMENT_BLOCKED: ['PRECHECKING', 'AWAITING_APPROVAL', 'REQUIRES_HUMAN_REVIEW'],
    DEPLOYMENT_FAILED: ['ROLLING_BACK', 'REQUIRES_HUMAN_REVIEW'],
    ROLLBACK_FAILED: ['REQUIRES_HUMAN_REVIEW'],
    REQUIRES_HUMAN_REVIEW: ['ROLLING_BACK', 'AWAITING_APPROVAL', 'APPROVED'],
  };

  /**
   * Validate if transition from -> to is legal (§15)
   */
  public canTransition(from: DeliveryState, to: DeliveryState): boolean {
    const allowed = DeliveryStateMachineEngine.LEGAL_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Enforce transition rules with human authorization check (§15, §16)
   */
  public assertTransition(
    from: DeliveryState,
    to: DeliveryState,
    deploymentId: string,
    hasHumanApproval: boolean
  ): void {
    // 1. Guard against unauthorized autonomous production transition (§16)
    const productionStates: DeliveryState[] = [
      'PRODUCTION_CANARY',
      'CANARY_VERIFYING',
      'ROLLING_OUT',
      'PRODUCTION_VERIFIED',
    ];

    if (productionStates.includes(to) && !hasHumanApproval) {
      throw new UnauthorizedProductionDeliveryError(
        deploymentId,
        `SECURITY VIOLATION: Deployment ${deploymentId} attempted transition to production state "${to}" without verified human approval (§16).`
      );
    }

    // 2. Guard against illegal structural state transitions (§15)
    if (!this.canTransition(from, to)) {
      throw new IllegalDeliveryStateTransitionError(
        from,
        to,
        deploymentId,
        `Cannot transition deployment ${deploymentId} from "${from}" to "${to}". Allowed targets: [${(
          DeliveryStateMachineEngine.LEGAL_TRANSITIONS[from] || []
        ).join(', ')}]`
      );
    }
  }
}
