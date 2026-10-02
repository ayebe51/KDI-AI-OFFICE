// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// KdiOfficeAdapter: Unified office snapshot and event dispatcher
// ==========================================================

import type {
  KdiAgentProjection,
  KdiTaskProjection,
  KdiApprovalProjection,
  KdiHealthProjection,
  KdiNormalizedEvent,
} from '../types';
import { KdiAgentAdapter, type RawEmployee } from './KdiAgentAdapter.ts';
import { KdiTaskAdapter, type RawTask } from './KdiTaskAdapter.ts';
import { KdiHealthAdapter, type RawHealthPayload } from './KdiHealthAdapter.ts';
import { KdiApprovalAdapter, type RawApproval } from './KdiApprovalAdapter.ts';
import { KdiEventAdapter, type RawWSEvent } from './KdiEventAdapter.ts';

export interface KdiOfficeSnapshot {
  agents: Record<string, KdiAgentProjection>;
  tasks: Record<string, KdiTaskProjection>;
  approvals: KdiApprovalProjection[];
  health: KdiHealthProjection;
  lastUpdated: string;
}

export class KdiOfficeAdapter {
  static createInitialSnapshot(
    rawEmployees: RawEmployee[] = [],
    rawTasks: RawTask[] = [],
    rawApprovals: RawApproval[] = [],
    rawHealth?: RawHealthPayload
  ): KdiOfficeSnapshot {
    const agents: Record<string, KdiAgentProjection> = {};
    const tasks: Record<string, KdiTaskProjection> = {};

    const agentList = KdiAgentAdapter.toProjections(rawEmployees);
    for (const a of agentList) {
      agents[a.id] = a;
    }

    const taskList = KdiTaskAdapter.toProjections(rawTasks);
    for (const t of taskList) {
      tasks[t.id] = t;
    }

    const approvals = KdiApprovalAdapter.toProjections(rawApprovals);
    const health = rawHealth ? KdiHealthAdapter.toProjection(rawHealth) : KdiHealthAdapter.defaultHealthy();

    return {
      agents,
      tasks,
      approvals,
      health,
      lastUpdated: new Date().toISOString(),
    };
  }

  static applyEvent(snapshot: KdiOfficeSnapshot, rawEvent: RawWSEvent): KdiOfficeSnapshot {
    const normalized = KdiEventAdapter.toNormalizedEvent(rawEvent);
    const next: KdiOfficeSnapshot = {
      ...snapshot,
      agents: { ...snapshot.agents },
      tasks: { ...snapshot.tasks },
      approvals: [...snapshot.approvals],
      lastUpdated: normalized.timestamp,
    };

    const data = normalized.data as any;

    switch (normalized.eventType) {
      case 'agent.status.changed': {
        const agentId = data?.agentId || data?.id;
        if (agentId && next.agents[agentId]) {
          const existing = next.agents[agentId];
          const newStatus = KdiAgentAdapter.normalizeStatus(data.currentState || data.status);
          next.agents[agentId] = {
            ...existing,
            status: newStatus,
            currentTaskId: data.taskId ?? existing.currentTaskId,
            activity: data.activitySummary ?? data.activity ?? existing.activity,
            toolsInUse: data.toolsInUse ?? existing.toolsInUse,
            lastActiveTimestamp: normalized.timestamp,
          };
        }
        break;
      }

      case 'task.created':
      case 'task.updated': {
        const taskId = data?.taskId || data?.id;
        if (taskId) {
          const projection = KdiTaskAdapter.toProjection(data);
          next.tasks[taskId] = projection;

          // If assigned to an agent, link it in projection
          if (projection.assignedAgentId && next.agents[projection.assignedAgentId]) {
            const ag = next.agents[projection.assignedAgentId];
            next.agents[projection.assignedAgentId] = {
              ...ag,
              currentTaskId: taskId,
              currentTaskTitle: projection.title,
            };
          }
        }
        break;
      }

      case 'approval.required': {
        const appr = KdiApprovalAdapter.toProjection(data);
        if (!next.approvals.some((a) => a.id === appr.id)) {
          next.approvals.unshift(appr);
        }
        break;
      }

      case 'approval.decided': {
        const apprId = data?.approvalId || data?.id;
        const decision = data?.decision || data?.status;
        next.approvals = next.approvals.map((a) => {
          if (a.id === apprId) {
            return {
              ...a,
              status: decision?.toUpperCase() === 'APPROVED' ? 'APPROVED' : 'REJECTED',
            };
          }
          return a;
        });
        break;
      }

      case 'system.health.changed': {
        next.health = KdiHealthAdapter.toProjection(data);
        break;
      }

      default:
        break;
    }

    return next;
  }
}
