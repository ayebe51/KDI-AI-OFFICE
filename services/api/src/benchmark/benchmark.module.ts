// ==========================================================
// services/api/src/benchmark/benchmark.module.ts
// NestJS Autonomous Benchmark Module (Phase 16)
// ==========================================================

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { WebSocketModule } from '../websocket/websocket.module.js';
import { BenchmarkService } from './benchmark.service.js';
import { BenchmarkController } from './benchmark.controller.js';

@Module({
  imports: [DatabaseModule, WebSocketModule],
  controllers: [BenchmarkController],
  providers: [BenchmarkService],
  exports: [BenchmarkService],
})
export class BenchmarkModule {}
