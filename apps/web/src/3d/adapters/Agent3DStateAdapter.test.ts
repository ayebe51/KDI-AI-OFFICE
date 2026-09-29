// ==========================================================
// 3d/adapters/Agent3DStateAdapter.test.ts
// Unit Tests for Backend State to Visual State Mapping
// ==========================================================

import test from 'node:test';
import assert from 'node:assert';
import { Agent3DStateAdapter } from './Agent3DStateAdapter.ts';

test('Agent3DStateAdapter: backend to visual state mapping', async (t) => {
  await t.test('maps engineering states to WORKING visual state', () => {
    assert.strictEqual(Agent3DStateAdapter.toVisualState('CODING'), 'WORKING');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('TESTING'), 'WORKING');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('PLANNING'), 'WORKING');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('DEBUGGING'), 'WORKING');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('REVIEWING'), 'WORKING');
  });

  await t.test('maps collaboration and wellness states appropriately', () => {
    assert.strictEqual(Agent3DStateAdapter.toVisualState('MEETING'), 'MEETING');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('BREAK'), 'BREAK');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('COFFEE'), 'BREAK');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('LUNCH'), 'BREAK');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('PRAYING'), 'PRAYING');
  });

  await t.test('maps idle and gated states to IDLE visual state', () => {
    assert.strictEqual(Agent3DStateAdapter.toVisualState('IDLE'), 'IDLE');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('WAITING_APPROVAL'), 'IDLE');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('COMPLETED'), 'IDLE');
    assert.strictEqual(Agent3DStateAdapter.toVisualState('OFFLINE'), 'IDLE');
  });

  await t.test('returns full visual configuration with color and labels', () => {
    const config = Agent3DStateAdapter.toVisualConfig('CODING');
    assert.strictEqual(config.visualState, 'WORKING');
    assert.strictEqual(config.label, 'CODING');
    assert.strictEqual(typeof config.color, 'string');
    assert.ok(config.color.startsWith('#'));
    assert.strictEqual(config.emissiveIntensity > 0.5, true);
  });
});
