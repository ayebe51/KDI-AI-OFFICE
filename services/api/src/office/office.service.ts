// ==========================================================
// services/api/src/office/office.service.ts
// Authoritative Business Logic Service for 3D Digital Twin & Living Office
// ==========================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventsGateway } from '../websocket/events.gateway.js';
import { PostgresService } from '../database/postgres.service.js';
import { RedisService } from '../database/redis.service.js';
import { Neo4jService } from '../database/neo4j.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import {
  CANONICAL_OFFICE_ROOMS,
  INITIAL_OFFICE_AGENTS,
  INITIAL_SERVER_NODES,
} from './office.constants.js';
import type {
  OfficeRoom,
  OfficeAgentDetail,
  ServerNode,
  OfficeMeeting,
  OfficePrayerSession,
  OfficeSnapshot,
  OfficeProjectItem,
  OfficeActivityState,
  AgentOfficeEvent,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

@Injectable()
export class OfficeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('OfficeService');

  private rooms: Map<string, OfficeRoom> = new Map();
  private agents: Map<string, OfficeAgentDetail> = new Map();
  private serverNodes: Map<string, ServerNode> = new Map();
  private meetings: Map<string, OfficeMeeting> = new Map();
  private activePrayer: OfficePrayerSession | null = null;
  private systemAlert: string | null = null;

  // Interruption context storage for restoring previous tasks after meeting or prayer
  private savedContexts: Map<
    string,
    {
      room: string;
      position: [number, number, number];
      activityState: OfficeActivityState;
      currentTaskId?: string;
      currentProjectId?: string;
      currentActivity: string;
    }
  > = new Map();

  private healthPollTimer?: NodeJS.Timeout;

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly postgresService: PostgresService,
    private readonly redisService: RedisService,
    private readonly neo4jService: Neo4jService,
    private readonly projectsService: ProjectsService
  ) {
    this.initWorldState();
  }

  onModuleInit() {
    this.logger.info('onModuleInit', 'Initializing 3D Office World authoritative engine');
    // Poll actual infrastructure health every 10 seconds to update 3D Server Room LEDs
    this.healthPollTimer = setInterval(async () => {
      try {
        await this.syncInfrastructureHealth();
      } catch (err: any) {
        this.logger.debug('onModuleInit', `Health sync tick error: ${err.message}`);
      }
    }, 10_000);
  }

  onModuleDestroy() {
    if (this.healthPollTimer) clearInterval(this.healthPollTimer);
    this.logger.info('onModuleDestroy', 'Office engine stopped cleanly');
  }

  private initWorldState() {
    // 1. Rooms
    for (const room of CANONICAL_OFFICE_ROOMS) {
      this.rooms.set(room.roomId, { ...room });
    }

    // 2. Agents
    for (const agent of INITIAL_OFFICE_AGENTS) {
      this.agents.set(agent.agentId, { ...agent });
    }

    // 3. Server Nodes
    for (const node of INITIAL_SERVER_NODES) {
      this.serverNodes.set(node.serviceId, { ...node });
    }
  }

  /**
   * Sync real database and backend infrastructure health with 3D server nodes
   */
  public async syncInfrastructureHealth() {
    const [pg, redis, neo4j] = await Promise.all([
      this.postgresService.checkHealth().catch(() => ({ status: 'DOWN', latencyMs: 999 })),
      this.redisService.checkHealth().catch(() => ({ status: 'DOWN', latencyMs: 999 })),
      this.neo4jService.checkHealth().catch(() => ({ status: 'DOWN', latencyMs: 999 })),
    ]);

    this.updateServerNode('srv-postgres', pg.status as any, pg.latencyMs);
    this.updateServerNode('srv-redis', redis.status as any, redis.latencyMs);
    this.updateServerNode('srv-neo4j', neo4j.status as any, neo4j.latencyMs);
  }

  private updateServerNode(
    serviceId: string,
    health: 'UP' | 'DOWN' | 'DEGRADED',
    latency: number
  ) {
    const node = this.serverNodes.get(serviceId);
    if (!node) return;

    node.health = health;
    node.status = health === 'UP' ? 'ONLINE' : health === 'DEGRADED' ? 'DEGRADED' : 'ERROR';
    node.latency = latency;
    node.lastChecked = new Date().toISOString();

    // Broadcast server updated event
    this.eventsGateway.broadcastOfficeEvent(
      'office.server.updated',
      {
        serviceId: node.serviceId,
        name: node.name,
        status: node.status,
        health: node.health,
        latency: node.latency,
        lastChecked: node.lastChecked,
      },
      'office:public'
    );
  }

  /**
   * Produces authoritative office snapshot (sanitized according to visibility)
   */
  public getSnapshot(isInternal = true): OfficeSnapshot {
    const rawProjects = this.projectsService.getAllProjects(isInternal);
    const projects: OfficeProjectItem[] = rawProjects
      .filter((p) => isInternal || p.visibility === 'PUBLIC')
      .map((p) => ({
        id: p.projectId,
        name: p.name,
        category: p.category,
        description: p.shortDescription || p.description,
        status: p.status,
        activeAgents: p.team?.length || 2,
        currentTasks: p.activeTaskCount ?? 0,
        techStack: p.technologies || [],
        visibility: p.visibility === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL',
        featured: Boolean(p.featured),
        year: p.year || '2026',
      }));

    const rawRooms = Array.from(this.rooms.values());
    const filteredRooms = isInternal
      ? rawRooms
      : rawRooms.filter((r) => r.visibility === 'PUBLIC');

    const rawAgents = Array.from(this.agents.values());
    const sanitizedAgents: OfficeAgentDetail[] = rawAgents.map((a) => {
      if (isInternal) {
        return { ...a };
      }
      // Public mode masks private cost, exact internal tokens and internal task IDs
      return {
        agentId: a.agentId,
        name: a.name,
        role: a.role,
        department: a.department,
        grade: a.grade,
        room: a.room,
        currentLocation: a.currentLocation,
        targetLocation: a.targetLocation,
        currentState: a.currentState,
        runtimeStatus: a.runtimeStatus,
        activityState: a.activityState,
        currentActivity: a.currentActivity,
        position: a.position,
        rotation: a.rotation,
        entityVersion: a.entityVersion,
        lastUpdated: a.lastUpdated,
        isPublicSafe: true,
      };
    });

    const rawMeetings = Array.from(this.meetings.values());
    const filteredMeetings = isInternal
      ? rawMeetings
      : rawMeetings.filter((m) => m.visibility === 'PUBLIC');

    return {
      timestamp: new Date().toISOString(),
      officeTime: new Date().toISOString(),
      rooms: filteredRooms,
      agents: sanitizedAgents,
      projects,
      meetings: filteredMeetings,
      serverNodes: Array.from(this.serverNodes.values()),
      activePrayer: this.activePrayer,
      systemAlert: this.systemAlert,
    };
  }

  public getRooms(): OfficeRoom[] {
    return Array.from(this.rooms.values());
  }

  public getAgents(): OfficeAgentDetail[] {
    return Array.from(this.agents.values());
  }

  public getServerNodes(): ServerNode[] {
    return Array.from(this.serverNodes.values());
  }

  public getMeetings(): OfficeMeeting[] {
    return Array.from(this.meetings.values());
  }

  /**
   * Update an agent's location and activity with strict versioning and event emission
   */
  public updateAgentActivity(
    agentId: string,
    activityState: OfficeActivityState,
    activitySummary: string,
    currentLocation?: string,
    targetLocation?: string,
    position?: [number, number, number],
    taskId?: string,
    projectId?: string
  ): OfficeAgentDetail {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const previousActivity = agent.activityState;
    agent.activityState = activityState;
    agent.currentActivity = activitySummary;
    if (currentLocation) agent.currentLocation = currentLocation;
    agent.targetLocation = targetLocation;
    if (position) agent.position = position;
    if (taskId !== undefined) agent.currentTaskId = taskId;
    if (projectId !== undefined) agent.currentProjectId = projectId;
    agent.entityVersion += 1;
    agent.lastUpdated = new Date().toISOString();

    const officeEvent: AgentOfficeEvent = {
      eventId: `evt_${Date.now()}_${agentId}`,
      timestamp: agent.lastUpdated,
      agentId: agent.agentId,
      agentName: agent.name,
      departmentId: agent.department,
      projectId: agent.currentProjectId,
      taskId: agent.currentTaskId,
      runtimeState: agent.runtimeStatus,
      activityState: agent.activityState,
      previousActivity,
      currentLocation: agent.currentLocation,
      targetLocation: agent.targetLocation,
      activityStartedAt: agent.lastUpdated,
      metadata: {
        position: agent.position,
        activitySummary: agent.currentActivity,
      },
      visibility: agent.isPublicSafe ? 'PUBLIC' : 'INTERNAL',
      entityVersion: agent.entityVersion,
    };

    // Broadcast WebSocket event
    this.eventsGateway.broadcastOfficeEvent(
      'office.agent.activity_changed',
      officeEvent,
      'office:events'
    );

    if (targetLocation || currentLocation) {
      this.eventsGateway.broadcastOfficeEvent(
        'office.agent.location_changed',
        officeEvent,
        'office:events'
      );
    }

    return agent;
  }

  /**
   * Meeting Lifecycle Management
   */
  public startMeeting(dto: {
    title: string;
    projectId: string;
    participants: string[];
    agenda: string;
    whiteboardData?: OfficeMeeting['whiteboardData'];
  }): OfficeMeeting {
    const meetingId = `mtg_${Date.now()}`;
    const meeting: OfficeMeeting = {
      meetingId,
      title: dto.title,
      projectId: dto.projectId,
      taskIds: [],
      participants: dto.participants,
      agenda: dto.agenda,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      decisions: [],
      whiteboardData: dto.whiteboardData || {
        diagramType: 'ARCHITECTURE',
        title: dto.title,
        sections: [
          { heading: 'Agenda', points: [dto.agenda] },
          { heading: 'Key Topics', points: ['GraphRAG schema synchronization', 'Zero-trust authorization'] },
        ],
      },
      visibility: 'INTERNAL',
    };

    this.meetings.set(meetingId, meeting);

    // Save previous contexts for all participating agents and navigate them to Meeting Room
    for (const agentId of dto.participants) {
      const agent = this.agents.get(agentId);
      if (agent) {
        this.savedContexts.set(agentId, {
          room: agent.currentLocation,
          position: agent.position,
          activityState: agent.activityState,
          currentTaskId: agent.currentTaskId,
          currentProjectId: agent.currentProjectId,
          currentActivity: agent.currentActivity,
        });

        this.updateAgentActivity(
          agentId,
          'MEETING',
          `In conference: ${dto.title}`,
          agent.currentLocation,
          'RM-MEETING',
          [12, 0, 0]
        );
      }
    }

    this.eventsGateway.broadcastOfficeEvent('office.meeting.started', meeting, 'office:events');
    return meeting;
  }

  public endMeeting(meetingId: string, decisions: string[] = []): OfficeMeeting {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    meeting.status = 'CONCLUDED';
    meeting.endedAt = new Date().toISOString();
    meeting.decisions = decisions;

    // Restore participants to previous tasks and desks
    for (const agentId of meeting.participants) {
      const saved = this.savedContexts.get(agentId);
      if (saved) {
        this.updateAgentActivity(
          agentId,
          saved.activityState,
          saved.currentActivity,
          'RM-MEETING',
          saved.room,
          saved.position,
          saved.currentTaskId,
          saved.currentProjectId
        );
        this.savedContexts.delete(agentId);
      } else {
        this.updateAgentActivity(
          agentId,
          'IDLE',
          'Returned from meeting, standing by',
          'RM-MEETING',
          'RM-ENGINEERING',
          [0, 0, 0.4]
        );
      }
    }

    this.eventsGateway.broadcastOfficeEvent('office.meeting.ended', meeting, 'office:events');
    return meeting;
  }

  /**
   * Prayer Lifecycle Management
   */
  public triggerPrayerSession(prayerName: OfficePrayerSession['prayerName']): OfficePrayerSession {
    const session: OfficePrayerSession = {
      prayerName,
      status: 'PRAYING',
      scheduledAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      participants: ['AGT-ENG-001', 'AGT-MGR-001', 'AGT-ARCH-001'],
    };

    this.activePrayer = session;

    // Save active agents context and move them to Musholla
    for (const agentId of session.participants) {
      const agent = this.agents.get(agentId);
      if (agent) {
        this.savedContexts.set(agentId, {
          room: agent.currentLocation,
          position: agent.position,
          activityState: agent.activityState,
          currentTaskId: agent.currentTaskId,
          currentProjectId: agent.currentProjectId,
          currentActivity: agent.currentActivity,
        });

        this.updateAgentActivity(
          agentId,
          'PRAYING',
          `Performing ${prayerName} prayer in Musholla (Tasks preserved)`,
          agent.currentLocation,
          'RM-MUSHOLLA',
          [12, 0, -8]
        );
      }
    }

    this.eventsGateway.broadcastOfficeEvent('office.prayer.started', session, 'office:public');
    return session;
  }

  public endPrayerSession(): OfficePrayerSession {
    if (!this.activePrayer) {
      throw new Error('No active prayer session to conclude');
    }

    const session = { ...this.activePrayer, status: 'CONCLUDED' as const, endedAt: new Date().toISOString() };
    this.activePrayer = null;

    // Restore participants to previous working tasks
    for (const agentId of session.participants) {
      const saved = this.savedContexts.get(agentId);
      if (saved) {
        this.updateAgentActivity(
          agentId,
          saved.activityState,
          saved.currentActivity,
          'RM-MUSHOLLA',
          saved.room,
          saved.position,
          saved.currentTaskId,
          saved.currentProjectId
        );
        this.savedContexts.delete(agentId);
      }
    }

    this.eventsGateway.broadcastOfficeEvent('office.prayer.ended', session, 'office:public');
    return session;
  }

  /**
   * Demo Scenarios 1 to 5
   */
  public executeDemoBugFix() {
    const engineer = this.agents.get('AGT-ENG-001');
    if (!engineer) throw new Error('Engineer not found');

    // 1. Assign bug fix
    this.updateAgentActivity(
      'AGT-ENG-001',
      'THINKING',
      'Analyzing bug report: AST syntax error in PickupService.ts:L48',
      engineer.currentLocation,
      'RM-ENGINEERING',
      [0, 0, 0.4],
      'tsk_bug_402',
      'prj_02J9X8OFFICE'
    );

    // Schedule progressive transition: CODING -> TESTING -> COMPLETED
    setTimeout(() => {
      this.updateAgentActivity(
        'AGT-ENG-001',
        'CODING',
        'Applying surgical Tree-sitter AST patch in PickupService.ts',
        'RM-ENGINEERING',
        undefined,
        [0, 0, 0.4],
        'tsk_bug_402',
        'prj_02J9X8OFFICE'
      );
    }, 2000);

    setTimeout(() => {
      this.updateAgentActivity(
        'AGT-ENG-001',
        'TESTING',
        'Executing unit test suite: 12 tests passed, 0 failed',
        'RM-ENGINEERING',
        undefined,
        [0, 0, 0.4],
        'tsk_bug_402',
        'prj_02J9X8OFFICE'
      );
    }, 4500);

    setTimeout(() => {
      this.updateAgentActivity(
        'AGT-ENG-001',
        'COMPLETED',
        'Bug fix completed & verified successfully. Standing by.',
        'RM-ENGINEERING',
        undefined,
        [0, 0, 0.4]
      );
    }, 7000);

    return { status: 'Bug fix scenario initiated', agentId: 'AGT-ENG-001', taskId: 'tsk_bug_402' };
  }

  public executeDemoMeeting() {
    const meeting = this.startMeeting({
      title: 'Graph Memory & ADR-021 Alignment',
      projectId: 'prj_02J9X8OFFICE',
      participants: ['AGT-ENG-001', 'AGT-ARCH-001'],
      agenda: 'Review hybrid retrieval weights and bounded token budget for GraphRAG',
      whiteboardData: {
        diagramType: 'ARCHITECTURE',
        title: 'Graph Memory & Digital Twin Topology',
        sections: [
          { heading: 'Graph Memory', points: ['Neo4j vector index active', '3-hop bounded expansion'] },
          { heading: 'Decisions', points: ['ADR-021 Accepted: PlayCanvas React Runtime'] },
        ],
      },
    });

    // Auto end meeting after 6 seconds for demo lifecycle
    setTimeout(() => {
      this.endMeeting(meeting.meetingId, ['ADR-021 PlayCanvas React runtime adopted with unanimous consensus']);
    }, 6000);

    return { status: 'Meeting scenario initiated', meetingId: meeting.meetingId };
  }

  public executeDemoPrayer() {
    const session = this.triggerPrayerSession('ASR');
    setTimeout(() => {
      if (this.activePrayer) {
        this.endPrayerSession();
      }
    }, 6000);
    return { status: 'Prayer scenario initiated', prayer: session };
  }

  public executeDemoServerFailure() {
    const neo4j = this.serverNodes.get('srv-neo4j');
    if (!neo4j) throw new Error('Neo4j node not found');

    neo4j.status = 'DEGRADED';
    neo4j.health = 'DEGRADED';
    neo4j.latency = 950;
    this.systemAlert = 'Neo4j Graph Engine latency degradation detected (950ms)';

    this.eventsGateway.broadcastOfficeEvent('office.server.updated', neo4j, 'office:public');
    this.eventsGateway.broadcastOfficeEvent(
      'office.system.alert',
      { level: 'WARNING', message: this.systemAlert, serviceId: 'srv-neo4j' },
      'office:public'
    );

    // Recover after 7 seconds
    setTimeout(() => {
      neo4j.status = 'ONLINE';
      neo4j.health = 'UP';
      neo4j.latency = 6;
      this.systemAlert = null;
      this.eventsGateway.broadcastOfficeEvent('office.server.updated', neo4j, 'office:public');
      this.eventsGateway.broadcastOfficeEvent(
        'office.system.alert',
        { level: 'INFO', message: 'Neo4j Graph Engine restored to normal parameters' },
        'office:public'
      );
    }, 7000);

    return { status: 'Server failure simulation initiated', serviceId: 'srv-neo4j' };
  }

  public executeDemoAgentError() {
    this.updateAgentActivity(
      'AGT-ENG-001',
      'ERROR',
      'AST compilation error in patch verification (Security policy violated)',
      'RM-ENGINEERING',
      undefined,
      [0, 0, 0.4]
    );

    this.eventsGateway.broadcastOfficeEvent(
      'office.system.alert',
      { level: 'ERROR', message: 'Agent AGT-ENG-001 encountered execution failure in worktree sandbox' },
      'office:events'
    );

    return { status: 'Agent error simulation initiated', agentId: 'AGT-ENG-001' };
  }

  /**
   * Deterministic Event Replay log for visual regression and test verification
   */
  public getEventReplaySequence(): AgentOfficeEvent[] {
    const baseTime = Date.now();
    return [
      {
        eventId: 'replay-01',
        timestamp: new Date(baseTime).toISOString(),
        agentId: 'AGT-ENG-001',
        agentName: 'Farhan (AI Software Engineer)',
        departmentId: 'Engineering',
        projectId: 'prj_02J9X8OFFICE',
        taskId: 'tsk_replay_101',
        runtimeState: 'RUNNING',
        activityState: 'THINKING',
        previousActivity: 'IDLE',
        currentLocation: 'RM-RECEPTION',
        targetLocation: 'RM-ENGINEERING',
        activityStartedAt: new Date(baseTime).toISOString(),
        metadata: { position: [0, 0, 16], destination: [0, 0, 0.4] },
        visibility: 'PUBLIC',
        entityVersion: 10,
      },
      {
        eventId: 'replay-02',
        timestamp: new Date(baseTime + 1000).toISOString(),
        agentId: 'AGT-ENG-001',
        agentName: 'Farhan (AI Software Engineer)',
        departmentId: 'Engineering',
        projectId: 'prj_02J9X8OFFICE',
        taskId: 'tsk_replay_101',
        runtimeState: 'RUNNING',
        activityState: 'CODING',
        previousActivity: 'THINKING',
        currentLocation: 'RM-ENGINEERING',
        targetLocation: undefined,
        activityStartedAt: new Date(baseTime + 1000).toISOString(),
        metadata: { position: [0, 0, 0.4] },
        visibility: 'PUBLIC',
        entityVersion: 11,
      },
      {
        eventId: 'replay-03',
        timestamp: new Date(baseTime + 2000).toISOString(),
        agentId: 'AGT-ENG-001',
        agentName: 'Farhan (AI Software Engineer)',
        departmentId: 'Engineering',
        projectId: 'prj_02J9X8OFFICE',
        taskId: 'tsk_replay_101',
        runtimeState: 'RUNNING',
        activityState: 'TESTING',
        previousActivity: 'CODING',
        currentLocation: 'RM-ENGINEERING',
        targetLocation: undefined,
        activityStartedAt: new Date(baseTime + 2000).toISOString(),
        metadata: { position: [0, 0, 0.4] },
        visibility: 'PUBLIC',
        entityVersion: 12,
      },
      {
        eventId: 'replay-04',
        timestamp: new Date(baseTime + 3000).toISOString(),
        agentId: 'AGT-ENG-001',
        agentName: 'Farhan (AI Software Engineer)',
        departmentId: 'Engineering',
        projectId: 'prj_02J9X8OFFICE',
        taskId: 'tsk_replay_101',
        runtimeState: 'AVAILABLE',
        activityState: 'COMPLETED',
        previousActivity: 'TESTING',
        currentLocation: 'RM-ENGINEERING',
        targetLocation: undefined,
        activityStartedAt: new Date(baseTime + 3000).toISOString(),
        metadata: { position: [0, 0, 0.4] },
        visibility: 'PUBLIC',
        entityVersion: 13,
      },
    ];
  }
}
