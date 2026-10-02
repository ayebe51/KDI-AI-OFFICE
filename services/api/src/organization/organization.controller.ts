// ==========================================================
// services/api/src/organization/organization.controller.ts
// Phase 13: REST API for Organizational Intelligence & Executive Governance
// ==========================================================

import { Controller, Get, Post, Body, Param, Query, Headers, ForbiddenException } from '@nestjs/common';
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

@Controller('api/v1/organization')
export class OrganizationController {
  constructor(
    private readonly objectiveService: ObjectiveService,
    private readonly priorityEngine: PriorityEngineService,
    private readonly capacityEngine: CapacityEngineService,
    private readonly workforceIntelligence: WorkforceIntelligenceService,
    private readonly kpiEngine: KPIEngineService,
    private readonly healthBottleneck: HealthBottleneckService,
    private readonly knowledgeService: KnowledgeIntelligenceService,
    private readonly lessonsService: LessonsLearnedService,
    private readonly portfolioService: PortfolioIntelligenceService,
    private readonly recommendationDecision: RecommendationDecisionService,
    private readonly reportingService: ReportingService
  ) {}

  // 1. Objectives & Traceability
  @Get('objectives')
  getObjectives() {
    return {
      total: this.objectiveService.getAllObjectives().length,
      data: this.objectiveService.getAllObjectives(),
      hierarchy: this.objectiveService.getObjectiveHierarchy(),
    };
  }

  @Get('objectives/trace/:taskId')
  getTaskTrace(@Param('taskId') taskId: string) {
    return this.objectiveService.getTaskObjectiveTrace(taskId);
  }

  // 2. Priority Engine & Conflict Resolution
  @Post('priority/evaluate')
  evaluatePriority(@Body() body: any) {
    return this.priorityEngine.evaluateTaskPriority(body);
  }

  @Post('priority/resolve-conflicts')
  resolvePriorityConflicts(@Body() body: { tasks: any[]; availableWorkersCount?: number }) {
    return this.priorityEngine.resolvePriorityConflicts(body.tasks, body.availableWorkersCount || 3);
  }

  // 3. Workforce Capacity
  @Get('capacity')
  getCapacity() {
    return this.capacityEngine.getCapacityOverview();
  }

  @Get('capacity/agents')
  getAgentWorkloads() {
    return this.capacityEngine.getAllAgentWorkloads();
  }

  // 4. Workforce Intelligence
  @Get('workforce/performance')
  getPerformance() {
    return this.workforceIntelligence.getAllIndicators();
  }

  @Get('workforce/performance/:agentId')
  getAgentPerformance(@Param('agentId') agentId: string) {
    return {
      indicator: this.workforceIntelligence.getIndicator(agentId),
      report: this.workforceIntelligence.getContextualPerformanceReport(agentId),
    };
  }

  // 5. KPI Catalog & Provenance
  @Get('kpis')
  getKPIs() {
    return {
      definitions: this.kpiEngine.getAllDefinitions(),
      snapshots: this.kpiEngine.getAllSnapshots(),
    };
  }

  // 6. Health, Bottlenecks & SPOF
  @Get('health')
  getHealth() {
    return this.healthBottleneck.getOrganizationalHealth();
  }

  @Get('bottlenecks')
  getBottlenecks() {
    return {
      bottlenecks: this.healthBottleneck.detectBottlenecks(),
      singlePointsOfFailure: this.healthBottleneck.detectSinglePointsOfFailure(),
    };
  }

  // 7. Knowledge Intelligence & Gaps
  @Get('knowledge')
  getKnowledge() {
    return {
      knowledgeItems: this.knowledgeService.getAllKnowledgeItems(),
      knowledgeGaps: this.knowledgeService.getKnowledgeGaps(),
    };
  }

  // 8. Memory & Lessons Learned
  @Get('memory')
  getMemory() {
    return {
      memoryItems: this.lessonsService.getAllMemoryItems(),
      lessonsLearned: this.lessonsService.getAllLessons(),
      automationCandidates: this.lessonsService.getAutomationCandidates(),
    };
  }

  // 9. Portfolio Intelligence & Cross-Project Conflicts
  @Get('portfolio')
  getPortfolio() {
    return {
      projects: this.portfolioService.getAllProjects(),
      conflicts: this.portfolioService.getCrossProjectConflicts(),
      cost: this.portfolioService.getCostIntelligence(),
      quality: this.portfolioService.getQualityIntelligence(),
      autonomyMaturity: this.portfolioService.getAutonomyMaturity(),
    };
  }

  // 10. Executive Briefing & Decision Support
  @Get('briefing')
  getBriefing() {
    return this.recommendationDecision.generateOrganizationalBriefing();
  }

  @Get('decision-support')
  getDecisionSupport(@Query('q') query: string) {
    const q = query || 'briefing';
    return {
      query: q,
      answer: this.recommendationDecision.answerDecisionSupportQuery(q),
    };
  }

  @Get('recommendations')
  getRecommendations() {
    return this.recommendationDecision.getAllRecommendations();
  }

  // 11. Reports
  @Get('reports/daily')
  getDailyReport() {
    return this.reportingService.generateDailyReport();
  }

  @Get('reports/weekly')
  getWeeklyReport() {
    return this.reportingService.generateWeeklyReport();
  }

  @Get('reports/monthly')
  getMonthlyReport() {
    return this.reportingService.generateMonthlyReport();
  }
}
