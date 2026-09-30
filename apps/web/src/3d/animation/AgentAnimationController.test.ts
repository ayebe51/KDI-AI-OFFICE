// ==========================================================
// 3d/animation/AgentAnimationController.test.ts
// Unit Tests for Agent Animation State Machine & Procedural Poses
// ==========================================================

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { AgentAnimationController } from './AgentAnimationController.ts';

describe('AgentAnimationController: Animation State Machine', () => {
  test('Test 1: Maps activity states to canonical animation clips', () => {
    const controller = new AgentAnimationController('IDLE');
    assert.strictEqual(controller.mapActivityToClip('CODING'), 'TYPE');
    assert.strictEqual(controller.mapActivityToClip('TESTING'), 'TYPE');
    assert.strictEqual(controller.mapActivityToClip('THINKING'), 'THINK');
    assert.strictEqual(controller.mapActivityToClip('PLANNING'), 'THINK');
    assert.strictEqual(controller.mapActivityToClip('READING'), 'READ');
    assert.strictEqual(controller.mapActivityToClip('MEETING'), 'MEETING');
    assert.strictEqual(controller.mapActivityToClip('PRAYING'), 'PRAY');
    assert.strictEqual(controller.mapActivityToClip('COFFEE'), 'COFFEE');
    assert.strictEqual(controller.mapActivityToClip('BREAK'), 'SIT');
    assert.strictEqual(controller.mapActivityToClip('ERROR'), 'ERROR');
    assert.strictEqual(controller.mapActivityToClip('COMPLETED'), 'CELEBRATE');
  });

  test('Test 2: Smooth transitions between WALK and activity clips', () => {
    const controller = new AgentAnimationController('IDLE');
    assert.strictEqual(controller.getCurrentClip(), 'IDLE');

    // Start moving
    controller.setMoving(true, 'CODING');
    assert.strictEqual(controller.getTargetClip(), 'WALK');

    // Update with dt to complete transition
    controller.update(0.5, 1.0);
    assert.strictEqual(controller.getCurrentClip(), 'WALK');

    // Arrive at desk and start CODING
    controller.setMoving(false, 'CODING');
    assert.strictEqual(controller.getTargetClip(), 'TYPE');

    controller.update(0.5, 2.0);
    assert.strictEqual(controller.getCurrentClip(), 'TYPE');
  });

  test('Test 3: Computes procedural poses for different clips', () => {
    const controller = new AgentAnimationController('IDLE');

    // TYPE pose should have negative seated offsetY
    controller.setActivity('CODING');
    controller.update(0.5, 1.0);
    const typePose = controller.update(0.016, 1.0);
    assert.ok(typePose.offsetY < -0.15); // seated lower
    assert.ok(typePose.visorIntensity > 0.7);

    // PRAY pose includes bowing / prostration
    controller.setActivity('PRAYING');
    controller.update(0.5, 5.0); // bowing phase (t=5s)
    const bowPose = controller.update(0.016, 5.0);
    assert.ok(bowPose.headTilt > 0.3); // bowed head
  });
});
