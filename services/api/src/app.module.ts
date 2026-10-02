import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { WebSocketModule } from './websocket/websocket.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { LLMModule } from './llm/llm.module.js';
import { RuntimeModule } from './runtime/runtime.module.js';
import { EngineeringModule } from './engineering/engineering.module.js';
import { GraphModule } from './graph/graph.module.js';
import { OfficeModule } from './office/office.module.js';
import { WorkforceModule } from './workforce/workforce.module.js';
import { AutonomyModule } from './autonomy/autonomy.module.js';
import { ReliabilityModule } from './reliability/reliability.module.js';
import { TelegramModule } from './telegram/telegram.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { LearningModule } from './learning/learning.module.js';
import { StrategyModule } from './strategy/strategy.module.js';
// Phase 15.1: Company OS + Business AI Gateway
import { CompanyModule } from './company/company.module.js';
import { AIGatewayModule } from './ai-gateway/ai-gateway.module.js';

@Module({
  imports: [
    DatabaseModule,
    WebSocketModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    AgentsModule,
    LLMModule,
    RuntimeModule,
    EngineeringModule,
    GraphModule,
    OfficeModule,
    WorkforceModule,
    AutonomyModule,
    ReliabilityModule,
    TelegramModule,
    OrganizationModule,
    LearningModule,
    StrategyModule,
    // Phase 15.1: Company OS + Business AI Gateway
    CompanyModule,
    AIGatewayModule,
  ],
})
export class AppModule {}
