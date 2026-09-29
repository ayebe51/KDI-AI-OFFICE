// ==========================================================
// services/api/src/llm/llm.controller.ts
// REST Controller for AI Intelligence Layer
// ==========================================================

import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LLMService } from './llm.service.js';
import type {
  LLMRequest,
  LLMResponse,
  RoutingDecision,
  ModelMetadata,
  ProviderHealthStatus,
  ProviderUsageStats,
} from '@kdi/types';
import { LLMException } from './exceptions/llm.exception.js';

@Controller('llm')
export class LLMController {
  constructor(private readonly llmService: LLMService) {}

  @Post('route')
  public async routeRequest(
    @Body() body: Partial<LLMRequest>
  ): Promise<{ decision: RoutingDecision }> {
    try {
      const request: LLMRequest = {
        requestId: body.requestId || `route_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        taskType: body.taskType || 'CHAT',
        messages: body.messages || [{ role: 'user', content: 'Ping' }],
        systemInstruction: body.systemInstruction,
        context: body.context,
        requiredCapabilities: body.requiredCapabilities || [],
        privacyClass: body.privacyClass || 'INTERNAL',
        priority: body.priority || 'NORMAL',
        maxOutputTokens: body.maxOutputTokens,
        temperature: body.temperature,
        preferredProvider: body.preferredProvider,
        preferredModel: body.preferredModel,
        budgetPolicy: body.budgetPolicy,
        fallbackPolicy: body.fallbackPolicy,
        metadata: body.metadata,
      };

      const decision = this.llmService.route(request);
      return { decision };
    } catch (err: any) {
      if (err instanceof LLMException) {
        throw new HttpException(
          {
            error: err.code,
            provider: err.provider,
            message: err.message,
            isRetryable: err.isRetryable,
          },
          err.statusCode
        );
      }
      throw new HttpException(
        { error: 'UNKNOWN_ERROR', message: err.message || 'Routing failed' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('chat')
  public async chat(
    @Body() body: Partial<LLMRequest>
  ): Promise<LLMResponse> {
    try {
      const request: LLMRequest = {
        requestId: body.requestId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        taskType: body.taskType || 'CHAT',
        messages: body.messages || [{ role: 'user', content: 'Hello' }],
        systemInstruction: body.systemInstruction,
        context: body.context,
        requiredCapabilities: body.requiredCapabilities || [],
        privacyClass: body.privacyClass || 'INTERNAL',
        priority: body.priority || 'NORMAL',
        maxOutputTokens: body.maxOutputTokens ?? 2048,
        temperature: body.temperature ?? 0.7,
        stream: body.stream ?? false,
        preferredProvider: body.preferredProvider,
        preferredModel: body.preferredModel,
        budgetPolicy: body.budgetPolicy,
        fallbackPolicy: body.fallbackPolicy,
        tools: body.tools,
        metadata: body.metadata,
      };

      return await this.llmService.chat(request);
    } catch (err: any) {
      if (err instanceof LLMException) {
        throw new HttpException(
          {
            error: err.code,
            provider: err.provider,
            message: err.message,
            retryAfterMs: err.retryAfterMs,
            isRetryable: err.isRetryable,
          },
          err.statusCode
        );
      }
      throw new HttpException(
        { error: 'UNKNOWN_ERROR', message: err.message || 'LLM execution failed' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('models')
  public async listModels(): Promise<{ total: number; data: ModelMetadata[] }> {
    const models = await this.llmService.listModels();
    return {
      total: models.length,
      data: models,
    };
  }

  @Get('providers/health')
  public async getHealth(): Promise<{ data: ProviderHealthStatus[] }> {
    const health = await this.llmService.getProvidersHealth();
    return { data: health };
  }

  @Get('usage')
  public getUsage(): { data: ProviderUsageStats[] } {
    const stats = this.llmService.getUsage();
    return { data: stats };
  }
}
