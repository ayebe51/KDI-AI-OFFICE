import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { StrategicObjectiveService } from './strategic-objective.service.js';
import { LongHorizonPlanService } from './long-horizon-plan.service.js';
import { DependencyCascadeService } from './dependency-cascade.service.js';
import { ReplanningEngineService } from './replanning-engine.service.js';
import { ForecastingBudgetService } from './forecasting-budget.service.js';
import { StrategicRiskScenarioService } from './strategic-risk-scenario.service.js';
import { DriftGovernanceService } from './drift-governance.service.js';
import { LongHorizonPilotService } from './long-horizon-pilot.service.js';
import { StrategicOrchestratorService } from './strategic-orchestrator.service.js';

@Controller('strategy')
export class StrategyController {
  constructor(
    private readonly objectiveService: StrategicObjectiveService,
    private readonly planService: LongHorizonPlanService,
    private readonly cascadeService: DependencyCascadeService,
    private readonly replanningService: ReplanningEngineService,
    private readonly forecastService: ForecastingBudgetService,
    private readonly riskService: StrategicRiskScenarioService,
    private readonly governanceService: DriftGovernanceService,
    private readonly pilotService: LongHorizonPilotService,
    private readonly orchestratorService: StrategicOrchestratorService
  ) {}

  @Get('objectives')
  getAllObjectives() {
    return this.objectiveService.getAllObjectives();
  }

  @Get('objectives/:id')
  getObjective(@Param('id') id: string) {
    return this.objectiveService.getObjective(id);
  }

  @Get('programs')
  getAllPrograms() {
    return this.objectiveService.getAllPrograms();
  }

  @Get('milestones')
  getAllMilestones() {
    return this.objectiveService.getAllMilestones();
  }

  @Get('explain-task/:taskId')
  explainTask(@Param('taskId') taskId: string) {
    return this.objectiveService.explainTaskIntent(taskId);
  }

  @Get('plans/active')
  getActivePlan(@Query('objectiveId') objectiveId = 'OBJ-SIMMACI-REL') {
    return this.planService.getActivePlan(objectiveId);
  }

  @Get('plans/versions')
  getPlanVersions(@Query('objectiveId') objectiveId = 'OBJ-SIMMACI-REL') {
    return this.planService.getPlanVersionHistory(objectiveId);
  }

  @Get('deviation')
  getPlanDeviation(@Query('objectiveId') objectiveId = 'OBJ-SIMMACI-REL') {
    return this.planService.detectPlanDeviation(objectiveId);
  }

  @Get('cascade-impact/:nodeId')
  getCascadeImpact(@Param('nodeId') nodeId: string) {
    return this.cascadeService.calculateCascadeImpact(nodeId);
  }

  @Get('replanning')
  evaluateReplanning(@Query('objectiveId') objectiveId = 'OBJ-SIMMACI-REL') {
    return this.replanningService.evaluateReplanning(objectiveId);
  }

  @Post('replanning/execute')
  executeReplan(
    @Body()
    body: {
      objectiveId: string;
      chosenOptionId: string;
      approvedBy: string;
      customNote?: string;
    }
  ) {
    return this.replanningService.executeApprovedReplan(body);
  }

  @Post('replanning/rollback')
  rollbackPlan(
    @Body()
    body: {
      objectiveId: string;
      reason: string;
      degradedMetrics: string[];
      authorizedBy: string;
    }
  ) {
    return this.replanningService.rollbackToPreviousApprovedPlan(body);
  }

  @Get('budget')
  getBudgetStatus(@Query('objectiveId') objectiveId = 'OBJ-SIMMACI-REL') {
    return this.forecastService.getBudgetStatus(objectiveId);
  }

  @Get('capacity')
  getCapacityForecast() {
    return this.forecastService.get14DayCapacityForecast();
  }

  @Get('risks')
  getAllRisks(@Query('objectiveId') objectiveId?: string) {
    return this.riskService.getAllRisks(objectiveId);
  }

  @Post('scenarios/simulate')
  runSimulation(
    @Body()
    body: {
      scenarioName: string;
      injectedVariables: Record<string, unknown>;
    }
  ) {
    return this.riskService.runScenarioSimulation(body as any);
  }

  @Get('scenarios')
  getSimulations() {
    return this.riskService.getSimulations();
  }

  @Get('pilot')
  getPilotState() {
    return this.pilotService.getPilotState();
  }

  @Get('briefing')
  getBriefing(@Query('objectiveId') objectiveId = 'OBJ-SIMMACI-REL') {
    return this.orchestratorService.getStrategicBriefing(objectiveId);
  }

  @Get('decisions')
  getDecisionRequests(@Query('objectiveId') objectiveId?: string) {
    return this.governanceService.getDecisionRequests(objectiveId);
  }

  @Post('decisions/:id/resolve')
  resolveDecision(
    @Param('id') id: string,
    @Body() body: { optionId: string; ownerName: string }
  ) {
    return this.governanceService.resolveDecisionRequest(id, body.optionId, body.ownerName);
  }
}
