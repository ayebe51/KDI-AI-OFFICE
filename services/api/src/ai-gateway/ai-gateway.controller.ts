// ==========================================================
// services/api/src/ai-gateway/ai-gateway.controller.ts
// KDI Business AI Gateway REST Controller
// ==========================================================

import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { AIGatewayService, type BusinessAIRequest } from './ai-gateway.service.js';

@Controller('ai-gateway')
export class AIGatewayController {
  constructor(private readonly aiGateway: AIGatewayService) {}

  @Get('agents')
  getAgentProfiles() {
    return this.aiGateway.getAgentProfiles();
  }

  @Get('stats')
  getUsageStats() {
    return this.aiGateway.getUsageStats();
  }

  @Get('health')
  getHealth() {
    return {
      localFirst: this.aiGateway.isLocalFirst(),
      cacheSize: this.aiGateway.getCacheSize(),
      stats: this.aiGateway.getUsageStats(),
    };
  }

  @Post('request')
  async sendRequest(@Body() req: BusinessAIRequest) {
    return this.aiGateway.request(req);
  }

  @Post('intelligence/executive-brief')
  async getExecutiveBrief(@Body() body: { businessData: Record<string, unknown> }) {
    return this.aiGateway.generateExecutiveBrief(body.businessData);
  }

  @Delete('cache')
  invalidateAllCache() {
    this.aiGateway.invalidateCache();
    return { success: true, message: 'All AI cache invalidated' };
  }

  @Delete('cache/:key')
  invalidateCacheKey(@Param('key') key: string) {
    this.aiGateway.invalidateCache(key);
    return { success: true, message: `Cache key "${key}" invalidated` };
  }
}
