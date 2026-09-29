// ==========================================================
// services/api/src/runtime/state-machines/activity.mapper.ts
// Agent Activity Bridge: Maps Agent Runtime Status to 3D Office State
// ==========================================================

import type { AgentRuntimeStatus, AgentState, TaskType } from '@kdi/types';

export class AgentActivityMapper {
  /**
   * Translates an internal Agent Runtime Status and optional TaskType
   * into one of the 20 visual Office States recognized by the 3D Living Office
   */
  public static mapToOfficeActivity(
    runtimeStatus: AgentRuntimeStatus,
    taskType?: TaskType,
    customActivity?: AgentState
  ): { officeState: AgentState; activityLabel: string } {
    // If a valid visual intermission activity is explicitly requested (e.g. BREAK, COFFEE, PRAYING)
    if (customActivity && this.isVisualIntermission(customActivity)) {
      return {
        officeState: customActivity,
        activityLabel: this.getIntermissionLabel(customActivity),
      };
    }

    switch (runtimeStatus) {
      case 'OFFLINE':
        return { officeState: 'OFFLINE', activityLabel: 'Offline / Disconnected' };

      case 'AVAILABLE':
      case 'IDLE':
      case 'COMPLETED':
        return { officeState: 'IDLE', activityLabel: 'Standing by at workstation' };

      case 'RESERVED':
        return { officeState: 'IDLE', activityLabel: 'Assigned to task, awaiting startup' };

      case 'PLANNING':
        return { officeState: 'PLANNING', activityLabel: 'Decomposing task specifications' };

      case 'WAITING_APPROVAL':
        return { officeState: 'WAITING_APPROVAL', activityLabel: 'Suspended: Awaiting human operator approval' };

      case 'WAITING':
        return { officeState: 'THINKING', activityLabel: 'Waiting on dependent artifact or response' };

      case 'PAUSED':
        return { officeState: 'IDLE', activityLabel: 'Task execution paused' };

      case 'ERROR':
        return { officeState: 'ERROR', activityLabel: 'Error state encountered' };

      case 'DRAINING':
        return { officeState: 'IDLE', activityLabel: 'Completing active operations before shutdown' };

      case 'WORKING':
        if (!taskType) {
          return { officeState: 'WORKING', activityLabel: 'Active task execution' };
        }
        return this.mapTaskTypeToActivity(taskType);

      default:
        return { officeState: 'IDLE', activityLabel: 'Workstation standby' };
    }
  }

  private static mapTaskTypeToActivity(taskType: TaskType): { officeState: AgentState; activityLabel: string } {
    switch (taskType) {
      case 'CODING':
        return { officeState: 'CODING', activityLabel: 'Synthesizing code patch' };
      case 'TESTING':
        return { officeState: 'TESTING', activityLabel: 'Executing verification test suite' };
      case 'PLANNING':
        return { officeState: 'PLANNING', activityLabel: 'Architectural planning & ADR authoring' };
      case 'RESEARCH':
      case 'ANALYSIS':
        return { officeState: 'THINKING', activityLabel: 'Synthesizing analysis & research context' };
      case 'REVIEW':
      case 'SECURITY':
        return { officeState: 'REVIEWING', activityLabel: 'Reviewing code diffs & security policies' };
      case 'DOCUMENTATION':
        return { officeState: 'READING', activityLabel: 'Authoring technical documentation' };
      case 'CLASSIFICATION':
      default:
        return { officeState: 'WORKING', activityLabel: 'Executing specialized task' };
    }
  }

  private static isVisualIntermission(state: AgentState): boolean {
    return ['BREAK', 'COFFEE', 'LUNCH', 'PRAYING', 'READING', 'TRAINING', 'MEETING', 'MOVING'].includes(state);
  }

  private static getIntermissionLabel(state: AgentState): string {
    switch (state) {
      case 'BREAK': return 'Taking a brief break in office lounge';
      case 'COFFEE': return 'Getting coffee at pantry';
      case 'LUNCH': return 'Lunch break';
      case 'PRAYING': return 'Observing prayer time at musholla';
      case 'READING': return 'Reading technical documentation';
      case 'TRAINING': return 'Knowledge distillation & model calibration';
      case 'MEETING': return 'Attending cross-agent synchronization meeting';
      case 'MOVING': return 'In transit across office corridor';
      default: return 'Away from desk';
    }
  }
}
