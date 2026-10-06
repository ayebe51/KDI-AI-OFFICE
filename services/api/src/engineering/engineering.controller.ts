// ==========================================================
// services/api/src/engineering/engineering.controller.ts
// REST Controller for MetaGPT Planning, Antigravity Execution & Governance
// ==========================================================

import { Controller, Get, Post, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { EngineeringService } from './engineering.service.js';
import { EngineeringSkillsCatalog } from './skills/engineering-skills.catalog.js';
import { EngineeringAgentCatalog } from './agents/engineering-agent.definitions.js';
import type { EngineeringTask } from '@kdi/types';

@Controller('engineering')
export class EngineeringController {
  constructor(private readonly engineeringService: EngineeringService) {}

  @Get('health')
  async getHealth() {
    const health = await this.engineeringService.getHealth();
    return { status: 'OK', health };
  }

  @Post('plan')
  async createPlan(@Body() body: { goal: string; projectId?: string; repository?: string }) {
    if (!body.goal) {
      throw new BadRequestException('Goal description is required');
    }
    const plan = await this.engineeringService.createPlan(body);
    return { status: 'SUCCESS', plan };
  }

  @Post('execute')
  async executeTask(@Body() body: { task: EngineeringTask; contextOverride?: Record<string, unknown> }) {
    if (!body.task || !body.task.taskId) {
      throw new BadRequestException('Valid task definition with taskId is required');
    }
    const result = await this.engineeringService.executeTask(body.task, body.contextOverride as any);
    return { status: 'SUCCESS', result };
  }

  @Get('skills')
  listSkills() {
    return {
      status: 'SUCCESS',
      skills: EngineeringSkillsCatalog.listSkills(),
    };
  }

  @Get('skills/:id')
  getSkill(@Param('id') id: string) {
    const skill = EngineeringSkillsCatalog.getSkill(id);
    if (!skill) throw new NotFoundException(`Skill ${id} not found`);
    return { status: 'SUCCESS', skill };
  }

  @Get('agents')
  listAgents() {
    return {
      status: 'SUCCESS',
      agents: EngineeringAgentCatalog.listAgents().map((a) => ({
        agentId: a.agentId,
        name: a.name,
        role: a.role,
        description: a.description,
        qualityGates: a.qualityGates,
        allowedTools: a.allowedTools,
        allowedCommands: a.allowedCommands,
      })),
    };
  }

  @Get('approvals')
  listApprovals() {
    return {
      status: 'SUCCESS',
      pendingApprovals: this.engineeringService.listPendingApprovals(),
    };
  }

  @Post('approvals/:id/resolve')
  resolveApproval(
    @Param('id') id: string,
    @Body() body: { approved: boolean; resolvedBy?: string }
  ) {
    const operator = body.resolvedBy || 'Human Operator';
    const resolved = this.engineeringService.resolveApproval(id, body.approved, operator);
    if (!resolved) {
      throw new NotFoundException(`Approval request ${id} not found or already resolved`);
    }
    return { status: 'SUCCESS', approval: resolved };
  }

  // ==========================================================
  // PHASE 16: ENGINEERING OPERATING SYSTEM ENDPOINTS
  // ==========================================================

  @Post('work-requests')
  async createWorkRequest(
    @Body() body: { text: string; requester?: string; execute?: boolean }
  ) {
    if (!body.text) {
      throw new BadRequestException('Request text is required');
    }
    const requester = body.requester || 'Human Operator';
    if (body.execute) {
      const result = await this.engineeringService.osService.processInboundRequest(
        body.text,
        requester,
        this.engineeringService.executorService
      );
      return { status: 'SUCCESS', ...result };
    }
    const workRequest = await this.engineeringService.osService.workRequests.createWorkRequest(
      body.text,
      requester
    );
    return { status: 'SUCCESS', workRequest };
  }

  @Get('work-requests')
  listWorkRequests() {
    return {
      status: 'SUCCESS',
      workRequests: this.engineeringService.osService.workRequests.listWorkRequests(),
    };
  }

  @Get('work-requests/:id')
  getWorkRequest(@Param('id') id: string) {
    const req = this.engineeringService.osService.workRequests.getWorkRequest(id);
    if (!req) throw new NotFoundException(`WorkRequest ${id} not found`);
    return { status: 'SUCCESS', workRequest: req };
  }

  @Get('attention')
  getAttention() {
    const pendingCount = this.engineeringService.listPendingApprovals().length;
    const attention = this.engineeringService.osService.getAttentionSummary(pendingCount);
    return { status: 'SUCCESS', attention };
  }

  @Get('analytics')
  getAnalytics() {
    return {
      status: 'SUCCESS',
      analytics: this.engineeringService.osService.getAnalytics(),
    };
  }

  @Get('projects')
  listProjects() {
    return {
      status: 'SUCCESS',
      projects: this.engineeringService.osService.projectKnowledge.listProjects(),
    };
  }
}

