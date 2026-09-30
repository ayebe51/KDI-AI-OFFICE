// ==========================================================
// 3d/state/OfficeWorldStore.test.ts
// Unit Tests for OfficeWorldStore: Snapshot, Deduplication & Ordering
// ==========================================================

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { OfficeWorldStore } from './OfficeWorldStore.ts';
import type { OfficeSnapshot, AgentOfficeEvent, WSEventEnvelope } from '@kdi/types';

describe('OfficeWorldStore: Snapshot, Deduplication & Version Ordering', () => {
  const mockSnapshot: OfficeSnapshot = {
    timestamp: new Date().toISOString(),
    officeTime: new Date().toISOString(),
    rooms: [
      {
        roomId: 'RM-ENGINEERING',
        name: 'Engineering Floor',
        type: 'ENGINEERING',
        position: [0, 0, 0],
        size: [14, 3.5, 14],
        capacity: 20,
        department: 'Engineering',
        visibility: 'INTERNAL',
        interactive: true,
      },
    ],
    agents: [
      {
        agentId: 'AGT-ENG-001',
        name: 'Farhan (AI Software Engineer)',
        role: 'SOFTWARE_ENGINEER',
        department: 'Engineering',
        grade: 'GR-04',
        room: 'RM-ENGINEERING',
        currentLocation: 'RM-ENGINEERING',
        currentState: 'IDLE',
        runtimeStatus: 'IDLE',
        activityState: 'IDLE',
        currentActivity: 'Standing by at engineering desk',
        position: [0, 0, 0.4],
        rotation: [0, 0, 0],
        entityVersion: 10,
        lastUpdated: new Date().toISOString(),
        isPublicSafe: true,
      },
    ],
    projects: [],
    meetings: [],
    serverNodes: [
      {
        serviceId: 'srv-postgres',
        name: 'PostgreSQL 16 Cluster',
        status: 'ONLINE',
        health: 'UP',
        latency: 3,
        load: 14,
        lastChecked: new Date().toISOString(),
        subsystem: 'Transactional Storage',
      },
    ],
    activePrayer: null,
    systemAlert: null,
  };

  test('Test 1: Applies initial snapshot correctly', () => {
    const store = OfficeWorldStore.getInstance();
    store.applySnapshot(mockSnapshot);

    const state = store.getState();
    assert.strictEqual(state.rooms.size, 1);
    assert.strictEqual(state.agents.size, 1);
    assert.strictEqual(state.serverNodes.length, 1);

    const agent = state.agents.get('AGT-ENG-001')!;
    assert.strictEqual(agent.entityVersion, 10);
    assert.strictEqual(agent.activityState, 'IDLE');
  });

  test('Test 2: Rejects out-of-order events with lower entityVersion (Test 4)', () => {
    const store = OfficeWorldStore.getInstance();
    store.applySnapshot(mockSnapshot);

    // Current version is 10. Attempt to apply an out-of-order stale event with version 9:
    const staleEvent: AgentOfficeEvent = {
      eventId: 'evt_stale_01',
      timestamp: new Date().toISOString(),
      agentId: 'AGT-ENG-001',
      agentName: 'Farhan',
      departmentId: 'Engineering',
      runtimeState: 'IDLE',
      activityState: 'IDLE',
      currentLocation: 'RM-ENGINEERING',
      activityStartedAt: new Date().toISOString(),
      metadata: {},
      visibility: 'PUBLIC',
      entityVersion: 9, // Stale!
    };

    const appliedStale = store.applyAgentEvent(staleEvent);
    assert.strictEqual(appliedStale, false); // Must reject!

    // Verify state was NOT overwritten by stale event
    const agent = store.getState().agents.get('AGT-ENG-001')!;
    assert.strictEqual(agent.entityVersion, 10);

    // Now apply newer event with version 11:
    const freshEvent: AgentOfficeEvent = {
      ...staleEvent,
      eventId: 'evt_fresh_01',
      activityState: 'CODING',
      entityVersion: 11,
    };

    const appliedFresh = store.applyAgentEvent(freshEvent);
    assert.strictEqual(appliedFresh, true); // Must accept!
    assert.strictEqual(store.getState().agents.get('AGT-ENG-001')!.entityVersion, 11);
    assert.strictEqual(store.getState().agents.get('AGT-ENG-001')!.activityState, 'CODING');
  });

  test('Test 3: Deduplicates identical WebSocket event IDs (Test 5)', () => {
    const store = OfficeWorldStore.getInstance();

    const envelope: WSEventEnvelope<any> = {
      eventId: 'evt_dedup_unique_100',
      type: 'office.agent.activity_changed',
      timestamp: new Date().toISOString(),
      channel: 'office:events',
      data: {
        eventId: 'evt_dedup_unique_100',
        agentId: 'AGT-ENG-001',
        activityState: 'TESTING',
        runtimeState: 'RUNNING',
        currentLocation: 'RM-ENGINEERING',
        entityVersion: 15,
        timestamp: new Date().toISOString(),
      },
    };

    // First arrival should be accepted
    const firstArrival = store.applyIncomingEvent(envelope);
    assert.strictEqual(firstArrival, true);

    // Duplicate arrival with exact same eventId should be rejected!
    const duplicateArrival = store.applyIncomingEvent(envelope);
    assert.strictEqual(duplicateArrival, false);
  });

  test('Test 4: Selection and 2D mode toggling', () => {
    const store = OfficeWorldStore.getInstance();
    store.selectEntity('AGENT', 'AGT-ENG-001', { name: 'Farhan' });

    assert.strictEqual(store.getState().selectedEntity.type, 'AGENT');
    assert.strictEqual(store.getState().selectedEntity.id, 'AGT-ENG-001');

    store.set2DMode(true);
    assert.strictEqual(store.getState().is2DMode, true);

    store.clearSelection();
    assert.strictEqual(store.getState().selectedEntity.type, null);
  });
});
