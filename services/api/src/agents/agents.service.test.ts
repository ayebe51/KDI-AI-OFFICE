import test from 'node:test';
import assert from 'node:assert';
import { AgentsService } from './agents.service.js';
import type { WSEventEnvelope } from '@kdi/types';

test('AgentsService: catalog initialization and state transition', async (t) => {
  const emittedEvents: WSEventEnvelope<unknown>[] = [];
  const mockEventsGateway = {
    broadcastAgentState: (payload: any) => {
      emittedEvents.push({
        eventId: 'test_evt',
        type: 'agent.status.changed',
        timestamp: new Date().toISOString(),
        channel: 'office:events',
        data: payload,
      });
    },
    broadcastEvent: (env: any) => emittedEvents.push(env),
  };

  const service = new AgentsService(mockEventsGateway as any);

  await t.test('initializes with default employees', () => {
    const all = service.getAll();
    assert.strictEqual(all.length >= 2, true);
    const engineer = service.getById('AGT-ENG-001');
    assert.ok(engineer);
    assert.strictEqual(engineer.role, 'SOFTWARE_ENGINEER');
    assert.strictEqual(engineer.currentState, 'IDLE');
  });

  await t.test('toggles demo engineer state from IDLE to WORKING', () => {
    const updated = service.toggleDemoEngineerState();
    assert.strictEqual(updated.currentState, 'WORKING');
    assert.strictEqual(emittedEvents.length, 1);
    assert.strictEqual(emittedEvents[0].type, 'agent.status.changed');
    assert.strictEqual((emittedEvents[0].data as any).currentState, 'WORKING');
  });

  await t.test('toggles demo engineer state from WORKING to IDLE', () => {
    const updated = service.toggleDemoEngineerState();
    assert.strictEqual(updated.currentState, 'IDLE');
    assert.strictEqual(emittedEvents.length, 2);
    assert.strictEqual((emittedEvents[1].data as any).currentState, 'IDLE');
  });
});
