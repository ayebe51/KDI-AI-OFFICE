import { Controller, Get, Post, Param, Body, NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service.js';
import type { AgentState } from '@kdi/types';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  getAgents() {
    return {
      total: this.agentsService.getAll().length,
      data: this.agentsService.getAll(),
    };
  }

  @Get(':id')
  getAgent(@Param('id') id: string) {
    const agent = this.agentsService.getById(id);
    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    return agent;
  }

  @Post('demo/toggle')
  toggleDemoEngineer() {
    const updated = this.agentsService.toggleDemoEngineerState();
    return {
      message: 'Demo engineer state successfully updated and broadcast via WebSocket',
      agent: updated,
    };
  }

  @Post(':id/state')
  updateAgentState(
    @Param('id') id: string,
    @Body() body: { state: AgentState; activity?: string }
  ) {
    try {
      const updated = this.agentsService.updateState(id, body.state, body.activity);
      return {
        message: 'Agent state updated successfully',
        agent: updated,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NotFoundException(msg);
    }
  }
}
