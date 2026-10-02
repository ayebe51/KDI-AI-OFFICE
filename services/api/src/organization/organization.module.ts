// ==========================================================
// services/api/src/organization/organization.module.ts
// Phase 13: Organizational Intelligence & Workforce Maturity Module
// ==========================================================

import { Module, forwardRef } from '@nestjs/common';
import { ObjectiveService } from './objective.service.js';
import { PriorityEngineService } from './priority-engine.service.js';
import { CapacityEngineService } from './capacity-engine.service.js';
import { WorkforceIntelligenceService } from './workforce-intelligence.service.js';
import { KPIEngineService } from './kpi-engine.service.js';
import { HealthBottleneckService } from './health-bottleneck.service.js';
import { KnowledgeIntelligenceService } from './knowledge-intelligence.service.js';
import { LessonsLearnedService } from './lessons-learned.service.js';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service.js';
import { RecommendationDecisionService } from './recommendation-decision.service.js';
import { ReportingService } from './reporting.service.js';
import { OrganizationController } from './organization.controller.js';
import { RuntimeModule } from '../runtime/runtime.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { GraphModule } from '../graph/graph.module.js';

@Module({
  imports: [
    forwardRef(() => RuntimeModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => ProjectsModule),
    forwardRef(() => GraphModule),
  ],
  controllers: [OrganizationController],
  providers: [
    ObjectiveService,
    PriorityEngineService,
    CapacityEngineService,
    WorkforceIntelligenceService,
    KPIEngineService,
    HealthBottleneckService,
    KnowledgeIntelligenceService,
    LessonsLearnedService,
    PortfolioIntelligenceService,
    RecommendationDecisionService,
    ReportingService,
  ],
  exports: [
    ObjectiveService,
    PriorityEngineService,
    CapacityEngineService,
    WorkforceIntelligenceService,
    KPIEngineService,
    HealthBottleneckService,
    KnowledgeIntelligenceService,
    LessonsLearnedService,
    PortfolioIntelligenceService,
    RecommendationDecisionService,
    ReportingService,
  ],
})
export class OrganizationModule {}
