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

  @Post(':id/chat')
  async chatWithAgent(
    @Param('id') id: string,
    @Body() body: { message: string; context?: string }
  ) {
    if (!body?.message) {
      return { reply: 'Ada yang bisa saya bantu, Pak?', agentId: id };
    }
    return await this.agentsService.chatWithAgent(id, body.message, body.context);
  }

  @Post('naya/leads')
  recordClientLead(
    @Body() body: { name: string; company?: string; phone: string; need: string; budget?: string; notes?: string }
  ) {
    if (!body?.name || !body?.phone) {
      throw new NotFoundException('Nama dan kontak WhatsApp wajib diisi');
    }
    const lead = this.agentsService.recordLead(body);
    return {
      message: 'Calon klien berhasil dicatat oleh Naya (Account Manager)',
      lead,
    };
  }

  // Alias for backward compatibility
  @Post('sinta/leads')
  recordClientLeadLegacy(
    @Body() body: { name: string; company?: string; phone: string; need: string; budget?: string; notes?: string }
  ) {
    return this.recordClientLead(body);
  }

  @Get('naya/leads')
  getClientLeads() {
    const leads = this.agentsService.getLeads();
    return {
      total: leads.length,
      data: leads,
    };
  }

  // Alias for backward compatibility
  @Get('sinta/leads')
  getClientLeadsLegacy() {
    return this.getClientLeads();
  }

  @Post('naya/quote-whatsapp')
  generateWhatsAppQuote(
    @Body() body: { clientName: string; serviceTitle: string; clientPhone?: string }
  ) {
    return this.agentsService.generateWhatsAppQuote(body.clientName, body.serviceTitle, body.clientPhone);
  }

  // Alias for backward compatibility
  @Post('sinta/quote-whatsapp')
  generateWhatsAppQuoteLegacy(
    @Body() body: { clientName: string; serviceTitle: string; clientPhone?: string }
  ) {
    return this.generateWhatsAppQuote(body);
  }
}
