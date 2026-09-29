// ==========================================================
// services/api/src/runtime/memory/memory.service.ts
// Context-Isolated Working Memory & Task Artifact Storage
// ==========================================================

import type { TaskResult } from '@kdi/types';

export interface MemoryService {
  getTaskContext(taskId: string, projectId?: string, agentId?: string): Promise<string>;
  saveTaskResult(taskId: string, result: TaskResult): Promise<void>;
  setTaskScopedMemory(taskId: string, key: string, value: unknown): Promise<void>;
  getTaskScopedMemory(taskId: string, key: string): Promise<unknown>;
}

export class InMemoryMemoryService implements MemoryService {
  private taskMemory = new Map<string, Map<string, unknown>>();
  private projectContext = new Map<string, string>();
  private taskResults = new Map<string, TaskResult>();

  public async getTaskContext(taskId: string, projectId?: string, agentId?: string): Promise<string> {
    const parts: string[] = [];

    if (projectId && this.projectContext.has(projectId)) {
      parts.push(`[Project Context: ${projectId}]\n${this.projectContext.get(projectId)}`);
    }

    const tMem = this.taskMemory.get(taskId);
    if (tMem && tMem.size > 0) {
      parts.push(`[Task Working Memory: ${taskId}]`);
      for (const [k, v] of tMem.entries()) {
        parts.push(`- ${k}: ${JSON.stringify(v)}`);
      }
    }

    return parts.join('\n\n');
  }

  public async saveTaskResult(taskId: string, result: TaskResult): Promise<void> {
    this.taskResults.set(taskId, result);
  }

  public async setTaskScopedMemory(taskId: string, key: string, value: unknown): Promise<void> {
    let tMem = this.taskMemory.get(taskId);
    if (!tMem) {
      tMem = new Map();
      this.taskMemory.set(taskId, tMem);
    }
    tMem.set(key, value);
  }

  public async getTaskScopedMemory(taskId: string, key: string): Promise<unknown> {
    return this.taskMemory.get(taskId)?.get(key);
  }

  public setProjectContext(projectId: string, context: string): void {
    this.projectContext.set(projectId, context);
  }
}
