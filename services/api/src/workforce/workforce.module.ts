// ==========================================================
// services/api/src/workforce/workforce.module.ts
// NestJS Module for Phase 8 Workforce Valuation & Benchmark Registry
// ==========================================================

import { Module } from '@nestjs/common';
import { WorkforceService } from './workforce.service.js';
import { WorkforceController } from './workforce.controller.js';
import { PublicWorkforceController } from './public-workforce.controller.js';

@Module({
  controllers: [WorkforceController, PublicWorkforceController],
  providers: [WorkforceService],
  exports: [WorkforceService],
})
export class WorkforceModule {}
