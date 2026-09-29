// ==========================================================
// services/api/src/engineering/engineering.module.ts
// NestJS Module for Phase 4 MetaGPT + Antigravity Integration
// ==========================================================

import { Module } from '@nestjs/common';
import { EngineeringService } from './engineering.service.js';
import { EngineeringController } from './engineering.controller.js';

@Module({
  controllers: [EngineeringController],
  providers: [EngineeringService],
  exports: [EngineeringService],
})
export class EngineeringModule {}
