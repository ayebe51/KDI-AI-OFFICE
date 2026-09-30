// ==========================================================
// 3d/navigation/NavGraph.test.ts
// Unit Tests for NavGraph Deterministic Waypoint Router
// ==========================================================

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { NavGraph, NAV_WAYPOINTS } from './NavGraph.ts';

describe('NavGraph: Deterministic Waypoint Router & Pathfinding', () => {
  test('Test 1: Finds nearest waypoint to any coordinate', () => {
    // Near Reception desk
    const wpReception = NavGraph.findNearestWaypoint([0, 0, 15.8]);
    assert.strictEqual(wpReception.id, 'WP-RECEPTION-ENTRY');

    // Near Engineering Floor desk
    const wpEng = NavGraph.findNearestWaypoint([0, 0, 0.4]);
    assert.strictEqual(wpEng.id, 'WP-ENG-DESK-1');

    // Near Musholla
    const wpMusholla = NavGraph.findNearestWaypoint([12, 0, -8]);
    assert.strictEqual(wpMusholla.id, 'WP-SAJADAH-1');
  });

  test('Test 2: Calculates deterministic path from Engineering to Meeting Room', () => {
    const startPos: [number, number, number] = [0, 0, 0.4];
    const path = NavGraph.findPath(startPos, 'RM-MEETING');

    assert.ok(path.length >= 3);
    const destination = path[path.length - 1];
    assert.deepStrictEqual(destination, NAV_WAYPOINTS['WP-MEETING-TABLE'].position);
  });

  test('Test 3: Calculates deterministic path from Engineering to Musholla', () => {
    const startPos: [number, number, number] = [0, 0, 0.4];
    const path = NavGraph.findPath(startPos, 'RM-MUSHOLLA');

    assert.ok(path.length >= 4);
    const destination = path[path.length - 1];
    assert.deepStrictEqual(destination, NAV_WAYPOINTS['WP-SAJADAH-1'].position);
  });

  test('Test 4: Calculates deterministic path from Engineering to Pantry Coffee Machine', () => {
    const startPos: [number, number, number] = [0, 0, 0.4];
    const path = NavGraph.findPath(startPos, 'RM-PANTRY');

    assert.ok(path.length >= 3);
    const destination = path[path.length - 1];
    assert.deepStrictEqual(destination, NAV_WAYPOINTS['WP-COFFEE-MACHINE'].position);
  });

  test('Test 5: Calculates deterministic path from Reception to Server Room', () => {
    const startPos: [number, number, number] = [0, 0, 16];
    const path = NavGraph.findPath(startPos, 'RM-SERVER');

    assert.ok(path.length >= 5);
    const destination = path[path.length - 1];
    assert.deepStrictEqual(destination, NAV_WAYPOINTS['WP-SERVER-AISLE'].position);
  });
});
