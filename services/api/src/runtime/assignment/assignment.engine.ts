// ==========================================================
// services/api/src/runtime/assignment/assignment.engine.ts
// Intelligent Agent Assignment, Skill & Capability Matching Engine
// ==========================================================

import type {
  CanonicalTask,
  AgentDefinition,
  AgentAssignmentResult,
  AgentSkill,
  ModelCapability,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

export class AgentAssignmentEngine {
  private readonly logger = new StructuredLogger('AgentAssignmentEngine');

  /**
   * Assign the most suitable candidate agent for a task
   */
  public assign(
    task: CanonicalTask,
    candidateAgents: AgentDefinition[]
  ): AgentAssignmentResult {
    const rejectedAgents: Array<{ agentId: string; reason: string }> = [];
    const eligibleAgents: Array<{ agent: AgentDefinition; score: number; rationale: string }> = [];

    for (const agent of candidateAgents) {
      // 1. Lifecycle Check
      if (agent.lifecycle !== 'ACTIVE') {
        rejectedAgents.push({
          agentId: agent.agentId,
          reason: `Agent lifecycle is ${agent.lifecycle} (must be ACTIVE)`,
        });
        continue;
      }

      // 2. Availability Check
      if (agent.availability === 'OFFLINE' || agent.availability === 'DRAINING' || agent.availability === 'ERROR') {
        rejectedAgents.push({
          agentId: agent.agentId,
          reason: `Agent availability is ${agent.availability}`,
        });
        continue;
      }

      // 3. Concurrency Limit Check
      if (agent.currentRunningTasks >= agent.concurrencyLimit) {
        rejectedAgents.push({
          agentId: agent.agentId,
          reason: `Agent reached max concurrency limit (${agent.currentRunningTasks}/${agent.concurrencyLimit})`,
        });
        continue;
      }

      // 4. Privacy Check (CONFIDENTIAL requires local/private capabilities)
      if (task.privacyClass === 'CONFIDENTIAL') {
        const hasLocalCap = agent.capabilities.includes('LOCAL') && agent.capabilities.includes('PRIVATE');
        if (!hasLocalCap) {
          rejectedAgents.push({
            agentId: agent.agentId,
            reason: 'Sovereign privacy boundary: Agent lacks verified LOCAL/PRIVATE capabilities for CONFIDENTIAL task',
          });
          continue;
        }
      }

      // 5. Skill Matching Check
      const missingSkills = this.getMissingSkills(task.requiredSkills, agent.skills);
      if (missingSkills.length > 0) {
        rejectedAgents.push({
          agentId: agent.agentId,
          reason: `Missing required skills: [${missingSkills.join(', ')}]`,
        });
        continue;
      }

      // 6. Capability Matching Check
      const missingCaps = this.getMissingCapabilities(task.requiredCapabilities, agent.capabilities);
      if (missingCaps.length > 0) {
        rejectedAgents.push({
          agentId: agent.agentId,
          reason: `Missing required model capabilities: [${missingCaps.join(', ')}]`,
        });
        continue;
      }

      // 7. Calculate Suitability Score
      let score = 100;

      // Prefer currently IDLE agents over busy ones
      if (agent.status === 'IDLE' || agent.status === 'AVAILABLE') {
        score += 50;
      } else {
        score -= agent.currentRunningTasks * 20;
      }

      // Preference bonus if agent matches specific requested role
      if (task.assignedAgent && (agent.agentId === task.assignedAgent || agent.role === task.assignedAgent)) {
        score += 200;
      }

      // Bonus for skill specialization depth
      score += agent.skills.length * 5;

      eligibleAgents.push({
        agent,
        score,
        rationale: `Satisfies all ${task.requiredSkills.length} skills and ${task.requiredCapabilities.length} capabilities.`,
      });
    }

    if (eligibleAgents.length === 0) {
      return {
        selectedAgent: undefined,
        assignmentReason: `No eligible agent available for task ${task.taskId}. All ${candidateAgents.length} candidates were rejected.`,
        rejectedAgents,
      };
    }

    // Sort by descending score
    eligibleAgents.sort((a, b) => b.score - a.score);
    const chosen = eligibleAgents[0];

    return {
      selectedAgent: chosen.agent,
      assignmentReason: `Selected ${chosen.agent.name} (${chosen.agent.role}) with score ${chosen.score}: ${chosen.rationale}`,
      rejectedAgents,
    };
  }

  private getMissingSkills(required: AgentSkill[], provided: AgentSkill[]): AgentSkill[] {
    return required.filter((s) => !provided.includes(s));
  }

  private getMissingCapabilities(required: ModelCapability[], provided: ModelCapability[]): ModelCapability[] {
    return required.filter((c) => !provided.includes(c));
  }
}
