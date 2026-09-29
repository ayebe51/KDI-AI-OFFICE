// ==========================================================
// services/api/src/runtime/state-machines/agent.state-machine.ts
// Formal 12-State Agent Runtime State Machine & Availability Rules
// ==========================================================

import type { AgentRuntimeStatus, AgentDefinition, AgentAvailabilityStatus } from '@kdi/types';

export class AgentStateMachine {
  // Allowed State Transitions Table
  private static readonly ALLOWED_TRANSITIONS: Record<AgentRuntimeStatus, AgentRuntimeStatus[]> = {
    OFFLINE: ['AVAILABLE', 'IDLE'],
    AVAILABLE: ['IDLE', 'RESERVED', 'WORKING', 'PLANNING', 'DRAINING', 'OFFLINE'],
    IDLE: ['AVAILABLE', 'RESERVED', 'PLANNING', 'WORKING', 'DRAINING', 'OFFLINE'],
    RESERVED: ['PLANNING', 'WORKING', 'IDLE', 'AVAILABLE', 'ERROR'],
    PLANNING: ['WORKING', 'WAITING', 'WAITING_APPROVAL', 'ERROR', 'IDLE'],
    WORKING: ['WAITING', 'WAITING_APPROVAL', 'PAUSED', 'COMPLETED', 'ERROR', 'IDLE', 'AVAILABLE'],
    WAITING: ['WORKING', 'ERROR', 'IDLE', 'COMPLETED'],
    WAITING_APPROVAL: ['WORKING', 'ERROR', 'IDLE', 'COMPLETED'],
    PAUSED: ['WORKING', 'ERROR', 'IDLE'],
    ERROR: ['IDLE', 'AVAILABLE', 'OFFLINE'],
    COMPLETED: ['IDLE', 'AVAILABLE', 'RESERVED', 'OFFLINE'],
    DRAINING: ['OFFLINE', 'IDLE'],
  };

  /**
   * Check if transition is allowed
   */
  public static canTransition(
    agent: AgentDefinition,
    targetState: AgentRuntimeStatus
  ): { allowed: boolean; reason?: string } {
    const currentState = agent.status;
    if (currentState === targetState) {
      return { allowed: true };
    }

    const allowed = this.ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowed.includes(targetState)) {
      return {
        allowed: false,
        reason: `Illegal agent state transition: Cannot transition from ${currentState} to ${targetState}. Allowed: [${allowed.join(', ')}]`,
      };
    }

    return { allowed: true };
  }

  /**
   * Execute state transition on agent definition and compute derived availability
   */
  public static transition(
    agent: AgentDefinition,
    targetState: AgentRuntimeStatus
  ): AgentDefinition {
    const check = this.canTransition(agent, targetState);
    if (!check.allowed) {
      throw new Error(`[AgentStateMachine] ${check.reason}`);
    }

    agent.status = targetState;
    agent.availability = this.deriveAvailability(targetState, agent.currentRunningTasks, agent.concurrencyLimit);

    return agent;
  }

  /**
   * Derive agent availability status from runtime status and concurrency slots
   */
  public static deriveAvailability(
    status: AgentRuntimeStatus,
    runningTasks: number,
    concurrencyLimit: number
  ): AgentAvailabilityStatus {
    if (status === 'OFFLINE') return 'OFFLINE';
    if (status === 'DRAINING') return 'DRAINING';
    if (status === 'ERROR') return 'ERROR';

    if (runningTasks >= concurrencyLimit) {
      return 'BUSY';
    }

    if (['AVAILABLE', 'IDLE', 'COMPLETED'].includes(status)) {
      return 'AVAILABLE';
    }

    // In PLANNING, WORKING, WAITING, RESERVED, if there is spare concurrency slot, they may accept more
    return runningTasks < concurrencyLimit ? 'AVAILABLE' : 'BUSY';
  }
}
