// ==========================================================
// services/api/src/llm/context/context-budgeter.ts
// Context Window Estimation, Token Budgeting & Safe Truncation
// ==========================================================

import type { LLMMessage, LLMRequest, ModelMetadata } from '@kdi/types';

export interface BudgetAssessment {
  estimatedInputTokens: number;
  outputBudget: number;
  totalEstimatedTokens: number;
  isWithinBudget: boolean;
  truncatedMessages: LLMMessage[];
  warning?: string;
}

export class ContextBudgeter {
  /**
   * Fast rule-of-thumb heuristic token estimator: ~4 characters per token
   */
  public static estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  public static assessRequest(
    request: LLMRequest,
    model: ModelMetadata
  ): BudgetAssessment {
    const defaultMaxOutput = 2048;
    const outputBudget = Math.min(
      request.maxOutputTokens || request.budgetPolicy?.maxOutputTokens || defaultMaxOutput,
      model.maxOutputTokens
    );

    const maxInputAllowed = Math.min(
      request.budgetPolicy?.maxInputTokens || model.contextLimit - outputBudget,
      model.contextLimit - outputBudget
    );

    // Calculate system instruction tokens (never truncate security/system instructions)
    const systemTokens = this.estimateTokens(request.systemInstruction || '');

    // Estimate conversation message tokens
    let totalInputTokens = systemTokens + this.estimateTokens(request.context || '');
    const processedMessages: LLMMessage[] = [];

    // Prioritize newest messages backwards, preserving system instructions unconditionally
    const nonSystemMessages = request.messages.filter((m) => m.role !== 'system');
    let accumulatedTokens = systemTokens;
    const reversedIncluded: LLMMessage[] = [];

    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const msg = nonSystemMessages[i];
      const msgTokens = this.estimateTokens(msg.content);

      if (accumulatedTokens + msgTokens <= maxInputAllowed) {
        reversedIncluded.push(msg);
        accumulatedTokens += msgTokens;
      } else {
        // If message is too long, partially truncate content with a notice
        const availableTokens = maxInputAllowed - accumulatedTokens;
        if (availableTokens > 50) {
          const truncatedChars = availableTokens * 4;
          reversedIncluded.push({
            ...msg,
            content: msg.content.substring(0, truncatedChars) + '\n...[TRUNCATED FOR CONTEXT BUDGET]...',
          });
          accumulatedTokens += availableTokens;
        }
        break;
      }
    }

    // Restore original chronological order
    const orderedConversation = reversedIncluded.reverse();

    // Include original system message if present
    const originalSystem = request.messages.find((m) => m.role === 'system');
    if (originalSystem) {
      processedMessages.push(originalSystem);
    }
    processedMessages.push(...orderedConversation);

    totalInputTokens = accumulatedTokens;
    const totalEstimated = totalInputTokens + outputBudget;
    const maxTotalBudget = request.budgetPolicy?.maxTotalTokens || model.contextLimit;
    const isWithinBudget = totalEstimated <= maxTotalBudget;

    let warning: string | undefined;
    if (processedMessages.length < request.messages.length) {
      warning = `Context exceeded input budget (${maxInputAllowed} tokens). Safely truncated ${
        request.messages.length - processedMessages.length
      } older messages while preserving system prompts.`;
    }

    return {
      estimatedInputTokens: totalInputTokens,
      outputBudget,
      totalEstimatedTokens: totalEstimated,
      isWithinBudget,
      truncatedMessages: processedMessages,
      warning,
    };
  }
}
