// ==========================================================
// services/api/src/autonomy/autonomy.module.ts
// NestJS Module for Phase 9 Autonomous Office Operations & Command Center
// ==========================================================

import { Module } from '@nestjs/common';
import { AutonomyService } from './autonomy.service.js';
import { AutonomyController } from './autonomy.controller.js';

@Module({
  controllers: [AutonomyController],
  providers: [AutonomyService],
  exports: [AutonomyService],
})
export class AutonomyModule {}
