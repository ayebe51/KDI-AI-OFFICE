// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// Unit Tests for KDI Adapters (Agent, Task, Event, Approval, Office)
// ==========================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { KdiAgentAdapter } from './KdiAgentAdapter.ts';
import { KdiTaskAdapter } from './KdiTaskAdapter.ts';
import { KdiEventAdapter } from './KdiEventAdapter.ts';
import { KdiApprovalAdapter } from './KdiApprovalAdapter.ts';
import { KdiOfficeAdapter } from './KdiOfficeAdapter.ts';

describe('KdiAgentAdapter', () => {
  it('maps raw employee record into KdiAgentProjection with desk seat', () => {
    const raw = {
      agentId: 'AGT-ENG-001',
      name: 'Farhan (AI Software Engineer)',
      role: 'Lead Autonomous Software Engineer',
      department: 'Engineering',
      currentState: 'BUSY',
      currentActivity: 'Fixing postgresql://kdi_usr:SecretPass123!@localhost:5432/kdi_prod schema',
      currentTaskId: 'TSK-001',
      currentTaskTitle: 'Fix DB auth with token Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature',
    };

    const projection = KdiAgentAdapter.toProjection(raw);

    assert.equal(projection.id, 'AGT-ENG-001');
    assert.equal(projection.displayName, 'Farhan');
    assert.equal(projection.characterKey, 'farhan');
    assert.equal(projection.status, 'CODING');
    assert.equal(projection.seatLocation.facing, 'up');

    // Secrets in activity and task title must be sanitized
    assert.ok(!projection.activity?.includes('SecretPass123!'));
    assert.ok(projection.activity?.includes('[REDACTED_CREDENTIALS]'));
    assert.ok(!projection.currentTaskTitle?.includes('doNotLeakThisSignature'));
    assert.ok(projection.currentTaskTitle?.includes('[REDACTED_JWT_TOKEN]'));
  });

  it('correctly resolves KDI original workforce identities', () => {
    assert.equal(KdiAgentAdapter.resolveCharacterKey('AGT-ENG-001', 'SOFTWARE_ENGINEER'), 'farhan');
    assert.equal(KdiAgentAdapter.resolveCharacterKey('AGT-MGR-001', 'FRONTEND_ENGINEER'), 'rian');
    assert.equal(KdiAgentAdapter.resolveCharacterKey('AGT-ARCH-001', 'SYSTEMS_ARCHITECT'), 'ahmad');
    assert.equal(KdiAgentAdapter.resolveCharacterKey('AGT-QA-001', 'QA_ENGINEER'), 'nadia');
    assert.equal(KdiAgentAdapter.resolveCharacterKey('AGT-PROD-001', 'PRODUCT_MANAGER'), 'maya');
    assert.equal(KdiAgentAdapter.resolveCharacterKey('AGT-SALES-001', 'ACCOUNT_MANAGER'), 'naya');
  });

  it('normalizes various status aliases into canonical OfficeAgentStatus', () => {
    assert.equal(KdiAgentAdapter.normalizeStatus('available'), 'IDLE');
    assert.equal(KdiAgentAdapter.normalizeStatus('executing'), 'CODING');
    assert.equal(KdiAgentAdapter.normalizeStatus('testing'), 'TESTING');
    assert.equal(KdiAgentAdapter.normalizeStatus('waiting_approval'), 'WAITING_APPROVAL');
    assert.equal(KdiAgentAdapter.normalizeStatus('blocked'), 'BLOCKED');
    assert.equal(KdiAgentAdapter.normalizeStatus('completed'), 'COMPLETED');
  });

  it('maps workloadLevel and isOverloaded flags for visual workspace badges (Phase 13)', () => {
    const rawOverloaded = {
      agentId: 'AGT-ENG-001',
      name: 'Farhan',
      role: 'BACKEND_ENGINEER',
      utilizationPercent: 90,
      isOverloaded: true,
    };
    const proj1 = KdiAgentAdapter.toProjection(rawOverloaded);
    assert.equal(proj1.isOverloaded, true);
    assert.equal(proj1.workloadLevel, 'OVERLOADED');

    const rawNormal = {
      agentId: 'AGT-DOC-001',
      name: 'Tari',
      role: 'TECHNICAL_WRITER',
      utilizationPercent: 20,
    };
    const proj2 = KdiAgentAdapter.toProjection(rawNormal);
    assert.equal(proj2.isOverloaded, false);
    assert.equal(proj2.workloadLevel, 'NORMAL');
  });
});

describe('KdiTaskAdapter', () => {
  it('maps and sanitizes raw task into KdiTaskProjection', () => {
    const raw = {
      taskId: 'TSK-99',
      title: 'Update redis://:MyRedisP@ss@127.0.0.1:6379 cache',
      description: 'Deploy branch fix/sec with token ghp_123456789012345678901234567890123456',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      riskLevel: 'CRITICAL',
      assignedAgentId: 'AGT-ENG-001',
    };

    const task = KdiTaskAdapter.toProjection(raw);

    assert.equal(task.id, 'TSK-99');
    assert.equal(task.status, 'IN_PROGRESS');
    assert.equal(task.priority, 'URGENT');
    assert.equal(task.riskLevel, 'CRITICAL');
    assert.ok(!task.title.includes('MyRedisP@ss'));
    assert.ok(!task.description.includes('ghp_123456789012345678901234567890123456'));
  });
});

describe('KdiEventAdapter', () => {
  it('normalizes event types and recursively sanitizes payload data', () => {
    const raw = {
      eventId: 'evt_001',
      type: 'AGENT_STATUS_CHANGED',
      data: {
        agentId: 'AGT-ENG-001',
        currentState: 'CODING',
        activitySummary: 'Authenticating with sk-proj-123456789012345678901234567890123456789012345678',
        meta: {
          token: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.secretSignatureKey123',
        },
      },
    };

    const norm = KdiEventAdapter.toNormalizedEvent(raw);

    assert.equal(norm.eventId, 'evt_001');
    assert.equal(norm.eventType, 'agent.status.changed');
    assert.ok(!norm.data.activitySummary.includes('sk-proj-'));
    assert.ok(!norm.data.meta.token.includes('secretSignatureKey123'));
  });
});

describe('KdiApprovalAdapter', () => {
  it('transforms pending approval and masks sensitive diffs and commands', () => {
    const raw = {
      approvalId: 'appr_01',
      action: 'Apply Neo4j DB Migration',
      reason: 'Index optimization for workforce valuation',
      risk: 'HIGH',
      status: 'PENDING',
      commands: ['neo4j-admin import --key sk-ant-api03-123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'],
    };

    const appr = KdiApprovalAdapter.toProjection(raw);

    assert.equal(appr.id, 'appr_01');
    assert.equal(appr.risk, 'HIGH');
    assert.equal(appr.status, 'PENDING');
    assert.ok(appr.commands && appr.commands.length > 0);
    assert.ok(!appr.commands[0].includes('sk-ant-api03-'));
  });
});

describe('KdiOfficeAdapter', () => {
  it('builds initial office snapshot and correctly applies live events', () => {
    const snapshot = KdiOfficeAdapter.createInitialSnapshot(
      [
        {
          agentId: 'AGT-ENG-001',
          name: 'Farhan',
          role: 'Lead Autonomous Software Engineer',
          currentState: 'IDLE',
        },
      ],
      [],
      []
    );

    assert.ok(snapshot.agents['AGT-ENG-001']);
    assert.equal(snapshot.agents['AGT-ENG-001'].status, 'IDLE');

    // Event 1: Agent begins working on task
    const event1 = {
      type: 'agent.status.changed',
      data: {
        agentId: 'AGT-ENG-001',
        currentState: 'CODING',
        activitySummary: 'Refactoring auth middleware',
      },
    };

    const updated = KdiOfficeAdapter.applyEvent(snapshot, event1);
    assert.equal(updated.agents['AGT-ENG-001'].status, 'CODING');
    assert.equal(updated.agents['AGT-ENG-001'].activity, 'Refactoring auth middleware');

    // Event 2: Approval required arrives
    const event2 = {
      type: 'approval.required',
      data: {
        approvalId: 'appr_99',
        action: 'Deploy hotfix to production',
        reason: 'Zero-day mitigation',
        risk: 'CRITICAL',
      },
    };

    const updatedWithApproval = KdiOfficeAdapter.applyEvent(updated, event2);
    assert.equal(updatedWithApproval.approvals.length, 1);
    assert.equal(updatedWithApproval.approvals[0].id, 'appr_99');
    assert.equal(updatedWithApproval.approvals[0].risk, 'CRITICAL');
  });
});
