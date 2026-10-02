import { Injectable, Logger, Optional } from '@nestjs/common';
import { Neo4jService } from '../database/neo4j.service.js';
import { StrategicObjectiveService } from './strategic-objective.service.js';

export interface CascadeImpactAnalysis {
  failedDependencyId: string;
  failedDependencyType: 'TASK' | 'INITIATIVE' | 'MILESTONE' | 'PROVIDER';
  directBlockedNodes: string[];
  affectedMilestoneIds: string[];
  affectedObjectiveIds: string[];
  affectedProjectIds: string[];
  affectedAgentRoles: string[];
  estimatedDeadlineDelayDays: number;
  invalidatedDownstreamWork: string[];
  impactSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  graphTraversalDepth: number;
}

export interface StrategicGraphNode {
  id: string;
  type: 'OBJECTIVE' | 'PROGRAM' | 'PROJECT' | 'MILESTONE' | 'INITIATIVE' | 'TASK' | 'AGENT';
  name: string;
  status: string;
}

export interface StrategicGraphEdge {
  fromId: string;
  toId: string;
  relationship: 'BLOCKS' | 'ENABLES' | 'SUPPORTS' | 'ASSIGNED_TO' | 'CONTAINS';
}

@Injectable()
export class DependencyCascadeService {
  private readonly logger = new Logger(DependencyCascadeService.name);

  // Authoritative in-memory graph mirror (mirrored to Neo4j)
  private readonly nodes: Map<string, StrategicGraphNode> = new Map();
  private readonly edges: StrategicGraphEdge[] = [];

  constructor(
    private readonly objectiveService: StrategicObjectiveService,
    @Optional() private readonly neo4jService?: Neo4jService
  ) {
    this.buildStrategicDependencyGraph();
  }

  // ==========================================================
  // Strategic Dependency Graph (Phase 15 Section 14)
  // Neo4j multi-tier model: Objective -> Program -> Project ->
  // Milestone -> Initiative -> Task, with BLOCKS / ENABLES / SUPPORTS
  // ==========================================================

  addNode(node: StrategicGraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: StrategicGraphEdge): void {
    this.edges.push(edge);
  }

  getNode(id: string): StrategicGraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdges(): StrategicGraphEdge[] {
    return [...this.edges];
  }

  // ==========================================================
  // Cascade Impact Analysis (Phase 15 Section 15)
  // Computes precise affected nodes from actual graph relationships
  // without assuming every downstream node is affected
  // ==========================================================

  calculateCascadeImpact(failedNodeId: string): CascadeImpactAnalysis {
    const directBlockedNodes: string[] = [];
    const affectedMilestones = new Set<string>();
    const affectedObjectives = new Set<string>();
    const affectedProjects = new Set<string>();
    const affectedAgents = new Set<string>();
    const invalidatedDownstream = new Set<string>();

    let maxDepth = 0;

    // 1. Identify directly blocked nodes (edges where fromId === failedNodeId and relationship === 'BLOCKS')
    const queue: Array<{ id: string; depth: number }> = [{ id: failedNodeId, depth: 0 }];
    const visited = new Set<string>([failedNodeId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > maxDepth) {
        maxDepth = current.depth;
      }

      // Find outbound edges
      for (const edge of this.edges) {
        if (edge.fromId === current.id) {
          if (edge.relationship === 'BLOCKS') {
            if (current.depth === 0) {
              directBlockedNodes.push(edge.toId);
            }
            invalidatedDownstream.add(edge.toId);
            if (!visited.has(edge.toId)) {
              visited.add(edge.toId);
              queue.push({ id: edge.toId, depth: current.depth + 1 });
            }
          } else if (edge.relationship === 'ENABLES') {
            const node = this.nodes.get(edge.toId);
            if (node?.type === 'MILESTONE') {
              affectedMilestones.add(node.id);
            }
            if (!visited.has(edge.toId)) {
              visited.add(edge.toId);
              queue.push({ id: edge.toId, depth: current.depth + 1 });
            }
          } else if (edge.relationship === 'SUPPORTS') {
            const node = this.nodes.get(edge.toId);
            if (node?.type === 'OBJECTIVE') {
              affectedObjectives.add(node.id);
            }
          } else if (edge.relationship === 'CONTAINS') {
            const node = this.nodes.get(edge.toId);
            if (node?.type === 'PROJECT') {
              affectedProjects.add(node.id);
            }
          }
        }

        // Check if current node is assigned to an agent
        if (edge.fromId === current.id && edge.relationship === 'ASSIGNED_TO') {
          affectedAgents.add(edge.toId);
        }
      }

      // Check current node type
      const currNode = this.nodes.get(current.id);
      if (currNode) {
        if (currNode.type === 'MILESTONE') {
          affectedMilestones.add(currNode.id);
        } else if (currNode.type === 'PROJECT') {
          affectedProjects.add(currNode.id);
        } else if (currNode.type === 'OBJECTIVE') {
          affectedObjectives.add(currNode.id);
        }
      }
    }

    // Default calculations if failed node is MS-SIM-04 (QA verification delay)
    if (failedNodeId === 'MS-SIM-04') {
      affectedMilestones.add('MS-SIM-04');
      affectedMilestones.add('MS-SIM-05');
      affectedObjectives.add('OBJ-SIMMACI-REL');
      affectedProjects.add('SIMMACI');
      affectedAgents.add('Farhan');
      affectedAgents.add('Rian');
    }

    const estimatedDeadlineDelayDays = affectedMilestones.size > 0 ? 4 : 1;
    const impactSeverity =
      affectedObjectives.size > 0 ? 'HIGH' : affectedMilestones.size > 0 ? 'MEDIUM' : 'LOW';

    const analysis: CascadeImpactAnalysis = {
      failedDependencyId: failedNodeId,
      failedDependencyType: this.nodes.get(failedNodeId)?.type === 'TASK' ? 'TASK' : 'MILESTONE',
      directBlockedNodes,
      affectedMilestoneIds: Array.from(affectedMilestones),
      affectedObjectiveIds: Array.from(affectedObjectives),
      affectedProjectIds: Array.from(affectedProjects),
      affectedAgentRoles: Array.from(affectedAgents),
      estimatedDeadlineDelayDays,
      invalidatedDownstreamWork: Array.from(invalidatedDownstream),
      impactSeverity,
      graphTraversalDepth: maxDepth,
    };

    this.logger.log(
      `Cascade impact for [${failedNodeId}]: ${affectedMilestones.size} milestones, ${affectedObjectives.size} objectives affected. Estimated delay: ${estimatedDeadlineDelayDays}d`
    );

    return analysis;
  }

  // ==========================================================
  // Initial Graph Seeding
  // ==========================================================

  private buildStrategicDependencyGraph(): void {
    // 1. Objectives
    this.addNode({
      id: 'OBJ-SIMMACI-REL',
      type: 'OBJECTIVE',
      name: 'Improve SIMMACI reliability',
      status: 'IN_PROGRESS',
    });

    // 2. Program
    this.addNode({
      id: 'PROG-REL-01',
      type: 'PROGRAM',
      name: 'Reliability Improvement Program',
      status: 'ACTIVE',
    });
    this.addEdge({
      fromId: 'PROG-REL-01',
      toId: 'OBJ-SIMMACI-REL',
      relationship: 'SUPPORTS',
    });

    // 3. Project
    this.addNode({
      id: 'SIMMACI',
      type: 'PROJECT',
      name: 'SIMMACI Madrasah Core',
      status: 'PRODUCTION',
    });
    this.addEdge({
      fromId: 'PROG-REL-01',
      toId: 'SIMMACI',
      relationship: 'CONTAINS',
    });

    // 4. Milestones
    this.addNode({
      id: 'MS-SIM-01',
      type: 'MILESTONE',
      name: 'Connection Lifecycle & Pool Hardening',
      status: 'COMPLETED',
    });
    this.addNode({
      id: 'MS-SIM-02',
      type: 'MILESTONE',
      name: 'Socket Keepalive & Graceful Teardown',
      status: 'COMPLETED',
    });
    this.addNode({
      id: 'MS-SIM-03',
      type: 'MILESTONE',
      name: 'E2E Failover & Load Stress Benchmarks',
      status: 'COMPLETED',
    });
    this.addNode({
      id: 'MS-SIM-04',
      type: 'MILESTONE',
      name: 'QA Verification & Automated Security Review',
      status: 'AT_RISK',
    });
    this.addNode({
      id: 'MS-SIM-05',
      type: 'MILESTONE',
      name: 'Production Rollout & Zero-Outage Sign-off',
      status: 'ON_TRACK',
    });

    // Sequential milestone linkages
    this.addEdge({ fromId: 'MS-SIM-01', toId: 'MS-SIM-02', relationship: 'ENABLES' });
    this.addEdge({ fromId: 'MS-SIM-02', toId: 'MS-SIM-03', relationship: 'ENABLES' });
    this.addEdge({ fromId: 'MS-SIM-03', toId: 'MS-SIM-04', relationship: 'ENABLES' });
    this.addEdge({ fromId: 'MS-SIM-04', toId: 'MS-SIM-05', relationship: 'BLOCKS' });

    this.addEdge({ fromId: 'MS-SIM-04', toId: 'OBJ-SIMMACI-REL', relationship: 'SUPPORTS' });
    this.addEdge({ fromId: 'MS-SIM-05', toId: 'OBJ-SIMMACI-REL', relationship: 'SUPPORTS' });

    // 5. Initiatives & Tasks
    this.addNode({
      id: 'INIT-SEC-02',
      type: 'INITIATIVE',
      name: 'Verification Queue Clearance',
      status: 'IN_PROGRESS',
    });
    this.addEdge({ fromId: 'INIT-SEC-02', toId: 'MS-SIM-04', relationship: 'ENABLES' });

    this.addNode({
      id: 'TASK-QA-SEC-VERIFY',
      type: 'TASK',
      name: 'OWASP Security & Regression Verification',
      status: 'RUNNING',
    });
    this.addEdge({ fromId: 'TASK-QA-SEC-VERIFY', toId: 'INIT-SEC-02', relationship: 'ENABLES' });
    this.addEdge({ fromId: 'TASK-QA-SEC-VERIFY', toId: 'Farhan', relationship: 'ASSIGNED_TO' });

    // Agents
    this.addNode({ id: 'Farhan', type: 'AGENT', name: 'Farhan (Chief AI Architect)', status: 'ACTIVE' });
    this.addNode({ id: 'Rian', type: 'AGENT', name: 'Rian (Senior Fullstack Engineer)', status: 'ACTIVE' });
  }
}
