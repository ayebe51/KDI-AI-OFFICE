// ==========================================================
// services/api/src/llm/llm.module.ts
// AI Intelligence Layer NestJS Module
// ==========================================================

import { Module } from '@nestjs/common';
import { LLMService } from './llm.service.js';
import { LLMController } from './llm.controller.js';

@Module({
  controllers: [LLMController],
  providers: [LLMService],
  exports: [LLMService],
})
export class LLMModule {}
