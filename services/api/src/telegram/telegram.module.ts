// ==========================================================
// services/api/src/telegram/telegram.module.ts
// NestJS Module for Phase 11 Telegram Command & Communication Layer
// ==========================================================

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { WebSocketModule } from '../websocket/websocket.module.js';
import { RuntimeModule } from '../runtime/runtime.module.js';
import { AutonomyModule } from '../autonomy/autonomy.module.js';
import { WorkforceModule } from '../workforce/workforce.module.js';
import { EngineeringModule } from '../engineering/engineering.module.js';
import { GraphModule } from '../graph/graph.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { LearningModule } from '../learning/learning.module.js';
import { StrategyModule } from '../strategy/strategy.module.js';
import { BenchmarkModule } from '../benchmark/benchmark.module.js';

import { TelegramController } from './telegram.controller.js';
import { TelegramClient } from './client/telegram.client.js';
import { TelegramRepository } from './persistence/telegram.repository.js';
import { OrchestratorService } from './orchestrator/orchestrator.service.js';
import { TelegramGatewayService } from './gateway/telegram-gateway.service.js';
import { TelegramNotificationService } from './notifications/telegram-notification.service.js';

import { PostgresService } from '../database/postgres.service.js';
import { RedisService } from '../database/redis.service.js';

@Module({
  imports: [
    DatabaseModule,
    WebSocketModule,
    forwardRef(() => RuntimeModule),
    forwardRef(() => AutonomyModule),
    forwardRef(() => WorkforceModule),
    forwardRef(() => EngineeringModule),
    forwardRef(() => GraphModule),
    forwardRef(() => LLMModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => LearningModule),
    forwardRef(() => StrategyModule),
    forwardRef(() => BenchmarkModule),
  ],
  controllers: [TelegramController],
  providers: [
    {
      provide: TelegramClient,
      useFactory: () => new TelegramClient(),
    },
    {
      provide: TelegramRepository,
      useFactory: (postgres: PostgresService, redis: RedisService) => {
        return new TelegramRepository(postgres, redis);
      },
      inject: [PostgresService, RedisService],
    },
    OrchestratorService,
    TelegramGatewayService,
    TelegramNotificationService,
  ],
  exports: [
    TelegramGatewayService,
    OrchestratorService,
    TelegramNotificationService,
    TelegramClient,
    TelegramRepository,
  ],
})
export class TelegramModule {}
