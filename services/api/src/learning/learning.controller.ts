import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { LearningOrchestratorService } from './learning-orchestrator.service';
import { LearningDomainService } from './learning-domain.service';
import { RetrospectiveProcessMiningService } from './retrospective-process-mining.service';
import { RoutingLearningService } from './routing-learning.service';
import { RunbookIncidentLearningService } from './runbook-incident-learning.service';
import { PatternExperimentationService } from './pattern-experimentation.service';
import { GovernedImprovementService } from './governed-improvement.service';
import { OwnerFeedbackService } from './owner-feedback.service';
import { ImprovementProposalStatus, ChangeGovernanceTier } from '@kdi/types';

@Controller('api/learning')
export class LearningController {
  constructor(
    private readonly orchestratorService: LearningOrchestratorService,
    private readonly domainService: LearningDomainService,
    private readonly retroProcessService: RetrospectiveProcessMiningService,
    private readonly routingLearningService: RoutingLearningService,
    private readonly runbookIncidentService: RunbookIncidentLearningService,
    private readonly patternExpService: PatternExperimentationService,
    private readonly governedImprovementService: GovernedImprovementService,
    private readonly ownerFeedbackService: OwnerFeedbackService,
  ) {}

  @Get('report')
  getLearningReport() {
    return this.orchestratorService.getWeeklyLearningReport();
  }

  @Get('lessons')
  getLessons(@Query('validated') validated?: string) {
    if (validated === 'true') {
      return this.domainService.getValidatedLessons();
    }
    return this.domainService.getAllLessons();
  }

  @Get('patterns')
  getPatterns() {
    return this.domainService.getAllPatterns();
  }

  @Get('proposals')
  getProposals(@Query('status') status?: ImprovementProposalStatus) {
    if (status) {
      return this.governedImprovementService.getProposalsByStatus(status);
    }
    return this.governedImprovementService.getAllProposals();
  }

  @Post('proposals')
  createProposal(
    @Body()
    body: {
      title: string;
      description: string;
      problem: string;
      evidence: string[];
      hypothesis: string;
      expectedBenefit: string;
      risk: ChangeGovernanceTier;
      affectedSystems: string[];
      proposedChange: string;
      validationPlan: string;
      rollbackPlan: string;
      confidence: number;
    }
  ) {
    return this.governedImprovementService.createProposal(body);
  }

  @Post('proposals/:id/status')
  transitionProposalStatus(
    @Param('id') id: string,
    @Body() body: { targetStatus: ImprovementProposalStatus; actor?: string }
  ) {
    return this.governedImprovementService.transitionStatus(id, body.targetStatus, body.actor);
  }

  @Post('proposals/:id/rollback')
  rollbackProposal(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.governedImprovementService.triggerRollback(id, body.reason);
  }

  @Get('experiments')
  getExperiments() {
    return this.patternExpService.getAllExperiments();
  }

  @Post('experiments')
  createExperiment(
    @Body()
    body: {
      proposalId: string;
      hypothesis: string;
      baselineMetricName: string;
      baselineValue: number;
      targetValue: number;
      changeDescription: string;
      scope: string;
      successMetric: string;
      risk: ChangeGovernanceTier;
      durationHours: number;
    }
  ) {
    return this.patternExpService.createExperiment(body);
  }

  @Post('experiments/:id/evaluate')
  evaluateExperiment(
    @Param('id') id: string,
    @Body() body: { measuredCandidateMetric: number; conclusion: string }
  ) {
    return this.patternExpService.evaluateExperiment({
      experimentId: id,
      measuredCandidateMetric: body.measuredCandidateMetric,
      conclusion: body.conclusion,
    });
  }

  @Get('impact')
  getImpact() {
    return this.patternExpService.getAggregateMeasuredImpact();
  }

  @Get('knowledge/decay')
  getKnowledgeDecay() {
    return this.runbookIncidentService.auditKnowledgeDecay();
  }

  @Post('feedback')
  ingestFeedback(@Body() body: { rawText: string; source?: 'TELEGRAM' | 'WEB' | 'API'; messageId?: string }) {
    return this.ownerFeedbackService.ingestFeedback(body);
  }

  @Get('preferences')
  getPreferences() {
    return this.ownerFeedbackService.getAllPreferences();
  }

  @Get('query')
  answerQuery(@Query('q') query: string) {
    return {
      query,
      answer: this.orchestratorService.answerLearningQuery(query || ''),
    };
  }
}
