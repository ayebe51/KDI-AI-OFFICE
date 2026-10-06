// ==========================================================
// services/api/src/engineering/host/host-registry.service.ts
// Windows Execution Host Registry, Health & Routing (§7, §8, §14–§19)
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  WindowsHostRegistration,
  HostHeartbeat,
  HostStatus,
  ExecutorReadiness,
  ProjectHostMapping,
} from './host.types.js';

@Injectable()
export class WindowsHostRegistryService {
  private readonly logger = new StructuredLogger('WindowsHostRegistryService');

  private readonly hosts = new Map<string, WindowsHostRegistration>();
  private readonly projectMappings = new Map<string, ProjectHostMapping>();
  private readonly authorizedHostTokens = new Set<string>();

  constructor() {
    // Default system authorization token for local secure channel
    this.authorizedHostTokens.add('kdi_exec_token_default_secret');
  }

  /**
   * Register or update an authorized Windows execution host (§7)
   */
  public registerHost(
    registration: WindowsHostRegistration,
    authToken?: string
  ): { success: boolean; host?: WindowsHostRegistration; reason?: string } {
    if (authToken && !this.authorizedHostTokens.has(authToken)) {
      this.logger.warn('registerHost', `Registration attempt with invalid authorization token from host ${registration.hostId}`);
      return { success: false, reason: 'Invalid host authorization token (§5 & §32)' };
    }

    const hostRecord: WindowsHostRegistration = {
      ...registration,
      registeredAt: registration.registeredAt || Date.now(),
      lastHeartbeat: registration.lastHeartbeat !== undefined ? registration.lastHeartbeat : Date.now(),
      status: registration.status || 'ONLINE',
      activeTasksCount: registration.activeTasksCount || 0,
      maxConcurrentTasks: registration.maxConcurrentTasks || 3,
    };

    this.hosts.set(registration.hostId, hostRecord);
    this.logger.info(
      'registerHost',
      `Registered Windows Execution Host: ${registration.hostId} (${registration.hostname}, Antigravity: ${registration.antigravityVersion}, Node: ${registration.nodeVersion})`
    );

    return { success: true, host: hostRecord };
  }

  /**
   * Authorize a new host secret token
   */
  public addAuthorizedToken(token: string): void {
    this.authorizedHostTokens.add(token);
  }

  /**
   * Validate if an authentication token is authorized
   */
  public isTokenAuthorized(token?: string): boolean {
    if (!token) return false;
    return this.authorizedHostTokens.has(token);
  }

  /**
   * Record periodic heartbeat from a host (§16)
   */
  public recordHeartbeat(heartbeat: HostHeartbeat): {
    success: boolean;
    hostStatus: HostStatus;
    reason?: string;
  } {
    const host = this.hosts.get(heartbeat.hostId);
    if (!host) {
      return {
        success: false,
        hostStatus: 'OFFLINE',
        reason: `Host ${heartbeat.hostId} is not registered`,
      };
    }

    host.lastHeartbeat = heartbeat.timestamp || Date.now();
    host.status = heartbeat.status;
    host.executorStatus = heartbeat.executorStatus;
    host.activeTasksCount = heartbeat.activeTasks?.length || 0;

    if (heartbeat.metrics) {
      host.metadata = { ...host.metadata, metrics: heartbeat.metrics };
    }

    return { success: true, hostStatus: host.status };
  }

  /**
   * Get single host by ID
   */
  public getHost(hostId: string): WindowsHostRegistration | undefined {
    return this.hosts.get(hostId);
  }

  /**
   * List all registered hosts
   */
  public listHosts(): WindowsHostRegistration[] {
    return Array.from(this.hosts.values());
  }

  /**
   * Evaluate host readiness (§8)
   */
  public evaluateHostReadiness(hostId: string): {
    isReady: boolean;
    status: HostStatus;
    executorStatus: ExecutorReadiness;
    reason?: string;
  } {
    const host = this.hosts.get(hostId);
    if (!host) {
      return {
        isReady: false,
        status: 'OFFLINE',
        executorStatus: 'UNAVAILABLE',
        reason: `Host "${hostId}" is not registered. State: WAITING_FOR_EXECUTION_HOST`,
      };
    }

    // Check if heartbeat is stale (> 30s)
    const isStale = Date.now() - host.lastHeartbeat > 30000;
    if (isStale) {
      host.status = 'STALE';
      return {
        isReady: false,
        status: 'STALE',
        executorStatus: host.executorStatus,
        reason: `Host "${hostId}" heartbeat is stale (>30s without update). State: HOST_STALE`,
      };
    }

    if (host.status !== 'ONLINE') {
      return {
        isReady: false,
        status: host.status,
        executorStatus: host.executorStatus,
        reason: `Host "${hostId}" status is ${host.status}`,
      };
    }

    if (host.executorStatus !== 'READY') {
      return {
        isReady: false,
        status: host.status,
        executorStatus: host.executorStatus,
        reason: `Antigravity executor on "${hostId}" is ${host.executorStatus}`,
      };
    }

    // Check concurrency capacity (§18)
    if (host.activeTasksCount >= host.maxConcurrentTasks) {
      return {
        isReady: false,
        status: 'BUSY',
        executorStatus: 'BUSY',
        reason: `Host "${hostId}" is at maximum capacity (${host.activeTasksCount}/${host.maxConcurrentTasks}). State: WAITING_FOR_RESOURCES`,
      };
    }

    return {
      isReady: true,
      status: host.status,
      executorStatus: host.executorStatus,
    };
  }

  /**
   * Check staleness across all registered hosts (§16)
   */
  public checkStaleness(thresholdMs = 30000): string[] {
    const staleHosts: string[] = [];
    const now = Date.now();

    for (const host of this.hosts.values()) {
      if (host.status === 'ONLINE' && now - host.lastHeartbeat > thresholdMs) {
        host.status = 'STALE';
        staleHosts.push(host.hostId);
        this.logger.warn('checkStaleness', `Host ${host.hostId} transitioned to STALE (no heartbeat for ${now - host.lastHeartbeat}ms)`);
      }
    }

    return staleHosts;
  }

  /**
   * Map a project to a designated execution host (§14)
   */
  public setProjectHostMapping(
    projectSlug: string,
    hostId: string,
    isPrimary = true,
    fallbackHostId?: string
  ): void {
    const key = projectSlug.trim().toLowerCase();
    this.projectMappings.set(key, {
      projectSlug: key,
      hostId,
      isPrimary,
      fallbackHostId,
      assignedAt: Date.now(),
    });
    this.logger.info('setProjectHostMapping', `Mapped project ${projectSlug} -> host ${hostId}`);
  }

  /**
   * Get designated host for a project (§14 & §17)
   */
  public getDesignatedHostForProject(projectSlug: string): WindowsHostRegistration | null {
    const key = projectSlug.trim().toLowerCase();
    const mapping = this.projectMappings.get(key);

    if (mapping) {
      const primaryHost = this.hosts.get(mapping.hostId);
      if (primaryHost) {
        const readiness = this.evaluateHostReadiness(primaryHost.hostId);
        if (readiness.isReady) {
          return primaryHost;
        }
      }

      // Check fallback if primary is not ready
      if (mapping.fallbackHostId) {
        const fallback = this.hosts.get(mapping.fallbackHostId);
        if (fallback) {
          const fbReadiness = this.evaluateHostReadiness(fallback.hostId);
          if (fbReadiness.isReady) {
            return fallback;
          }
        }
      }
    }

    // Fallback: pick any online ready host
    for (const host of this.hosts.values()) {
      const readiness = this.evaluateHostReadiness(host.hostId);
      if (readiness.isReady) {
        return host;
      }
    }

    return null;
  }

  /**
   * Increment active task counter on host
   */
  public incrementActiveTask(hostId: string): void {
    const host = this.hosts.get(hostId);
    if (host) {
      host.activeTasksCount++;
    }
  }

  /**
   * Decrement active task counter on host
   */
  public decrementActiveTask(hostId: string): void {
    const host = this.hosts.get(hostId);
    if (host && host.activeTasksCount > 0) {
      host.activeTasksCount--;
    }
  }

  /**
   * Structured health overview conforming strictly to §15
   */
  public getHealthOverview(hostId?: string): {
    windowsHost: string;
    executionAgent: string;
    antigravity: string;
    git: string;
    node: string;
    hostCount: number;
    activeTasks: number;
    selectedHost?: WindowsHostRegistration;
  } {
    const targetHost = hostId ? this.hosts.get(hostId) : Array.from(this.hosts.values())[0];

    if (!targetHost) {
      return {
        windowsHost: 'OFFLINE',
        executionAgent: 'UNAVAILABLE',
        antigravity: 'UNAVAILABLE',
        git: 'UNKNOWN',
        node: 'UNKNOWN',
        hostCount: this.hosts.size,
        activeTasks: 0,
      };
    }

    const readiness = this.evaluateHostReadiness(targetHost.hostId);

    return {
      windowsHost: readiness.status,
      executionAgent: readiness.isReady ? 'READY' : readiness.status,
      antigravity: targetHost.executorStatus,
      git: targetHost.gitVersion ? 'READY' : 'UNKNOWN',
      node: targetHost.nodeVersion ? 'READY' : 'UNKNOWN',
      hostCount: this.hosts.size,
      activeTasks: targetHost.activeTasksCount,
      selectedHost: targetHost,
    };
  }
}
