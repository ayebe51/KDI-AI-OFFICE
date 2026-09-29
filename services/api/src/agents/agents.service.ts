import { Injectable } from '@nestjs/common';
import { EventsGateway } from '../websocket/events.gateway.js';
import type { DigitalEmployee, AgentState } from '@kdi/types';

@Injectable()
export class AgentsService {
  private employees: Map<string, DigitalEmployee> = new Map();

  constructor(private readonly eventsGateway: EventsGateway) {
    this.initDefaultEmployees();
  }

  private initDefaultEmployees() {
    const engineer: DigitalEmployee = {
      agentId: 'AGT-ENG-001',
      name: 'Farhan (AI Software Engineer)',
      role: 'SOFTWARE_ENGINEER',
      department: 'Engineering',
      grade: 'GR-04',
      room: 'RM-05',
      currentState: 'IDLE',
      currentActivity: 'Standing by at engineering desk',
      baseSalary: 18000000,
    };

    const manager: DigitalEmployee = {
      agentId: 'AGT-MGR-001',
      name: 'Rian (AI Engineering Manager)',
      role: 'AI_MANAGER',
      department: 'Management',
      grade: 'GR-07',
      room: 'RM-02',
      currentState: 'PLANNING',
      currentActivity: 'Reviewing quarterly architecture goals',
      baseSalary: 32000000,
    };

    this.employees.set(engineer.agentId, engineer);
    this.employees.set(manager.agentId, manager);
  }

  getAll(): DigitalEmployee[] {
    return Array.from(this.employees.values());
  }

  getById(id: string): DigitalEmployee | undefined {
    return this.employees.get(id);
  }

  updateState(agentId: string, newState: AgentState, activitySummary?: string): DigitalEmployee {
    const emp = this.employees.get(agentId);
    if (!emp) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const previousState = emp.currentState;
    emp.currentState = newState;
    if (activitySummary) {
      emp.currentActivity = activitySummary;
    }

    // Broadcast real-time WebSocket event to all connected clients!
    this.eventsGateway.broadcastAgentState({
      agentId: emp.agentId,
      role: emp.role,
      previousState,
      currentState: newState,
      roomId: emp.room,
      taskId: emp.currentTaskId,
      activitySummary: emp.currentActivity,
    });

    return emp;
  }

  toggleDemoEngineerState(): DigitalEmployee {
    const engineer = this.employees.get('AGT-ENG-001');
    if (!engineer) {
      throw new Error('Demo engineer not found');
    }

    const nextState: AgentState = engineer.currentState === 'IDLE' ? 'WORKING' : 'IDLE';
    const activity = nextState === 'WORKING' 
      ? 'Writing AST code patch for module PickupService.ts:L48'
      : 'Standing by at engineering desk';

    return this.updateState('AGT-ENG-001', nextState, activity);
  }
}
