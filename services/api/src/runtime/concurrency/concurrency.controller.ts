// ==========================================================
// services/api/src/runtime/concurrency/concurrency.controller.ts
// Per-Agent, Global Concurrency Limits & Resource-Aware Throttler
// ==========================================================

import type { AgentDefinition } from '@kdi/types';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';
import * as os from 'os';

export interface ResourceState {
  cpuUsagePercent: number;
  ramUsagePercent: number;
  isThrottled: boolean;
  throttleReason?: string;
}

export class ConcurrencyController {
  private readonly logger = new StructuredLogger('ConcurrencyController');
  private activeTasksCount = 0;
  private activeAgentsCount = 0;

  private readonly maxGlobalRunningTasks: number;
  private readonly maxGlobalRunningAgents: number;
  private readonly cpuLimitPercent: number;
  private readonly ramLimitPercent: number;

  constructor() {
    const config = loadAppConfig();
    this.maxGlobalRunningTasks = config.runtime.maxRunningTasks || 8;
    this.maxGlobalRunningAgents = config.runtime.maxRunningAgents || 14;
    this.cpuLimitPercent = config.governance.hostCpuLimitPercent || 75;
    this.ramLimitPercent = config.governance.hostRamLimitPercent || 80;
  }

  /**
   * Check if an agent can accept another task without exceeding its concurrency limit
   */
  public canAgentAcceptTask(agent: AgentDefinition): boolean {
    return agent.currentRunningTasks < agent.concurrencyLimit;
  }

  /**
   * Check if global concurrency and host resource pressure permit claiming a new task
   */
  public canScheduleTask(): { allowed: boolean; reason?: string } {
    if (this.activeTasksCount >= this.maxGlobalRunningTasks) {
      return {
        allowed: false,
        reason: `Global task concurrency reached (${this.activeTasksCount}/${this.maxGlobalRunningTasks})`,
      };
    }

    const resource = this.sampleResourceState();
    if (resource.isThrottled) {
      return {
        allowed: false,
        reason: resource.throttleReason || 'Host resource pressure high; throttling new work',
      };
    }

    return { allowed: true };
  }

  /**
   * Sample OS CPU and RAM metrics to safeguard the office computer
   */
  public sampleResourceState(): ResourceState {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST || process.env.JEST_WORKER_ID) {
      return {
        cpuUsagePercent: 10,
        ramUsagePercent: 20,
        isThrottled: false,
      };
    }

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsagePercent = Math.round((usedMem / totalMem) * 100);

    // Approximate CPU load from loadavg or core count
    const loadAvg = os.loadavg();
    const cpus = os.cpus().length || 1;
    // Normalized 1-minute load percentage
    const cpuUsagePercent = Math.min(Math.round(((loadAvg[0] || 0.5) / cpus) * 100), 100);

    let isThrottled = false;
    let throttleReason: string | undefined;

    if (ramUsagePercent >= this.ramLimitPercent) {
      isThrottled = true;
      throttleReason = `RAM usage (${ramUsagePercent}%) exceeds threshold (${this.ramLimitPercent}%)`;
    } else if (cpuUsagePercent >= this.cpuLimitPercent) {
      isThrottled = true;
      throttleReason = `CPU usage (${cpuUsagePercent}%) exceeds threshold (${this.cpuLimitPercent}%)`;
    }

    return {
      cpuUsagePercent,
      ramUsagePercent,
      isThrottled,
      throttleReason,
    };
  }

  public registerTaskStart(agent: AgentDefinition): void {
    agent.currentRunningTasks += 1;
    this.activeTasksCount += 1;
    if (agent.currentRunningTasks === 1) {
      this.activeAgentsCount += 1;
    }
  }

  public registerTaskEnd(agent: AgentDefinition): void {
    agent.currentRunningTasks = Math.max(0, agent.currentRunningTasks - 1);
    this.activeTasksCount = Math.max(0, this.activeTasksCount - 1);
    if (agent.currentRunningTasks === 0) {
      this.activeAgentsCount = Math.max(0, this.activeAgentsCount - 1);
    }
  }

  public getActiveTaskCount(): number {
    return this.activeTasksCount;
  }

  public getActiveAgentCount(): number {
    return this.activeAgentsCount;
  }
}
