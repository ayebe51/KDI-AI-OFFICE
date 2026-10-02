import { Injectable } from '@nestjs/common';
import type { TaskRecord } from '@kdi/types';

@Injectable()
export class TasksService {
  private tasks: TaskRecord[] = [
    {
      taskId: 'tsk_01J9X8A1B2C3',
      title: 'Fix PickupService null pointer exception on missing delivery address',
      description: 'Surgically patch PickupService.ts:L48 to safely handle null shipping profile.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      riskLevel: 'MEDIUM',
      assignedAgent: 'SOFTWARE_ENGINEER',
      workingBranch: 'ai/task-01J9X8A1B2C3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      taskId: 'tsk_02J9X8D4E5F6',
      title: 'Draft architecture proposal for multi-tenant database migration',
      description: 'Author ADR-015 analyzing schema-per-tenant vs row-level security.',
      status: 'PLANNING',
      priority: 'MEDIUM',
      riskLevel: 'LOW',
      assignedAgent: 'SYSTEM_ARCHITECT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  getAll(): { total: number; data: TaskRecord[] } {
    return {
      total: this.tasks.length,
      data: this.tasks,
    };
  }

  getById(id: string): TaskRecord | undefined {
    return this.tasks.find((t) => t.taskId === id);
  }

  createTask(title: string, description: string, assignedAgent?: string, status?: string): TaskRecord {
    const newTask: TaskRecord = {
      taskId: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      description,
      status: (status as any) || 'PENDING',
      priority: 'MEDIUM',
      riskLevel: 'LOW',
      assignedAgent: (assignedAgent as any) || 'SOFTWARE_ENGINEER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.unshift(newTask);
    return newTask;
  }

  updateTask(id: string, updates: Partial<TaskRecord>): TaskRecord | undefined {
    const task = this.tasks.find((t) => t.taskId === id);
    if (!task) return undefined;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }
}
