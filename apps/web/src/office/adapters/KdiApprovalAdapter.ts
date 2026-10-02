// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// KdiApprovalAdapter: Transforms pending approvals to KdiApprovalProjection
// ==========================================================

import type { KdiApprovalProjection } from '../types';
import { SecretSanitizer } from '../security/SecretSanitizer.ts';

export interface RawApproval {
  approvalId?: string;
  id?: string;
  action?: string;
  reason?: string;
  agentId?: string;
  agentName?: string;
  agentRole?: string;
  risk?: string;
  riskLevel?: string;
  expectedImpact?: string;
  status?: string;
  files?: string[];
  commands?: string[];
  proposedDiff?: string;
  diff?: string;
  createdAt?: string;
}

export class KdiApprovalAdapter {
  static normalizeRisk(rawRisk?: string): KdiApprovalProjection['risk'] {
    if (!rawRisk) return 'MEDIUM';
    const r = rawRisk.toUpperCase();
    if (r === 'CRITICAL' || r === 'LEVEL_4') return 'CRITICAL';
    if (r === 'HIGH' || r === 'LEVEL_3') return 'HIGH';
    if (r === 'LOW' || r === 'LEVEL_1') return 'LOW';
    return 'MEDIUM';
  }

  static toProjection(raw: RawApproval): KdiApprovalProjection {
    const id = raw.approvalId || raw.id || `appr_${Date.now()}`;
    const sanitizedAction = raw.action ? SecretSanitizer.sanitize(raw.action) : 'Unspecified Action';
    const sanitizedReason = raw.reason ? SecretSanitizer.sanitize(raw.reason) : '';
    const sanitizedImpact = raw.expectedImpact ? SecretSanitizer.sanitize(raw.expectedImpact) : '';
    const sanitizedDiff = raw.proposedDiff || raw.diff ? SecretSanitizer.sanitize(raw.proposedDiff || raw.diff!) : undefined;

    const sanitizedFiles = raw.files?.map((f) => SecretSanitizer.sanitize(f));
    const sanitizedCommands = raw.commands?.map((c) => SecretSanitizer.sanitize(c));

    const status: KdiApprovalProjection['status'] =
      raw.status?.toUpperCase() === 'APPROVED' ? 'APPROVED' :
      raw.status?.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'PENDING';

    return {
      id,
      action: sanitizedAction,
      reason: sanitizedReason,
      agentId: raw.agentId || 'AGT-ENG-001',
      agentName: raw.agentName || raw.agentRole || 'Farhan',
      risk: this.normalizeRisk(raw.risk || raw.riskLevel),
      expectedImpact: sanitizedImpact,
      status,
      files: sanitizedFiles,
      commands: sanitizedCommands,
      proposedDiff: sanitizedDiff,
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  static toProjections(rawList: RawApproval[]): KdiApprovalProjection[] {
    return (rawList || []).map((a) => this.toProjection(a));
  }
}
