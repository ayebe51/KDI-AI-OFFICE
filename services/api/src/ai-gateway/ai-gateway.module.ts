// ==========================================================
// services/api/src/ai-gateway/ai-gateway.module.ts
// KDI Business AI Gateway NestJS Module
// ==========================================================

import { Module } from '@nestjs/common';
import { AIGatewayService } from './ai-gateway.service.js';
import { AIGatewayController } from './ai-gateway.controller.js';

@Module({
  controllers: [AIGatewayController],
  providers: [AIGatewayService],
  exports: [AIGatewayService],
})
export class AIGatewayModule {}
