// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// KdiTaskAdapter: Maps backend TaskRecord to KdiTaskProjection
// ==========================================================

import type { KdiTaskProjection } from '../types';
import { SecretSanitizer } from '../security/SecretSanitizer.ts';

export interface RawTask {
  taskId?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  riskLevel?: string;
  assignedAgent?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  workingBranch?: string;
  createdAt?: string;
  updatedAt?: string;
  objectiveId?: string;
  correlationId?: string;
}

export class KdiTaskAdapter {
  static normalizeStatus(rawStatus?: string): KdiTaskProjection['status'] {
    if (!rawStatus) return 'PENDING';
    const s = rawStatus.toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'IN_PROGRESS':
      case 'RUNNING':
      case 'EXECUTING':
        return 'IN_PROGRESS';
      case 'COMPLETED':
      case 'DONE':
      case 'RESOLVED':
        return 'COMPLETED';
      case 'BLOCKED':
        return 'BLOCKED';
      case 'FAILED':
      case 'ERROR':
        return 'FAILED';
      case 'WAITING_APPROVAL':
        return 'WAITING_APPROVAL';
      default:
        return 'PENDING';
    }
  }

  static normalizePriority(rawPriority?: string): KdiTaskProjection['priority'] {
    if (!rawPriority) return 'MEDIUM';
    const p = rawPriority.toUpperCase();
    if (p === 'URGENT' || p === 'CRITICAL') return 'URGENT';
    if (p === 'HIGH') return 'HIGH';
    if (p === 'LOW') return 'LOW';
    return 'MEDIUM';
  }

  static normalizeRisk(rawRisk?: string): KdiTaskProjection['riskLevel'] {
    if (!rawRisk) return 'LOW';
    const r = rawRisk.toUpperCase();
    if (r === 'CRITICAL' || r === 'LEVEL_4') return 'CRITICAL';
    if (r === 'HIGH' || r === 'LEVEL_3') return 'HIGH';
    if (r === 'MEDIUM' || r === 'LEVEL_2') return 'MEDIUM';
    return 'LOW';
  }

  static toProjection(raw: RawTask): KdiTaskProjection {
    const id = raw.taskId || raw.id || `TSK-${Date.now()}`;
    const sanitizedTitle = raw.title ? SecretSanitizer.sanitize(raw.title) : 'Untitled Task';
    const sanitizedDesc = raw.description ? SecretSanitizer.sanitize(raw.description) : '';
    const sanitizedBranch = raw.workingBranch ? SecretSanitizer.sanitize(raw.workingBranch) : undefined;

    return {
      id,
      title: sanitizedTitle,
      description: sanitizedDesc,
      status: this.normalizeStatus(raw.status),
      priority: this.normalizePriority(raw.priority),
      riskLevel: this.normalizeRisk(raw.riskLevel),
      assignedAgentId: raw.assignedAgentId || raw.assignedAgent,
      assignedAgentName: raw.assignedAgentName,
      workingBranch: sanitizedBranch,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      objectiveId: raw.objectiveId,
      correlationId: raw.correlationId,
    };
  }

  static toProjections(rawList: RawTask[]): KdiTaskProjection[] {
    return (rawList || []).map((t) => this.toProjection(t));
  }
}
