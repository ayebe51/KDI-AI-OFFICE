// ==========================================================
// services/api/src/office/office.service.test.ts
// Unit Tests for Phase 6 Office Service & Digital Twin Business Logic
// ==========================================================

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { OfficeService } from './office.service.js';

describe('Phase 6 OfficeService: Living Office & Digital Twin Engine', () => {
  // Mock dependencies
  const mockEventsGateway: any = {
    broadcastOfficeEvent: (type: string, data: any, channel: string) => {
      mockEventsGateway.lastEvent = { type, data, channel };
      mockEventsGateway.events = mockEventsGateway.events || [];
      mockEventsGateway.events.push({ type, data, channel });
    },
    lastEvent: null,
    events: [],
  };

  const mockPostgres: any = {
    checkHealth: async () => ({ status: 'UP', latencyMs: 2 }),
  };

  const mockRedis: any = {
    checkHealth: async () => ({ status: 'UP', latencyMs: 1 }),
  };

  const mockNeo4j: any = {
    checkHealth: async () => ({ status: 'UP', latencyMs: 5 }),
  };

  const mockProjects: any = {
    getAll: () => ({
      data: [
        {
          id: 'prj_01J9X8KONEKSI',
          projectId: 'prj_01J9X8KONEKSI',
          name: 'Koneksi Santri',
          category: 'Web Application',
          description: 'Digital ecosystem for Islamic boarding schools',
          status: 'DEVELOPMENT',
          activeAgents: 3,
          currentTasks: 7,
          techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          visibility: 'PUBLIC',
        },
      ],
    }),
    getAllProjects: (isInternal?: boolean) => [
      {
        projectId: 'prj_01J9X8KONEKSI',
        name: 'Koneksi Santri',
        category: 'Web Application',
        shortDescription: 'Digital ecosystem for Islamic boarding schools',
        description: 'Digital ecosystem for Islamic boarding schools',
        status: 'DEVELOPMENT',
        activeAgents: 3,
        currentTasks: 7,
        technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        visibility: 'PUBLIC',
        featured: true,
      },
    ],
  };

  const createService = () => {
    mockEventsGateway.events = [];
    return new OfficeService(
      mockEventsGateway,
      mockPostgres,
      mockRedis,
      mockNeo4j,
      mockProjects
    );
  };

  test('Test 1: Initializes 14 canonical office rooms and default agents', () => {
    const service = createService();
    const rooms = service.getRooms();
    assert.strictEqual(rooms.length, 14);

    const roomIds = rooms.map((r) => r.roomId);
    assert.ok(roomIds.includes('RM-RECEPTION'));
    assert.ok(roomIds.includes('RM-ENGINEERING'));
    assert.ok(roomIds.includes('RM-MEETING'));
    assert.ok(roomIds.includes('RM-MUSHOLLA'));
    assert.ok(roomIds.includes('RM-SERVER'));
    assert.ok(roomIds.includes('RM-PORTFOLIO'));

    const agents = service.getAgents();
    assert.strictEqual(agents.length, 5);
    const engineer = agents.find((a) => a.agentId === 'AGT-ENG-001');
    assert.ok(engineer);
    assert.strictEqual(engineer.role, 'SOFTWARE_ENGINEER');
  });

  test('Test 2: Authoritative Snapshot returns sanitized public view vs full internal view', () => {
    const service = createService();

    // Internal view
    const internalSnapshot = service.getSnapshot(true);
    assert.ok(internalSnapshot.rooms.length >= 14);
    assert.ok(internalSnapshot.agents.length >= 5);
    assert.ok(internalSnapshot.serverNodes.length >= 10);

    // Public view (strips internal-only rooms like Server Room and Management)
    const publicSnapshot = service.getSnapshot(false);
    assert.ok(publicSnapshot.rooms.every((r) => r.visibility === 'PUBLIC'));
    assert.ok(!publicSnapshot.rooms.some((r) => r.roomId === 'RM-SERVER'));
    assert.ok(publicSnapshot.rooms.some((r) => r.roomId === 'RM-RECEPTION'));
    assert.ok(publicSnapshot.rooms.some((r) => r.roomId === 'RM-MUSHOLLA'));
    assert.ok(publicSnapshot.rooms.some((r) => r.roomId === 'RM-PORTFOLIO'));
  });

  test('Test 3: updateAgentActivity increments entityVersion and broadcasts WebSocket events', () => {
    const service = createService();
    const beforeAgent = service.getAgents().find((a) => a.agentId === 'AGT-ENG-001')!;
    const initialVersion = beforeAgent.entityVersion;

    const updated = service.updateAgentActivity(
      'AGT-ENG-001',
      'CODING',
      'Writing AST patch in PickupService.ts',
      'RM-ENGINEERING',
      undefined,
      [0, 0, 0.4],
      'tsk_test_01'
    );

    assert.strictEqual(updated.entityVersion, initialVersion + 1);
    assert.strictEqual(updated.activityState, 'CODING');
    assert.strictEqual(updated.currentTaskId, 'tsk_test_01');

    assert.ok(mockEventsGateway.events.length > 0);
    const activityEvent = mockEventsGateway.events.find(
      (e: any) => e.type === 'office.agent.activity_changed'
    );
    assert.ok(activityEvent);
    assert.strictEqual(activityEvent.data.agentId, 'AGT-ENG-001');
    assert.strictEqual(activityEvent.data.activityState, 'CODING');
    assert.strictEqual(activityEvent.data.entityVersion, initialVersion + 1);
  });

  test('Test 4: Meeting Lifecycle starts, updates participants and restores previous tasks upon conclusion', () => {
    const service = createService();

    // Set Farhan to CODING first
    service.updateAgentActivity(
      'AGT-ENG-001',
      'CODING',
      'Coding active task tsk_01',
      'RM-ENGINEERING',
      undefined,
      [0, 0, 0.4],
      'tsk_01'
    );

    // Start meeting
    const meeting = service.startMeeting({
      title: 'Quarterly Roadmap Alignment',
      projectId: 'prj_02J9X8OFFICE',
      participants: ['AGT-ENG-001', 'AGT-MGR-001'],
      agenda: 'Review sprint deliverables',
    });

    assert.strictEqual(meeting.status, 'ACTIVE');
    const agentInMeeting = service.getAgents().find((a) => a.agentId === 'AGT-ENG-001')!;
    assert.strictEqual(agentInMeeting.activityState, 'MEETING');
    assert.strictEqual(agentInMeeting.targetLocation, 'RM-MEETING');

    // End meeting
    const ended = service.endMeeting(meeting.meetingId, ['Consensus reached on Phase 6']);
    assert.strictEqual(ended.status, 'CONCLUDED');

    // Farhan should be restored to previous activity CODING and room RM-ENGINEERING
    const restoredAgent = service.getAgents().find((a) => a.agentId === 'AGT-ENG-001')!;
    assert.strictEqual(restoredAgent.activityState, 'CODING');
    assert.strictEqual(restoredAgent.targetLocation, 'RM-ENGINEERING');
  });

  test('Test 5: Prayer Lifecycle moves agents to Musholla and restores tasks upon conclusion', () => {
    const service = createService();

    // Farhan is CODING
    service.updateAgentActivity('AGT-ENG-001', 'CODING', 'Writing patch', 'RM-ENGINEERING');

    // Trigger prayer
    const session = service.triggerPrayerSession('DHUHR');
    assert.strictEqual(session.prayerName, 'DHUHR');
    assert.strictEqual(session.status, 'PRAYING');

    const agentPraying = service.getAgents().find((a) => a.agentId === 'AGT-ENG-001')!;
    assert.strictEqual(agentPraying.activityState, 'PRAYING');
    assert.strictEqual(agentPraying.targetLocation, 'RM-MUSHOLLA');

    // End prayer
    service.endPrayerSession();
    const restoredAgent = service.getAgents().find((a) => a.agentId === 'AGT-ENG-001')!;
    assert.strictEqual(restoredAgent.activityState, 'CODING');
    assert.strictEqual(restoredAgent.targetLocation, 'RM-ENGINEERING');
  });

  test('Test 6: Real Infrastructure Health syncs to 3D Server Nodes', async () => {
    const service = createService();
    await service.syncInfrastructureHealth();

    const nodes = service.getServerNodes();
    const pg = nodes.find((n) => n.serviceId === 'srv-postgres')!;
    assert.strictEqual(pg.health, 'UP');
    assert.strictEqual(pg.status, 'ONLINE');
    assert.strictEqual(pg.latency, 2);

    const neo4j = nodes.find((n) => n.serviceId === 'srv-neo4j')!;
    assert.strictEqual(neo4j.health, 'UP');
    assert.strictEqual(neo4j.status, 'ONLINE');
  });

  test('Test 7: Event Replay sequence contains deterministic ordered events with versioning', () => {
    const service = createService();
    const sequence = service.getEventReplaySequence();
    assert.strictEqual(sequence.length, 4);

    // Verify ordering and version monotonically increases
    for (let i = 0; i < sequence.length - 1; i++) {
      assert.ok(sequence[i].entityVersion < sequence[i + 1].entityVersion);
    }
    assert.strictEqual(sequence[0].activityState, 'THINKING');
    assert.strictEqual(sequence[1].activityState, 'CODING');
    assert.strictEqual(sequence[2].activityState, 'TESTING');
    assert.strictEqual(sequence[3].activityState, 'COMPLETED');
  });
});
