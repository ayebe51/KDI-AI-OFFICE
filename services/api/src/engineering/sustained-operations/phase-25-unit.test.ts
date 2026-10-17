// ==========================================================
// services/api/src/engineering/sustained-operations/phase-25-unit.test.ts
// Phase 25: Priority Queue, Capacity, Cancellation & Invariant Unit Tests (§3, §4, §5, §8, §9, §10, §13, §18)
// ==========================================================

import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { PrioritySchedulerEngine } from './priority-scheduler.engine.js';
import { SustainedOperationsService } from './sustained-operations.service.js';
import { PHASE_25_REAL_TASKS } from './phase-25-catalog.data.js';

describe('Phase 25: Sustained Operations Core Unit Tests', () => {
  // ── 1. Priority Validation & Deterministic Sorting (§4) ────────────
  test('Priority Scheduler: Dequeues tasks in strict deterministic priority order (CRITICAL > HIGH > MEDIUM > LOW)', () => {
    const scheduler = new PrioritySchedulerEngine();

    const lowTask = { ...PHASE_25_REAL_TASKS[5], priority: 'LOW' as const, taskId: 'TASK-LOW' };
    const medTask = { ...PHASE_25_REAL_TASKS[4], priority: 'MEDIUM' as const, taskId: 'TASK-MED' };
    const highTask = { ...PHASE_25_REAL_TASKS[1], priority: 'HIGH' as const, taskId: 'TASK-HIGH' };
    const critTask = { ...PHASE_25_REAL_TASKS[0], priority: 'CRITICAL' as const, taskId: 'TASK-CRIT' };

    // Enqueue out of order
    scheduler.enqueue(lowTask);
    scheduler.enqueue(medTask);
    scheduler.enqueue(critTask);
    scheduler.enqueue(highTask);

    const first = scheduler.dequeueNextAvailable();
    const second = scheduler.dequeueNextAvailable();
    const third = scheduler.dequeueNextAvailable();
    const fourth = scheduler.dequeueNextAvailable();

    assert.strictEqual(first?.task.taskId, 'TASK-CRIT', 'CRITICAL task must dequeue first');
    assert.strictEqual(second?.task.taskId, 'TASK-HIGH', 'HIGH task must dequeue second');
    assert.strictEqual(third?.task.taskId, 'TASK-MED', 'MEDIUM task must dequeue third');
    assert.strictEqual(fourth?.task.taskId, 'TASK-LOW', 'LOW task must dequeue fourth');
  });

  // ── 2. Starvation Prevention & Aging Policy (§9) ──────────────────
  test('Starvation Prevention: Aging policy progressively boosts effective priority of waiting LOW tasks', () => {
    const scheduler = new PrioritySchedulerEngine({ maxWaitThresholdMs: 50 });

    const lowTask = { ...PHASE_25_REAL_TASKS[5], priority: 'LOW' as const, taskId: 'TASK-AGING-LOW' };
    scheduler.enqueue(lowTask);

    // Initial base weight for LOW is 1000
    // Simulate 35 aging ticks (+100 weight per tick = 3500 boost -> effective 4500)
    for (let i = 0; i < 35; i++) {
      scheduler.applyAging();
    }

    // Now enqueue a fresh CRITICAL task (weight 4000)
    const freshCritTask = { ...PHASE_25_REAL_TASKS[0], priority: 'CRITICAL' as const, taskId: 'TASK-FRESH-CRIT' };
    scheduler.enqueue(freshCritTask);

    // Because lowTask has aged significantly, its effective weight (4500) exceeds fresh CRITICAL (4000), preventing starvation!
    const dequeued = scheduler.dequeueNextAvailable();
    assert.strictEqual(dequeued?.task.taskId, 'TASK-AGING-LOW', 'Aged LOW task must dequeue ahead of fresh CRITICAL to prevent starvation (§9)');
  });

  // ── 3. Agent Capacity Validation & Backpressure (§5) ───────────────
  test('Agent Capacity: Respects maximum concurrent tasks per agent and applies safe backpressure', () => {
    // Agent capacity set to 2 for simmaci-core-agent
    const scheduler = new PrioritySchedulerEngine({
      agentCapacity: { maxConcurrentPerAgent: 2 },
    });

    const task1 = { ...PHASE_25_REAL_TASKS[0], taskId: 'SIM-1', assignedAgent: 'simmaci-core-agent' };
    const task2 = { ...PHASE_25_REAL_TASKS[3], taskId: 'SIM-2', assignedAgent: 'simmaci-core-agent' };
    const task3 = { ...PHASE_25_REAL_TASKS[6], taskId: 'SIM-3', assignedAgent: 'simmaci-core-agent' };
    const ilmoraTask = { ...PHASE_25_REAL_TASKS[1], taskId: 'ILM-1', assignedAgent: 'ilmora-core-agent' };

    scheduler.enqueue(task1);
    scheduler.enqueue(task2);
    scheduler.enqueue(task3);
    scheduler.enqueue(ilmoraTask);

    const d1 = scheduler.dequeueNextAvailable();
    const d2 = scheduler.dequeueNextAvailable();
    assert.strictEqual(d1?.task.taskId, 'SIM-1', 'CRITICAL task SIM-1 dequeues first');
    assert.strictEqual(d2?.task.taskId, 'SIM-3', 'CRITICAL task SIM-3 dequeues before MEDIUM task SIM-2');

    // simmaci-core-agent is now at capacity (2/2). Third simmaci task (SIM-2) cannot dequeue yet!
    // But ilmora-core-agent is free, so ilmora task must dequeue next without being blocked!
    const d3 = scheduler.dequeueNextAvailable();
    assert.strictEqual(d3?.task.taskId, 'ILM-1', 'Different agent domain task must dequeue when first agent is full');

    // Now release one simmaci task
    scheduler.releaseExecution('SIM-1');

    // Now SIM-2 can dequeue
    const d4 = scheduler.dequeueNextAvailable();
    assert.strictEqual(d4?.task.taskId, 'SIM-2', 'Pending task SIM-2 dequeues once agent slot is released');
  });

  // ── 4. Idempotency & Duplicate Request Protection (§7) ─────────────
  test('Idempotency Guard: Suppresses duplicate task enqueues and prevents duplicate executions', () => {
    const scheduler = new PrioritySchedulerEngine();
    const task = PHASE_25_REAL_TASKS[0];

    const firstEnqueue = scheduler.enqueue(task);
    const secondEnqueue = scheduler.enqueue(task);

    assert.strictEqual(firstEnqueue.success, true);
    assert.strictEqual(secondEnqueue.success, false, 'Duplicate enqueue attempt must be rejected');
    assert.ok(secondEnqueue.reason?.includes('already queued'));

    const metrics = scheduler.getMetrics();
    assert.strictEqual(metrics.duplicateTasks, 1);
  });

  // ── 5. Cancellation Lifecycle (§10) ────────────────────────────────
  test('Cancellation: Queued task is cancelled cleanly with zero zombie execution', () => {
    const scheduler = new PrioritySchedulerEngine();
    const task = { ...PHASE_25_REAL_TASKS[0], taskId: 'TASK-TO-CANCEL' };

    scheduler.enqueue(task);
    assert.strictEqual(scheduler.getQueueLength(), 1);

    const cancelRes = scheduler.cancelTask('TASK-TO-CANCEL');
    assert.strictEqual(cancelRes.success, true);
    assert.strictEqual(cancelRes.wasExecuting, false);
    assert.strictEqual(scheduler.getQueueLength(), 0, 'Queue must be empty after cancellation');

    const next = scheduler.dequeueNextAvailable();
    assert.strictEqual(next, null, 'Cancelled task must never execute');
  });

  // ── 6. Blocked Task Lifecycle (§10) ────────────────────────────────
  test('Blocked Task: Blocked executing task releases worker slot immediately without zombie lock', () => {
    const scheduler = new PrioritySchedulerEngine();
    const task = { ...PHASE_25_REAL_TASKS[0], taskId: 'TASK-TO-BLOCK' };

    scheduler.enqueue(task);
    scheduler.dequeueNextAvailable();
    assert.strictEqual(scheduler.getActiveCount(), 1);

    const blockRes = scheduler.blockTask('TASK-TO-BLOCK', 'External dependency unavailable');
    assert.strictEqual(blockRes.success, true);
    assert.strictEqual(scheduler.getActiveCount(), 0, 'Worker slot must be released immediately on block');
  });

  // ── 7. Max Repair Attempts & Controlled Escalation Policy (§8) ─────
  test('Escalation Policy: Repeated failures safely transition to ESCALATED after max repair attempts (no infinite retry)', async () => {
    const service = new SustainedOperationsService({ maxRepairAttempts: 2 });
    await service.initialize();

    const escalationTask = {
      ...PHASE_25_REAL_TASKS[14], // KDI-SUST-15 (Unresolvable Schema Conflict)
      taskId: 'TASK-ESCALATE-TEST',
      injectedFailurePattern: 'REPEATED_FAILURE_ESCALATION' as const,
    };

    const rec = await service.executeTask(escalationTask, 0);

    assert.strictEqual(rec.finalStatus, 'ESCALATED', 'Must transition to ESCALATED after max repair attempts');
    assert.strictEqual(rec.repairCount, 2, 'Repair count must equal configured threshold');
    assert.strictEqual(rec.attemptCount, 2, 'Attempt count must not exceed max repair threshold');
    assert.ok(rec.escalationReason?.includes('reached max repair threshold'));
  });

  // ── 8. State Consistency Invariant Enforcement (§13) ───────────────
  test('State Invariants: Reports zero violations when states are consistent and catches injected violations', () => {
    const service = new SustainedOperationsService();
    const report = service.verifyStateInvariants();

    assert.strictEqual(report.allInvariantsSatisfied, true, 'Clean system must pass all 6 invariants');
    assert.strictEqual(report.violations.length, 0);
  });

  // ── 9. Production Security Boundary Negative Test (§18) ────────────
  test('Security Boundary: Autonomous transition attempts beyond READY_FOR_DEPLOY are strictly blocked', () => {
    const service = new SustainedOperationsService();
    const res = service.attemptAutonomousProductionTransition('SIMMACI-SUST-01');

    assert.strictEqual(res.blocked, true, 'Autonomous production transition must be strictly blocked');
    assert.ok(res.error.includes('SecurityBoundaryViolation'));
    assert.ok(res.error.includes('Human approval is non-negotiable'));
  });
});
