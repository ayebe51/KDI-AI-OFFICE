// ==========================================================
// services/api/src/engineering/manager/dependency-graph.service.ts
// Phase 17: Cross-Project Dependency Graph (DAG) & Multi-Agent Handoff
// ==========================================================

import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  DependencyCheckResult,
  DependencyGraphValidation,
  DependencyNode,
  QueueTaskStatus,
} from './engineering-manager.types.js';

@Injectable()
export class DependencyGraphService {
  private readonly logger = new StructuredLogger('DependencyGraphService');
  private readonly nodes = new Map<string, DependencyNode>();

  /**
   * Register or update task dependency node in the graph (§9)
   */
  public registerNode(
    taskId: string,
    projectSlug: string,
    dependencies: string[] = [],
    status: QueueTaskStatus = 'QUEUED'
  ): DependencyNode {
    const existing = this.nodes.get(taskId);
    const hasUnresolved = dependencies.length > 0 && dependencies.some((depId) => {
      const depNode = this.nodes.get(depId);
      return !depNode || (depNode.status !== 'COMPLETED' && (depNode.status as string) !== 'COMMITTED' && (depNode.status as string) !== 'READY_FOR_DEPLOY');
    });
    const nodeStatus: QueueTaskStatus = hasUnresolved ? 'BLOCKED_BY_DEPENDENCY' : (existing?.status || status);

    const node: DependencyNode = {
      taskId,
      projectSlug,
      status: nodeStatus,
      dependencies: Array.from(new Set(dependencies)),
      dependents: existing?.dependents || [],
    };
    this.nodes.set(taskId, node);

    // Update dependents on prerequisite nodes
    for (const depId of dependencies) {
      const depNode = this.nodes.get(depId);
      if (depNode) {
        if (!depNode.dependents.includes(taskId)) {
          depNode.dependents.push(taskId);
        }
      } else {
        // Placeholder for dep not yet registered
        this.nodes.set(depId, {
          taskId: depId,
          projectSlug: 'unknown',
          status: 'QUEUED',
          dependencies: [],
          dependents: [taskId],
        });
      }
    }

    this.logger.debug('registerNode', `Registered dependency node: ${taskId} (depends on: [${dependencies.join(', ')}])`);
    return node;
  }

  public getNode(taskId: string): DependencyNode | undefined {
    return this.nodes.get(taskId);
  }

  public listNodes(): DependencyNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Validate DAG and detect circular dependencies (§9)
   */
  public validateDAG(): DependencyGraphValidation {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const topologicalOrder: string[] = [];
    let cycleDetected = false;
    let cyclePath: string[] | undefined = undefined;

    const dfs = (nodeId: string, currentPath: string[]): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      currentPath.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId, [...currentPath])) {
              return true;
            }
          } else if (recStack.has(depId)) {
            cycleDetected = true;
            cyclePath = [...currentPath, depId];
            return true;
          }
        }
      }

      recStack.delete(nodeId);
      topologicalOrder.push(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId, [])) {
          break;
        }
      }
    }

    return {
      valid: !cycleDetected,
      cycleDetected,
      cyclePath,
      topologicalOrder: cycleDetected ? [] : topologicalOrder,
    };
  }

  /**
   * Check if a task's dependencies are all satisfied (§9)
   */
  public checkReadiness(taskId: string): DependencyCheckResult {
    const node = this.nodes.get(taskId);
    if (!node || node.dependencies.length === 0) {
      return {
        taskId,
        isReady: true,
        unresolvedDependencies: [],
        reason: 'No prerequisite dependencies',
      };
    }

    const unresolved: string[] = [];
    for (const depId of node.dependencies) {
      const depNode = this.nodes.get(depId);
      const isCompleted =
        depNode &&
        (depNode.status === 'COMPLETED' ||
          (depNode.status as string) === 'COMMITTED' ||
          (depNode.status as string) === 'READY_FOR_DEPLOY');

      if (!isCompleted) {
        unresolved.push(depId);
      }
    }

    if (unresolved.length > 0) {
      return {
        taskId,
        isReady: false,
        unresolvedDependencies: unresolved,
        reason: `Blocked by ${unresolved.length} unresolved prerequisite(s): [${unresolved.join(', ')}]`,
      };
    }

    return {
      taskId,
      isReady: true,
      unresolvedDependencies: [],
      reason: 'All prerequisite dependencies are satisfied',
    };
  }

  /**
   * Update task status and return any downstream tasks unblocked by this completion (§9 & §10)
   */
  public updateTaskStatus(
    taskId: string,
    status: QueueTaskStatus
  ): { newlyUnblockedTaskIds: string[] } {
    let node = this.nodes.get(taskId);
    if (!node) {
      node = this.registerNode(taskId, 'unknown', [], status);
    } else {
      node.status = status;
    }

    const isTerminalSuccess =
      status === 'COMPLETED' ||
      (status as string) === 'COMMITTED' ||
      (status as string) === 'READY_FOR_DEPLOY';

    const newlyUnblockedTaskIds: string[] = [];

    if (isTerminalSuccess) {
      this.logger.info(
        'updateTaskStatus',
        `Task ${taskId} completed. Checking ${node.dependents.length} downstream dependent(s)...`
      );

      for (const dependentId of node.dependents) {
        const readiness = this.checkReadiness(dependentId);
        if (readiness.isReady) {
          const dependentNode = this.nodes.get(dependentId);
          if (dependentNode && dependentNode.status !== 'COMPLETED') {
            dependentNode.status = 'QUEUED';
            newlyUnblockedTaskIds.push(dependentId);
            this.logger.info(
              'updateTaskStatus',
              `Downstream task ${dependentId} is now UNBLOCKED and ready to queue!`
            );
          }
        }
      }
    }

    return { newlyUnblockedTaskIds };
  }

  /**
   * Count how many other tasks depend on this task (for priority scoring impact)
   */
  public getDependentsCount(taskId: string): number {
    return this.nodes.get(taskId)?.dependents.length || 0;
  }
}
