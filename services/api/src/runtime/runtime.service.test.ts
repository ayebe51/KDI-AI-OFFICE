// ==========================================================
// services/api/src/runtime/runtime.service.test.ts
// Comprehensive Phase 3 Unit & Integration Test Matrix
// ==========================================================

process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert';
import { TaskStateMachine } from './state-machines/task.state-machine.js';
import { AgentStateMachine } from './state-machines/agent.state-machine.js';
import { AgentActivityMapper } from './state-machines/activity.mapper.js';
import { TaskQueue } from './queue/task.queue.js';
import { DependencyManager } from './dependencies/dependency.manager.js';
import { AgentAssignmentEngine } from './assignment/assignment.engine.js';
import { ConcurrencyController } from './concurrency/concurrency.controller.js';
import { AgentRegistry } from './engine/agent.registry.js';
import { AgentRuntime } from './engine/agent.runtime.js';
import { AIManager } from './engine/ai.manager.js';
import { RuntimeEventEmitter } from './events/runtime-event.emitter.js';
import type { CanonicalTask, AgentDefinition, TaskResult } from '@kdi/types';
import type { ExecutionProvider } from './execution/execution-provider.interface.js';

test('TaskStateMachine: 15 formal states & guard transitions', async (t) => {
  const sampleTask: CanonicalTask = {
    taskId: 'tsk_test_01',
    title: 'Test state machine',
    description: 'Verify all transitions and guard conditions',
    taskType: 'ANALYSIS',
    priority: 'NORMAL',
    riskLevel: 'LOW',
    status: 'CREATED',
    requestedBy: 'TEST',
    requiredSkills: ['analysis'],
    requiredCapabilities: ['TEXT'],
    dependencies: [],
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 3,
    timeoutMs: 5000,
    approvalRequired: false,
  };

  await t.test('allows legal forward transitions: CREATED -> QUEUED -> RUNNING -> COMPLETED', () => {
    assert.strictEqual(TaskStateMachine.canTransition(sampleTask, 'QUEUED').allowed, true);
    TaskStateMachine.transition(sampleTask, 'QUEUED');
    assert.strictEqual(sampleTask.status, 'QUEUED');

    assert.strictEqual(TaskStateMachine.canTransition(sampleTask, 'PLANNING').allowed, true);
    TaskStateMachine.transition(sampleTask, 'PLANNING');
    assert.strictEqual(sampleTask.status, 'PLANNING');

    assert.strictEqual(TaskStateMachine.canTransition(sampleTask, 'READY').allowed, true);
    TaskStateMachine.transition(sampleTask, 'READY');

    assert.strictEqual(TaskStateMachine.canTransition(sampleTask, 'ASSIGNED').allowed, true);
    TaskStateMachine.transition(sampleTask, 'ASSIGNED');

    assert.strictEqual(TaskStateMachine.canTransition(sampleTask, 'RUNNING').allowed, true);
    TaskStateMachine.transition(sampleTask, 'RUNNING');
    assert.ok(sampleTask.startedAt);

    assert.strictEqual(TaskStateMachine.canTransition(sampleTask, 'COMPLETED').allowed, true);
    TaskStateMachine.transition(sampleTask, 'COMPLETED');
    assert.strictEqual(sampleTask.status, 'COMPLETED');
    assert.ok(sampleTask.completedAt);
  });

  await t.test('strictly rejects illegal state transitions', () => {
    // COMPLETED is a terminal state; cannot transition to RUNNING or QUEUED
    assert.strictEqual(TaskStateMachine.canTransition(sampleTask, 'RUNNING').allowed, false);
    assert.throws(() => TaskStateMachine.transition(sampleTask, 'RUNNING'), /Illegal state transition/);
  });

  await t.test('enforces approval guard when approvalRequired is true', () => {
    const approvalTask: CanonicalTask = { ...sampleTask, status: 'WAITING_APPROVAL', approvalRequired: true };
    const guardCheck = TaskStateMachine.canTransition(approvalTask, 'RUNNING', { approved: false });
    assert.strictEqual(guardCheck.allowed, false);
    assert.ok(guardCheck.reason?.includes('approval'));

    const approvedCheck = TaskStateMachine.canTransition(approvalTask, 'RUNNING', { approved: true });
    assert.strictEqual(approvedCheck.allowed, true);
  });
});

test('AgentStateMachine & ActivityMapper', async (t) => {
  const registry = new AgentRegistry();
  const engineer = registry.get('AGT-ENG-001')!;

  await t.test('transitions through runtime states and derives availability', () => {
    assert.strictEqual(engineer.availability, 'AVAILABLE');

    AgentStateMachine.transition(engineer, 'WORKING');
    assert.strictEqual(engineer.status, 'WORKING');

    // Activity mapper bridge maps WORKING + CODING -> officeState CODING
    const activity = AgentActivityMapper.mapToOfficeActivity(engineer.status, 'CODING');
    assert.strictEqual(activity.officeState, 'CODING');
    assert.ok(activity.activityLabel.includes('code patch'));

    // Intermission state mapping
    const coffeeActivity = AgentActivityMapper.mapToOfficeActivity(engineer.status, undefined, 'COFFEE');
    assert.strictEqual(coffeeActivity.officeState, 'COFFEE');
  });
});

test('TaskQueue: Priority weighting, delay and DLQ escalation', async (t) => {
  const queue = new TaskQueue();

  const lowTask: CanonicalTask = {
    taskId: 'tsk_low',
    title: 'Low task',
    description: 'Low priority',
    taskType: 'DOCUMENTATION',
    priority: 'LOW',
    riskLevel: 'LOW',
    status: 'QUEUED',
    requestedBy: 'TEST',
    requiredSkills: ['documentation'],
    requiredCapabilities: ['TEXT'],
    dependencies: [],
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 3,
    timeoutMs: 5000,
    approvalRequired: false,
  };

  const urgentTask: CanonicalTask = {
    ...lowTask,
    taskId: 'tsk_urgent',
    title: 'Urgent task',
    priority: 'URGENT',
  };

  const normalTask: CanonicalTask = {
    ...lowTask,
    taskId: 'tsk_normal',
    title: 'Normal task',
    priority: 'NORMAL',
  };

  await t.test('dequeues strictly by priority weight: URGENT > NORMAL > LOW', () => {
    queue.enqueue(lowTask);
    queue.enqueue(urgentTask);
    queue.enqueue(normalTask);

    assert.strictEqual(queue.dequeue()?.taskId, 'tsk_urgent');
    assert.strictEqual(queue.dequeue()?.taskId, 'tsk_normal');
    assert.strictEqual(queue.dequeue()?.taskId, 'tsk_low');
  });

  await t.test('respects delayed availability (delayed retries)', () => {
    const delayedTask: CanonicalTask = { ...normalTask, taskId: 'tsk_delayed' };
    queue.enqueue(delayedTask, 500); // 500ms delay

    // Immediate dequeue should be empty
    assert.strictEqual(queue.dequeue(), undefined);
    assert.strictEqual(queue.size(), 1);
  });

  await t.test('routes exhausted tasks to Dead Letter Queue (DLQ)', () => {
    queue.sendToDLQ(urgentTask, 'Max retries exhausted');
    const dlq = queue.getDLQ();
    assert.strictEqual(dlq.length, 1);
    assert.strictEqual(dlq[0].task.taskId, 'tsk_urgent');
    assert.strictEqual(dlq[0].escalationStatus, 'PENDING_HUMAN');
  });
});

test('DependencyManager: DAG resolution & failure policies', async (t) => {
  const depMgr = new DependencyManager();

  const taskA: CanonicalTask = {
    taskId: 'tsk_A',
    title: 'Task A',
    description: 'Prerequisite',
    taskType: 'ANALYSIS',
    priority: 'NORMAL',
    riskLevel: 'LOW',
    status: 'COMPLETED',
    requestedBy: 'TEST',
    requiredSkills: ['analysis'],
    requiredCapabilities: ['TEXT'],
    dependencies: [],
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 3,
    timeoutMs: 5000,
    approvalRequired: false,
  };

  const taskB: CanonicalTask = {
    ...taskA,
    taskId: 'tsk_B',
    title: 'Task B',
    status: 'WAITING_DEPENDENCY',
    dependencies: [
      { taskId: 'tsk_B', dependsOnTaskId: 'tsk_A', required: true, failurePolicy: 'BLOCK' },
    ],
  };

  const taskStore = new Map<string, CanonicalTask>([
    ['tsk_A', taskA],
    ['tsk_B', taskB],
  ]);

  await t.test('reports satisfied when prerequisite task is COMPLETED', () => {
    const check = depMgr.evaluateDependencies(taskB, (id) => taskStore.get(id));
    assert.strictEqual(check.satisfied, true);
    assert.strictEqual(check.pendingDependencies.length, 0);
  });

  await t.test('blocks dependent task when required prerequisite FAILS', () => {
    taskA.status = 'FAILED';
    const check = depMgr.evaluateDependencies(taskB, (id) => taskStore.get(id));
    assert.strictEqual(check.satisfied, false);
    assert.strictEqual(check.failedDependencies.length, 1);

    const action = depMgr.resolveFailureAction(check.failedDependencies);
    assert.strictEqual(action.targetState, 'BLOCKED');
  });
});

test('AgentAssignmentEngine: Skill, Capability & Privacy matching', async (t) => {
  const assignmentEngine = new AgentAssignmentEngine();
  const registry = new AgentRegistry();
  const agents = registry.listActive();

  await t.test('matches software engineer for coding tasks', () => {
    const codingTask: CanonicalTask = {
      taskId: 'tsk_coding',
      title: 'Patch AST',
      description: 'Code surgical edit',
      taskType: 'CODING',
      priority: 'HIGH',
      riskLevel: 'LOW',
      status: 'QUEUED',
      requestedBy: 'TEST',
      requiredSkills: ['coding', 'debugging'],
      requiredCapabilities: ['TEXT', 'CODE'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      timeoutMs: 5000,
      approvalRequired: false,
    };

    const result = assignmentEngine.assign(codingTask, agents);
    assert.ok(result.selectedAgent);
    assert.strictEqual(result.selectedAgent.role, 'SOFTWARE_ENGINEER');
  });

  await t.test('enforces strict privacy: rejects cloud-only agents for CONFIDENTIAL task', () => {
    const confidentialTask: CanonicalTask = {
      taskId: 'tsk_confidential',
      title: 'Confidential Task',
      description: 'Audit private keys',
      taskType: 'SECURITY',
      priority: 'URGENT',
      riskLevel: 'HIGH',
      status: 'QUEUED',
      requestedBy: 'TEST',
      requiredSkills: ['security'],
      requiredCapabilities: ['TEXT', 'REASONING'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      timeoutMs: 5000,
      approvalRequired: false,
      privacyClass: 'CONFIDENTIAL',
    };

    const result = assignmentEngine.assign(confidentialTask, agents);
    assert.ok(result.selectedAgent);
    assert.ok(result.selectedAgent.capabilities.includes('LOCAL'));
    assert.ok(result.selectedAgent.capabilities.includes('PRIVATE'));
  });

  await t.test('rejects assignment when required skill is missing across all candidates', () => {
    const impossibleTask: CanonicalTask = {
      taskId: 'tsk_impossible',
      title: 'Quantum gravity synthesis',
      description: 'Unknown skill',
      taskType: 'RESEARCH',
      priority: 'NORMAL',
      riskLevel: 'LOW',
      status: 'QUEUED',
      requestedBy: 'TEST',
      requiredSkills: ['quantum_physics' as any],
      requiredCapabilities: ['TEXT'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      timeoutMs: 5000,
      approvalRequired: false,
    };

    const result = assignmentEngine.assign(impossibleTask, agents);
    assert.strictEqual(result.selectedAgent, undefined);
    assert.ok(result.rejectedAgents.length > 0);
  });
});

test('AgentRuntime & TaskWorker: End-to-End lifecycle, retries & recovery', async (t) => {
  const registry = new AgentRegistry();
  const eventEmitter = new RuntimeEventEmitter();

  // Mock ExecutionProvider
  let executionCount = 0;
  let shouldFail = false;

  const mockProvider: ExecutionProvider = {
    providerType: 'LLM',
    execute: async (task, agent, signal) => {
      executionCount++;
      if (signal?.aborted) {
        return { status: 'CANCELLED', summary: 'Aborted', executionId: 'test_exec' };
      }
      if (shouldFail) {
        return { status: 'FAILED', summary: 'Simulated failure', executionId: 'test_exec', errors: ['Simulated error'] };
      }
      return {
        status: 'SUCCESS',
        summary: `Successfully executed ${task.title} by ${agent.name}`,
        executionId: 'test_exec',
        usage: { inputTokens: 40, outputTokens: 20, totalTokens: 60 },
        costUsd: 0.0001,
      };
    },
  };

  const runtime = new AgentRuntime(mockProvider, registry, eventEmitter, 2);
  const aiManager = new AIManager(runtime);

  await t.test('ingests, assigns, and completes demo task end-to-end', async () => {
    const task = aiManager.handleRequest({
      title: 'Analyze architecture topology',
      description: 'Review microservice design',
      taskType: 'ANALYSIS',
      priority: 'HIGH',
    });

    assert.ok(task.taskId);
    assert.strictEqual(task.status, 'QUEUED');

    const dispatched = await runtime.processQueue();
    assert.strictEqual(dispatched, 1);
    assert.strictEqual(task.status, 'COMPLETED');
    assert.ok(task.result?.summary.includes('Successfully executed'));

    // Check execution records and session
    const executions = runtime.getExecutions(task.taskId);
    assert.strictEqual(executions.length, 1);
    assert.strictEqual(executions[0].status, 'COMPLETED');
    assert.strictEqual(executions[0].usage?.totalTokens, 60);
  });

  await t.test('handles retry on execution failure', async () => {
    shouldFail = true;
    const task = aiManager.handleRequest({
      title: 'Flaky unit test generation',
      description: 'Generate unit tests for auth',
      taskType: 'TESTING',
      priority: 'NORMAL',
    });

    await runtime.processQueue();
    // Failed first attempt, should transition to RETRYING
    assert.strictEqual(task.status, 'RETRYING');
    assert.strictEqual(task.retryCount, 1);

    // Turn off failure for retry attempt
    shouldFail = false;
    // Fast-forward delay by removing and re-queuing with 0 delay for test
    runtime.queue.remove(task.taskId);
    runtime.queue.enqueue(task, 0);

    await runtime.processQueue();
    assert.strictEqual(task.status, 'COMPLETED');
    assert.strictEqual(runtime.getExecutions(task.taskId).length, 2);
  });

  await t.test('pauses, resumes, and cancels active tasks', async () => {
    const task = aiManager.handleRequest({
      title: 'Long-running documentation',
      description: 'Author detailed guide',
      taskType: 'DOCUMENTATION',
      priority: 'LOW',
    });

    assert.strictEqual(runtime.pauseTask(task.taskId), true);
    assert.strictEqual(task.status, 'PAUSED');

    assert.strictEqual(runtime.resumeTask(task.taskId), true);
    assert.strictEqual(task.status, 'QUEUED');

    assert.strictEqual(runtime.cancelTask(task.taskId, 'Test cancellation'), true);
    assert.strictEqual(task.status, 'CANCELLED');
  });

  await t.test('gates high-risk tasks behind human approval', async () => {
    const highRiskTask = aiManager.handleRequest({
      title: 'Delete legacy database tables',
      description: 'Drop unused customer archives',
      taskType: 'SECURITY',
      priority: 'URGENT',
    });

    // AIManager evaluates risk and flags high risk -> WAITING_APPROVAL
    assert.strictEqual(highRiskTask.status, 'WAITING_APPROVAL');
    assert.strictEqual(highRiskTask.approvalRequired, true);

    // Operator approves task
    assert.strictEqual(aiManager.approveTask(highRiskTask.taskId, 'Principal Architect'), true);
    assert.strictEqual(highRiskTask.approvalRequired, false);
    assert.strictEqual(highRiskTask.status, 'QUEUED');
  });
});
