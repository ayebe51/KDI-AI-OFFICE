// ==========================================================
// services/api/src/runtime/runtime.module.ts
// Agent Runtime & Task Orchestration NestJS Module
// ==========================================================

import { Module } from '@nestjs/common';
import { LLMModule } from '../llm/llm.module.js';
import { RuntimeService } from './runtime.service.js';
import { RuntimeController } from './runtime.controller.js';

@Module({
  imports: [LLMModule],
  controllers: [RuntimeController],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
