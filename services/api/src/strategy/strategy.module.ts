import { Module } from '@nestjs/common';
import { StrategicObjectiveService } from './strategic-objective.service.js';
import { LongHorizonPlanService } from './long-horizon-plan.service.js';
import { DependencyCascadeService } from './dependency-cascade.service.js';
import { ReplanningEngineService } from './replanning-engine.service.js';
import { ForecastingBudgetService } from './forecasting-budget.service.js';
import { StrategicRiskScenarioService } from './strategic-risk-scenario.service.js';
import { DriftGovernanceService } from './drift-governance.service.js';
import { LongHorizonPilotService } from './long-horizon-pilot.service.js';
import { StrategicOrchestratorService } from './strategic-orchestrator.service.js';
import { StrategyController } from './strategy.controller.js';

@Module({
  controllers: [StrategyController],
  providers: [
    StrategicObjectiveService,
    LongHorizonPlanService,
    DependencyCascadeService,
    ReplanningEngineService,
    ForecastingBudgetService,
    StrategicRiskScenarioService,
    DriftGovernanceService,
    LongHorizonPilotService,
    StrategicOrchestratorService,
  ],
  exports: [
    StrategicObjectiveService,
    LongHorizonPlanService,
    DependencyCascadeService,
    ReplanningEngineService,
    ForecastingBudgetService,
    StrategicRiskScenarioService,
    DriftGovernanceService,
    LongHorizonPilotService,
    StrategicOrchestratorService,
  ],
})
export class StrategyModule {}
