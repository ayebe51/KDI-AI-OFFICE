// ==========================================================
// services/api/src/office/office.controller.ts
// REST Controller for 3D Office Digital Twin Snapshots & Controls
// ==========================================================

import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { OfficeService } from './office.service.js';
import type { OfficeMeeting, OfficePrayerSession } from '@kdi/types';

@Controller('office')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Get('snapshot')
  getSnapshot(@Query('internal') internal?: string) {
    const isInternal = internal === 'true' || internal === '1';
    return this.officeService.getSnapshot(isInternal);
  }

  @Get('rooms')
  getRooms() {
    return { total: this.officeService.getRooms().length, data: this.officeService.getRooms() };
  }

  @Get('agents')
  getAgents() {
    return { total: this.officeService.getAgents().length, data: this.officeService.getAgents() };
  }

  @Get('server-nodes')
  getServerNodes() {
    return {
      total: this.officeService.getServerNodes().length,
      data: this.officeService.getServerNodes(),
    };
  }

  @Get('meetings')
  getMeetings() {
    return {
      total: this.officeService.getMeetings().length,
      data: this.officeService.getMeetings(),
    };
  }

  @Post('meetings')
  createMeeting(
    @Body()
    dto: {
      title: string;
      projectId: string;
      participants: string[];
      agenda: string;
      whiteboardData?: OfficeMeeting['whiteboardData'];
    }
  ) {
    if (!dto.title || !dto.projectId || !dto.participants?.length) {
      throw new BadRequestException('Meeting title, projectId, and at least one participant are required');
    }
    return this.officeService.startMeeting(dto);
  }

  @Post('meetings/:id/end')
  endMeeting(@Param('id') id: string, @Body() body?: { decisions?: string[] }) {
    return this.officeService.endMeeting(id, body?.decisions || []);
  }

  @Post('prayer/trigger')
  triggerPrayer(@Body() body?: { prayerName?: OfficePrayerSession['prayerName'] }) {
    const prayer = body?.prayerName || 'DHUHR';
    return this.officeService.triggerPrayerSession(prayer);
  }

  @Post('prayer/end')
  endPrayer() {
    return this.officeService.endPrayerSession();
  }

  @Post('demo/:scenario')
  runDemoScenario(@Param('scenario') scenario: string) {
    switch (scenario) {
      case 'bugfix':
        return this.officeService.executeDemoBugFix();
      case 'meeting':
        return this.officeService.executeDemoMeeting();
      case 'prayer':
        return this.officeService.executeDemoPrayer();
      case 'server-failure':
        return this.officeService.executeDemoServerFailure();
      case 'agent-error':
        return this.officeService.executeDemoAgentError();
      default:
        throw new BadRequestException(
          `Unknown scenario: "${scenario}". Allowed: bugfix, meeting, prayer, server-failure, agent-error`
        );
    }
  }

  @Get('events/replay')
  getEventReplay() {
    return {
      total: this.officeService.getEventReplaySequence().length,
      data: this.officeService.getEventReplaySequence(),
    };
  }
}
