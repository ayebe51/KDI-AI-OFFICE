// ==========================================================
// services/api/src/autonomy/autonomy.controller.ts
// REST Controller for Phase 9 Autonomy Engine & Human Command Center
// ==========================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AutonomyService } from './autonomy.service.js';
import type { ApprovalScope, RiskLevel } from '@kdi/types';

@Controller('api/v1/autonomy')
export class AutonomyController {
  constructor(private readonly autonomyService: AutonomyService) {}

  @Get('overview')
  getOverview() {
    return {
      globalPause: this.autonomyService.getGlobalPauseDetails(),
      dailyBriefing: this.autonomyService.generateDailyBriefing(),
      objectivesCount: this.autonomyService.getObjectives().length,
      pendingApprovalsCount: this.autonomyService.getPendingApprovals().length,
      activeIncidentsCount: this.autonomyService.getIncidents().filter((i) => i.status !== 'RESOLVED').length,
      autonomyHealth: this.autonomyService.getAutonomyHealth(),
      systemHealth: this.autonomyService.getSystemHealth(),
      timestamp: new Date().toISOString(),
    };
  }

  // Objectives
  @Get('objectives')
  getObjectives() {
    return { data: this.autonomyService.getObjectives() };
  }

  @Get('objectives/:id')
  getObjectiveById(@Param('id') id: string) {
    const obj = this.autonomyService.getObjectiveById(id);
    if (!obj) throw new BadRequestException(`Objective ${id} not found.`);
    return obj;
  }

  @Post('objectives')
  createObjective(@Body() dto: any) {
    return this.autonomyService.createObjective(dto, dto.creator || 'Human Operator');
  }

  @Patch('objectives/:id')
  updateObjective(@Param('id') id: string, @Body() updates: any) {
    return this.autonomyService.updateObjective(id, updates, updates.updater || 'Human Operator');
  }

  @Post('objectives/:id/decompose')
  @HttpCode(HttpStatus.OK)
  decomposeObjective(@Param('id') id: string) {
    return this.autonomyService.decomposeObjective(id);
  }

  // Policies
  @Get('policies')
  getPolicies() {
    return { data: this.autonomyService.getPolicies() };
  }

  // Runbooks
  @Get('runbooks')
  getRunbooks() {
    return { data: this.autonomyService.getRunbooks() };
  }

  @Get('runbooks/:id')
  getRunbookById(@Param('id') id: string) {
    const rb = this.autonomyService.getRunbookById(id);
    if (!rb) throw new BadRequestException(`Runbook ${id} not found.`);
    return rb;
  }

  @Post('runbooks/:id/run')
  @HttpCode(HttpStatus.OK)
  async executeRunbook(
    @Param('id') id: string,
    @Body() body: { params?: any; dryRun?: boolean; simulation?: boolean; actor?: string }
  ) {
    return this.autonomyService.executeRunbook(id, body?.params, {
      dryRun: body?.dryRun,
      simulation: body?.simulation,
      actor: body?.actor || 'Human Operator',
    });
  }

  // Approvals
  @Get('approvals')
  getApprovals(@Query('all') all?: string) {
    return {
      data: all === 'true'
        ? this.autonomyService.getAllApprovals()
        : this.autonomyService.getPendingApprovals(),
    };
  }

  @Post('approvals/:id/decide')
  @HttpCode(HttpStatus.OK)
  decideApproval(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVE' | 'REJECT'; scope?: ApprovalScope; user?: string; reason?: string }
  ) {
    if (!body || !body.decision) {
      throw new BadRequestException('Decision ("APPROVE" | "REJECT") is required.');
    }
    return this.autonomyService.decideApproval(
      id,
      body.decision,
      body.scope || 'ONCE',
      body.user || 'Human Operator',
      body.reason
    );
  }

  // Incidents
  @Get('incidents')
  getIncidents() {
    return { data: this.autonomyService.getIncidents() };
  }

  @Post('incidents')
  createIncident(@Body() body: { title: string; severity: RiskLevel; source: string; project?: string; diagnostics?: string[] }) {
    return this.autonomyService.createIncident(
      body.title,
      body.severity,
      body.source,
      body.project,
      body.diagnostics
    );
  }

  @Post('incidents/:id/diagnostics')
  runDiagnostics(@Param('id') id: string) {
    return { diagnostics: this.autonomyService.runSafeDiagnostics(id) };
  }

  @Post('incidents/:id/mitigate')
  mitigateIncident(
    @Param('id') id: string,
    @Body() body: { action: string; requiresApproval?: boolean }
  ) {
    return this.autonomyService.mitigateIncident(id, body.action, body.requiresApproval);
  }

  @Post('incidents/:id/resolve')
  resolveIncident(
    @Param('id') id: string,
    @Body() body: { rootCause: string; resolution: string }
  ) {
    return this.autonomyService.resolveIncident(id, body.rootCause, body.resolution);
  }

  // Briefing & Reports
  @Get('briefing/daily')
  getDailyBriefing() {
    return this.autonomyService.generateDailyBriefing();
  }

  @Get('reports/weekly')
  getWeeklyReport() {
    return this.autonomyService.generateWeeklyOperationsReport();
  }

  @Get('reports/monthly')
  getMonthlyReport() {
    return this.autonomyService.generateMonthlyOperationsReport();
  }

  // Natural Language Command Center Input
  @Post('command')
  @HttpCode(HttpStatus.OK)
  processCommand(@Body() body: { input: string; user?: string }) {
    if (!body || !body.input) throw new BadRequestException('Input is required.');
    return this.autonomyService.processNaturalLanguageCommand(body.input, body.user || 'Operator');
  }

  // Emergency Global Pause Switch
  @Post('pause')
  @HttpCode(HttpStatus.OK)
  togglePause(@Body() body: { active: boolean; reason: string; user?: string }) {
    if (body.active === undefined) throw new BadRequestException('Field "active" is required.');
    const active = this.autonomyService.toggleGlobalPause(
      body.active,
      body.reason || 'Operator override',
      body.user || 'Human Operator'
    );
    return { active, message: active ? 'Global Autonomy Pause ACTIVATED' : 'Global Autonomy Pause DEACTIVATED' };
  }

  // Dry Run
  @Post('dry-run')
  @HttpCode(HttpStatus.OK)
  dryRun(@Body() body: { runbookId: string; params?: any }) {
    return this.autonomyService.executeRunbook(body.runbookId, body.params, { dryRun: true });
  }

  // Simulation
  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  simulate(@Body() body: { runbookId: string; params?: any }) {
    return this.autonomyService.executeRunbook(body.runbookId, body.params, { simulation: true });
  }

  // Health Signals
  @Get('health')
  getHealth() {
    return {
      systemHealth: this.autonomyService.getSystemHealth(),
      projectHealth: this.autonomyService.getProjectHealth(),
      agentHealth: this.autonomyService.getAgentOperationalHealth(),
      autonomyHealth: this.autonomyService.getAutonomyHealth(),
    };
  }

  // Recommendations
  @Get('recommendations')
  getRecommendations() {
    return { data: this.autonomyService.getRecommendations() };
  }

  // Decision Traces & Audit
  @Get('traces')
  getDecisionTraces(@Query('limit') limit?: string) {
    return { data: this.autonomyService.getDecisionTraces(limit ? Number(limit) : 50) };
  }

  @Get('audit')
  getAuditTrail(@Query('limit') limit?: string) {
    return { data: this.autonomyService.getAuditTrail(limit ? Number(limit) : 100) };
  }
}
