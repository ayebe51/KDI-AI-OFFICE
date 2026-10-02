// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// KdiAgentAdapter: Maps backend DigitalEmployee to KdiAgentProjection
// ==========================================================

import type { KdiAgentProjection, OfficeAgentStatus } from '../types';
import { SecretSanitizer } from '../security/SecretSanitizer.ts';

export interface RawEmployee {
  agentId?: string;
  id?: string;
  name?: string;
  displayName?: string;
  role?: string;
  department?: string;
  room?: string;
  currentState?: string;
  status?: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  currentProjectId?: string;
  currentActivity?: string;
  activity?: string;
  toolsInUse?: string[];
  lastActiveTimestamp?: string;
}

const DESK_SEATS: Record<string, { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' }> = {
  farhan: { x: 9, y: 11, facing: 'up' },
  rian: { x: 14, y: 11, facing: 'up' },
  ahmad: { x: 19, y: 11, facing: 'up' },
  nadia: { x: 9, y: 18, facing: 'down' },
  maya: { x: 14, y: 18, facing: 'down' },
  naya: { x: 19, y: 18, facing: 'down' },
  orchestrator: { x: 14, y: 5, facing: 'down' },
};

export class KdiAgentAdapter {
  static resolveCharacterKey(rawId: string, rawRole?: string, rawName?: string): 'farhan' | 'rian' | 'ahmad' | 'nadia' | 'maya' | 'naya' {
    const text = `${rawId} ${rawRole || ''} ${rawName || ''}`.toLowerCase();
    if (text.includes('farhan') || text.includes('eng-001') || text.includes('software_engineer')) return 'farhan';
    if (text.includes('rian') || text.includes('mgr-001') || text.includes('frontend') || text.includes('3d')) return 'rian';
    if (text.includes('ahmad') || text.includes('arch') || text.includes('systems_architect')) return 'ahmad';
    if (text.includes('nadia') || text.includes('qa') || text.includes('security')) return 'nadia';
    if (text.includes('maya') || text.includes('prod') || text.includes('delivery')) return 'maya';
    if (text.includes('naya') || text.includes('sales') || text.includes('client')) return 'naya';
    return 'farhan';
  }

  static normalizeStatus(rawStatus?: string): OfficeAgentStatus {
    if (!rawStatus) return 'IDLE';
    const s = rawStatus.toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'IDLE':
      case 'AVAILABLE':
        return 'IDLE';
      case 'PLANNING':
        return 'PLANNING';
      case 'CODING':
      case 'BUSY':
      case 'EXECUTING':
        return 'CODING';
      case 'DEBUGGING':
        return 'DEBUGGING';
      case 'TESTING':
        return 'TESTING';
      case 'REVIEWING':
        return 'REVIEWING';
      case 'MEETING':
        return 'MEETING';
      case 'WAITING':
        return 'WAITING';
      case 'WAITING_APPROVAL':
        return 'WAITING_APPROVAL';
      case 'BLOCKED':
        return 'BLOCKED';
      case 'PRAYING':
        return 'PRAYING';
      case 'COMPLETED':
        return 'COMPLETED';
      default:
        return 'WORKING';
    }
  }

  static toProjection(raw: RawEmployee): KdiAgentProjection {
    const id = raw.agentId || raw.id || 'AGT-UNKNOWN';
    const charKey = this.resolveCharacterKey(id, raw.role, raw.name || raw.displayName);
    const seat = DESK_SEATS[charKey] || { x: 10, y: 10, facing: 'down' };

    let displayName = raw.displayName || raw.name || charKey.toUpperCase();
    // Strip redundant parentheticals like "Farhan (AI Software Engineer)" -> "Farhan"
    if (displayName.includes('(')) {
      displayName = displayName.split('(')[0].trim();
    }

    const activity = raw.currentActivity || raw.activity;
    const sanitizedActivity = activity ? SecretSanitizer.sanitize(activity) : undefined;
    const sanitizedTaskTitle = raw.currentTaskTitle ? SecretSanitizer.sanitize(raw.currentTaskTitle) : undefined;

    return {
      id,
      displayName,
      role: raw.role || 'Autonomous AI Specialist',
      status: this.normalizeStatus(raw.currentState || raw.status),
      department: raw.department || 'Autonomous Engineering',
      room: raw.room || 'Open Engineering Floor',
      characterKey: charKey,
      currentTaskId: raw.currentTaskId,
      currentTaskTitle: sanitizedTaskTitle,
      currentProjectId: raw.currentProjectId,
      activity: sanitizedActivity,
      officeLocation: raw.room || 'Engineering Desk',
      seatLocation: seat,
      toolsInUse: raw.toolsInUse,
      lastActiveTimestamp: raw.lastActiveTimestamp || new Date().toISOString(),
      isOverloaded: (raw as any).isOverloaded ?? ((raw as any).utilizationPercent ? (raw as any).utilizationPercent >= 85 : false),
      workloadLevel: (raw as any).workloadLevel ?? ((raw as any).utilizationPercent && (raw as any).utilizationPercent >= 85 ? 'OVERLOADED' : 'NORMAL'),
      learningActivity: (raw as any).learningActivity ?? ((raw as any).activity?.toLowerCase().includes('experiment') ? 'EXPERIMENTING' : (raw as any).activity?.toLowerCase().includes('retrospective') ? 'RETROSPECTIVE' : 'NORMAL'),
      strategicActivity: (raw as any).strategicActivity ?? ((raw as any).activity?.toLowerCase().includes('replan') ? 'REPLANNING' : (raw as any).activity?.toLowerCase().includes('milestone') ? 'MILESTONE_ACTIVE' : (raw as any).activity?.toLowerCase().includes('strategic') ? 'STRATEGIC_REVIEW' : 'NORMAL'),
      activeMilestoneId: (raw as any).activeMilestoneId,
    };
  }

  static toProjections(rawList: RawEmployee[]): KdiAgentProjection[] {
    return (rawList || []).map((item) => this.toProjection(item));
  }
}
