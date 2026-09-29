// ==========================================================
// services/api/src/runtime/execution/llm-execution.provider.ts
// Phase 3 LLM Task Execution Provider linking to Phase 2 AI Layer
// ==========================================================

import type { CanonicalTask, AgentDefinition, TaskResult, LLMRequest, LLMResponse } from '@kdi/types';
import type { ExecutionProvider } from './execution-provider.interface.js';
import { TaskValidator } from './task.validator.js';
import { LLMService } from '../../llm/llm.service.js';
import { StructuredLogger } from '@kdi/shared';

export class LLMExecutionProvider implements ExecutionProvider {
  public readonly providerType = 'LLM' as const;
  private readonly logger = new StructuredLogger('LLMExecutionProvider');

  constructor(private readonly llmService: LLMService) {}

  public async execute(
    task: CanonicalTask,
    agent: AgentDefinition,
    signal?: AbortSignal
  ): Promise<TaskResult> {
    const executionId = task.executionId || `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();

    // Check cancellation before calling model
    if (signal?.aborted) {
      return {
        status: 'CANCELLED',
        summary: 'Execution aborted prior to model invocation',
        executionId,
      };
    }

    // Construct Canonical LLMRequest
    const systemPrompt = `You are ${agent.name}, an AI ${agent.role} in KDI AI Office.
Department: ${agent.department}.
Primary Skills: ${agent.skills.join(', ')}.
Execute the assigned task with high precision and adherence to enterprise engineering standards.`;

    const userPrompt = `Task Title: ${task.title}
Task Type: ${task.taskType}
Priority: ${task.priority}

Description:
${task.description}

${task.context ? `Context & Repository Data:\n${task.context}` : ''}`;

    const llmRequest: LLMRequest = {
      requestId: executionId,
      taskType: task.taskType,
      messages: [{ role: 'user', content: userPrompt }],
      systemInstruction: systemPrompt,
      context: task.context,
      requiredCapabilities: task.requiredCapabilities,
      privacyClass: task.privacyClass || 'INTERNAL',
      priority: task.priority,
      temperature: 0.4,
      preferredProvider: agent.modelPolicy?.preferredProvider,
      preferredModel: agent.modelPolicy?.preferredModel,
    };

    try {
      this.logger.info(
        'execute',
        `Dispatched execution ${executionId} for task ${task.taskId} to LLMService under agent ${agent.agentId}`
      );

      const response: LLMResponse = await this.llmService.chat(llmRequest);

      // Check cancellation immediately after response
      if (signal?.aborted) {
        return {
          status: 'CANCELLED',
          summary: 'Execution was aborted during or immediately after LLM inference',
          executionId,
        };
      }

      // Format initial TaskResult
      const result: TaskResult = {
        status: 'SUCCESS',
        summary: response.content,
        executionId,
        usage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
        },
        costUsd: response.usage.estimatedCostUsd,
        outputs: {
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
          fallbackUsed: response.fallbackUsed,
          routingReason: response.routingReason,
        },
      };

      // Validate result
      const validation = TaskValidator.validate(task, result);
      if (!validation.valid) {
        this.logger.warn('execute', `Task ${task.taskId} output validation warnings: ${validation.errors.join(', ')}`);
        result.warnings = validation.errors;
      }

      return result;
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error('execute', `Execution failed for task ${task.taskId}: ${errorMsg}`);

      return {
        status: 'FAILED',
        summary: `Execution failure: ${errorMsg}`,
        executionId,
        errors: [errorMsg],
      };
    }
  }
}
