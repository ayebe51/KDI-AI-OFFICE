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
  ],
})
export class AppModule {}
