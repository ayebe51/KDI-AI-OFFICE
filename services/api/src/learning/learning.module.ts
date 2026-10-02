import { Module } from '@nestjs/common';
import { LearningDomainService } from './learning-domain.service';
import { RetrospectiveProcessMiningService } from './retrospective-process-mining.service';
import { RoutingLearningService } from './routing-learning.service';
import { RunbookIncidentLearningService } from './runbook-incident-learning.service';
import { PatternExperimentationService } from './pattern-experimentation.service';
import { GovernedImprovementService } from './governed-improvement.service';
import { OwnerFeedbackService } from './owner-feedback.service';
import { LearningOrchestratorService } from './learning-orchestrator.service';
import { LearningController } from './learning.controller';

@Module({
  controllers: [LearningController],
  providers: [
    LearningDomainService,
    RetrospectiveProcessMiningService,
    RoutingLearningService,
    RunbookIncidentLearningService,
    PatternExperimentationService,
    GovernedImprovementService,
    OwnerFeedbackService,
    LearningOrchestratorService,
  ],
  exports: [
    LearningDomainService,
    RetrospectiveProcessMiningService,
    RoutingLearningService,
    RunbookIncidentLearningService,
    PatternExperimentationService,
    GovernedImprovementService,
    OwnerFeedbackService,
    LearningOrchestratorService,
  ],
})
export class LearningModule {}
