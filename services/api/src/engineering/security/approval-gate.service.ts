// ==========================================================
// services/api/src/engineering/security/approval-gate.service.ts
// Human-in-the-Loop Engineering Approval Gatekeeper
// ==========================================================

import type { EngineeringApprovalRequest, RiskLevel } from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

export class ApprovalGateService {
  private readonly logger = new StructuredLogger('ApprovalGateService');
  private readonly requests = new Map<string, EngineeringApprovalRequest>();

  /**
   * Request human approval for a high-risk operation
   */
  public createApprovalRequest(
    executionId: string,
    taskId: string,
    agentId: string,
    command: string,
    riskLevel: RiskLevel,
    reason: string
  ): EngineeringApprovalRequest {
    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const request: EngineeringApprovalRequest = {
      approvalId,
      executionId,
      taskId,
      agentId,
      command,
      riskLevel,
      reason,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    this.requests.set(approvalId, request);
    this.logger.warn(
      'createApprovalRequest',
      `Approval request ${approvalId} created for task ${taskId} (Risk: ${riskLevel}): "${command}"`
    );

    return request;
  }

  /**
   * Resolve an approval request (Approve or Reject)
   * Anti-self-approval rule: agent cannot approve its own request.
   */
  public resolveApproval(
    approvalId: string,
    approved: boolean,
    resolvedBy: string
  ): EngineeringApprovalRequest | null {
    const request = this.requests.get(approvalId);
    if (!request || request.status !== 'PENDING') {
      return null;
    }

    // Security invariant: Prevent agent self-approval
    if (resolvedBy === request.agentId) {
      this.logger.error(
        'resolveApproval',
        `Security violation: Agent ${request.agentId} attempted to self-approve request ${approvalId}`
      );
      throw new Error('SECURITY_VIOLATION: Agents are prohibited from self-approving restricted actions');
    }

    request.status = approved ? 'APPROVED' : 'REJECTED';
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = resolvedBy;

    this.logger.info(
      'resolveApproval',
      `Approval request ${approvalId} resolved as ${request.status} by ${resolvedBy}`
    );

    return request;
  }

  public getApproval(approvalId: string): EngineeringApprovalRequest | undefined {
    return this.requests.get(approvalId);
  }

  public listPending(): EngineeringApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.status === 'PENDING');
  }

  public listForExecution(executionId: string): EngineeringApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.executionId === executionId);
  }
}
