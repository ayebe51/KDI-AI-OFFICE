// ==========================================================
// services/api/src/autonomy/autonomy.service.test.ts
// Unit Tests for Phase 9 Autonomous Office Operations & Human Command Center
// ==========================================================

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { AutonomyService } from './autonomy.service.js';

describe('Phase 9 Autonomous Office Operations & Human Command Center Tests', () => {
  // Mock Events Gateway to capture 3D Living Office event envelopes
  const emittedEvents: Array<{ type: string; data: any }> = [];
  const mockGateway: any = {
    broadcastOfficeEvent: (type: string, data: any) => {
      emittedEvents.push({ type, data });
    },
  };

  const service = new AutonomyService(mockGateway);

  // Test 1: Objective creation
  test('Test 1: Objective creation with all required canonical fields', () => {
    const obj = service.createObjective({
      title: 'Maintain KDI website every week',
      description: 'Recurring health checks, SSL verification, and uptime surveillance.',
      owner: 'Human Operator',
      priority: 'HIGH',
      status: 'ACTIVE',
      riskLevel: 'LOW',
      autonomyLevel: 2,
      recurrence: 'cron(0 8 * * 1)',
      successCriteria: ['Uptime > 99.9%', 'SSL valid > 30 days', 'Smoke tests passing'],
      constraints: ['No direct unreviewed schema changes'],
      projects: ['prj_kdi_portal'],
      agents: ['AI_MANAGER', 'SOFTWARE_ENGINEER', 'QA_ENGINEER'],
      budget: {
        dailyBudgetUsd: 10,
        weeklyBudgetUsd: 50,
        monthlyBudgetUsd: 200,
        currentSpendDailyUsd: 0,
        currentSpendWeeklyUsd: 0,
        currentSpendMonthlyUsd: 0,
        enforcement: 'HARD',
      },
    });

    assert.ok(obj.objectiveId.startsWith('obj_'));
    assert.equal(obj.title, 'Maintain KDI website every week');
    assert.equal(obj.status, 'ACTIVE');
    assert.equal(obj.autonomyLevel, 2);
    assert.equal(obj.riskLevel, 'LOW');
    assert.ok(obj.successCriteria.length >= 3);
    assert.ok(obj.constraints.length >= 1);
    assert.ok(obj.projects.includes('prj_kdi_portal'));
    assert.ok(obj.agents.includes('AI_MANAGER'));
    assert.ok(obj.createdAt);
    assert.ok(obj.updatedAt);
  });

  // Test 2: Objective → Task decomposition
  test('Test 2: Objective → Task decomposition into actionable units', () => {
    const objs = service.getObjectives();
    const targetObj = objs[0];
    const decomposed = service.decomposeObjective(targetObj.objectiveId);

    assert.equal(decomposed.objective.objectiveId, targetObj.objectiveId);
    assert.ok(decomposed.tasks.length >= 4, 'Must decompose into at least 4 operational tasks');
    assert.ok(decomposed.decompositionPlan.length >= 3);

    // Verify task details and agent assignments
    const qaTask = decomposed.tasks.find((t) => t.assignedAgent === 'QA_ENGINEER');
    assert.ok(qaTask, 'QA task must be generated');
    const mgrTask = decomposed.tasks.find((t) => t.assignedAgent === 'AI_MANAGER');
    assert.ok(mgrTask, 'AI Manager task must be generated');
    assert.ok(mgrTask?.dependencies.length! > 0, 'AI Manager report task must depend on earlier tasks');
  });

  // Test 3: Recurring job
  test('Test 3: Recurring job domain abstraction using existing scheduler pattern', () => {
    const jobs = Array.from((service as any).recurringJobs.values()) as any[];
    assert.ok(jobs.length >= 1, 'At least 1 recurring job seeded');
    const job = jobs[0];
    assert.equal(job.jobId, 'job_weekly_web');
    assert.equal(job.objectiveId, 'obj_maintain_website');
    assert.equal(job.schedule, '0 8 * * 1');
    assert.equal(job.timezone, 'Asia/Jakarta');
    assert.equal(job.enabled, true);
    assert.ok(job.nextRun);
    assert.equal(job.status, 'SCHEDULED');
  });

  // Test 4: Event trigger
  test('Test 4: Event trigger evaluation', () => {
    const resMatched = service.evaluateTrigger(
      'EVENT',
      { event: 'service.degraded' },
      { event: 'service.degraded', service: 'neo4j' }
    );
    assert.equal(resMatched.triggered, true);
    assert.ok(resMatched.reason.includes('matched event: service.degraded'));

    const resUnmatched = service.evaluateTrigger(
      'EVENT',
      { event: 'service.degraded' },
      { event: 'task.completed' }
    );
    assert.equal(resUnmatched.triggered, false);
  });

  // Test 5: Condition trigger
  test('Test 5: Condition trigger deterministic evaluation without LLM', () => {
    const evalGT = service.evaluateTrigger(
      'CONDITION',
      { field: 'latencyMs', operator: 'GT', value: 2000 },
      { latencyMs: 2450 }
    );
    assert.equal(evalGT.triggered, true);

    const evalFail = service.evaluateTrigger(
      'CONDITION',
      { field: 'task_failures', operator: 'GTE', value: 2 },
      { task_failures: 1 }
    );
    assert.equal(evalFail.triggered, false);

    const evalPass = service.evaluateTrigger(
      'CONDITION',
      { field: 'task_failures', operator: 'GTE', value: 2 },
      { task_failures: 2 }
    );
    assert.equal(evalPass.triggered, true);
  });

  // Test 6: Autonomy policy
  test('Test 6: Autonomy policy permission resolution across levels', () => {
    const policies = service.getPolicies();
    assert.ok(policies.length >= 8);

    // Read action: Low risk, allowed
    const readCheck = service.evaluatePolicy('READ', 'LOW', 'AI_MANAGER');
    assert.equal(readCheck.permitted, true);
    assert.equal(readCheck.requiresApproval, false);
  });

  // Test 7: Low-risk automatic execution
  test('Test 7: Low-risk automatic execution permits safe non-destructive action', () => {
    const check = service.evaluatePolicy('REPORT', 'LOW', 'AI_MANAGER', 'PRODUCTION');
    assert.equal(check.permitted, true);
    assert.equal(check.requiresApproval, false);
    assert.equal(check.requiredAutonomyLevel, 2);
  });

  // Test 8: High-risk approval gate
  test('Test 8: High-risk approval gate halts for human operator review', () => {
    const check = service.evaluatePolicy('EDIT', 'HIGH', 'SOFTWARE_ENGINEER', 'PRODUCTION');
    assert.equal(check.permitted, false);
    assert.equal(check.requiresApproval, true);
    assert.equal(check.requiredAutonomyLevel, 3);
    assert.ok(check.reason.includes('APPROVAL_REQUIRED'));
  });

  // Test 9: Critical human-only action
  test('Test 9: Critical risk actions are strictly LEVEL 4 — HUMAN ONLY', () => {
    const check = service.evaluatePolicy('EDIT', 'CRITICAL', 'SOFTWARE_ENGINEER', 'PRODUCTION');
    assert.equal(check.permitted, false);
    assert.equal(check.requiredAutonomyLevel, 4);
    assert.ok(check.reason.includes('HUMAN ONLY'));
  });

  // Test 10: Budget limit
  test('Test 10: Budget limit enforces pause on spend exceeded', () => {
    // Normal budget check passes
    const checkOk = service.checkBudget(undefined, 1.0, 1000);
    assert.equal(checkOk.allowed, true);

    // Large simulated cost exceeding maxEstimatedCost ($100)
    const checkExceeded = service.checkBudget(undefined, 999.0, 1000);
    assert.equal(checkExceeded.allowed, false);
    assert.equal(checkExceeded.budgetStatus, 'EXCEEDED');
    assert.ok(checkExceeded.reason?.includes('BUDGET_EXCEEDED'));
  });

  // Test 11: Cooldown
  test('Test 11: Cooldown enforces quiet window between automated runs', () => {
    const ruleId = 'rule_test_cooldown';
    const firstCheck = service.checkCooldown(ruleId, 60);
    assert.equal(firstCheck.allowed, true);

    // Immediate second trigger must be blocked by cooldown
    const secondCheck = service.checkCooldown(ruleId, 60);
    assert.equal(secondCheck.allowed, false);
    assert.ok(secondCheck.remainingSeconds > 0);
  });

  // Test 12: Duplicate trigger prevention
  test('Test 12: Duplicate trigger prevention suppresses identical event bursts', () => {
    const sig = 'sig_subsystem_down_neo4j';
    const first = service.checkDuplicateTrigger(sig, 60);
    assert.equal(first.allowed, true);

    const duplicate = service.checkDuplicateTrigger(sig, 60);
    assert.equal(duplicate.allowed, false);
    assert.ok(duplicate.reason?.includes('DUPLICATE_TRIGGER_PREVENTED'));
  });

  // Test 13: Automation loop prevention
  test('Test 13: Automation loop prevention catches cascading cyclic triggers', () => {
    const ruleId = 'rule_loop_test';
    const causalId = 'entity_service_db';

    // 1st trigger ok
    const t1 = service.checkLoopPrevention(ruleId, 'service.fail', causalId);
    assert.equal(t1.allowed, true);
    assert.equal(t1.loopDetected, false);

    // 2nd trigger ok
    const t2 = service.checkLoopPrevention(ruleId, 'service.change', causalId);
    assert.equal(t2.allowed, true);

    // 3rd trigger triggers loop detection!
    const t3 = service.checkLoopPrevention(ruleId, 'service.fail', causalId);
    assert.equal(t3.allowed, false);
    assert.equal(t3.loopDetected, true);
    assert.ok(t3.reason?.includes('LOOP_DETECTED'));
  });

  // Test 14: Runbook execution
  test('Test 14: Runbook execution executes structured operational steps', async () => {
    const result = await service.executeRunbook('rbk_website_health');
    assert.equal(result.status, 'COMPLETED');
    assert.ok(result.stepsExecuted.length >= 4);
    assert.ok(result.message.includes('executed cleanly'));
  });

  // Test 15: Runbook failure handling
  test('Test 15: Runbook halts at approval gate for high-risk actions', async () => {
    // rbk_auto_engineering contains step_eng_5 which is APPROVE_GATE with HIGH risk
    const result = await service.executeRunbook('rbk_auto_engineering');
    assert.equal(result.status, 'HALTED_FOR_APPROVAL');
    assert.ok(result.approvalId);
    assert.ok(result.message.includes('Waiting for human approval gate'));

    // Check that pending approval exists in repository
    const pending = service.getApprovalById(result.approvalId!);
    assert.ok(pending);
    assert.equal(pending.status, 'PENDING');
  });

  // Test 16: Escalation
  test('Test 16: EscalationEngine generates alert and creates high-priority incident', () => {
    const esc = service.triggerEscalation(
      'ACTION_REQUIRED',
      'TestSentinel',
      'Repeated Test Failure Escalation',
      'Database connection timeout observed 3 times.'
    );
    assert.ok(esc.escalationId);
    assert.ok(esc.incidentId);

    const inc = service.getIncidentById(esc.incidentId!);
    assert.ok(inc);
    assert.equal(inc.title, 'Repeated Test Failure Escalation');
  });

  // Test 17: Incident lifecycle
  test('Test 17: Incident lifecycle: Detection -> Diagnostics -> Mitigation -> Resolution -> Memory', () => {
    // 1. Create incident
    const inc = service.createIncident(
      'Spike in Memory Allocation',
      'MEDIUM',
      'Watcher',
      'prj_infra_core'
    );
    assert.equal(inc.status, 'OPEN');

    // 2. Safe Diagnostics
    const diag = service.runSafeDiagnostics(inc.incidentId);
    assert.ok(diag.length >= 3);
    assert.equal(service.getIncidentById(inc.incidentId)?.status, 'INVESTIGATING');

    // 3. Mitigation
    const mit = service.mitigateIncident(inc.incidentId, 'Flush expired cache entries');
    assert.equal(mit.applied, true);
    assert.equal(service.getIncidentById(inc.incidentId)?.status, 'MONITORING');

    // 4. Resolution
    const resolved = service.resolveIncident(
      inc.incidentId,
      'Stale connection pool memory fragmentation',
      'Purged zombie workers and added periodic garbage collection'
    );
    assert.equal(resolved.status, 'RESOLVED');
    assert.equal(resolved.memoryCandidateCreated, true, 'Must create Graph Memory candidate');
  });

  // Test 18: Daily briefing
  test('Test 18: Daily briefing synthesizes actual state across all categories', () => {
    const briefing = service.generateDailyBriefing();
    assert.ok(briefing.briefingId);
    assert.ok(briefing.good.length > 0);
    assert.ok(briefing.cost.dailySpendUsd >= 0);
    assert.ok(briefing.cost.virtualCompensationIdr > 0);
    assert.ok(briefing.activeObjectivesCount > 0);
  });

  // Test 19: Weekly report
  test('Test 19: Weekly operations report synthesizes objectives, tasks, incidents, and costs', () => {
    const weekly = service.generateWeeklyOperationsReport();
    assert.equal(weekly.week, '2026-W40');
    assert.ok(weekly.objectives.total > 0);
    assert.ok(weekly.tasks.completed > 0);
    assert.ok(weekly.importantDecisions.length > 0);
    assert.ok(weekly.nextActions.length > 0);
  });

  // Test 20: Notification deduplication & quiet hours
  test('Test 20: Notification deduplication and quiet hours suppression', () => {
    const key = `key_notif_test_${Date.now()}`;
    const firstNotif = service.sendNotification({
      notificationId: 'notif_1',
      channel: 'WEB',
      severity: 'WARNING',
      recipient: 'Operator',
      title: 'Warning Alert',
      message: 'High latency observed',
      createdAt: new Date().toISOString(),
      deduplicationKey: key,
    });

    // If within quiet hours, non-critical is suppressed; otherwise sent
    // Regardless, sending duplicate immediately with same key must be suppressed:
    const dupNotif = service.sendNotification({
      notificationId: 'notif_2',
      channel: 'WEB',
      severity: 'WARNING',
      recipient: 'Operator',
      title: 'Warning Alert',
      message: 'High latency observed',
      createdAt: new Date().toISOString(),
      deduplicationKey: key,
    });

    assert.equal(dupNotif.sent, false);
    assert.ok(dupNotif.reason?.includes('SUPPRESSED'));

    // Critical notifications bypass quiet hours
    const criticalNotif = service.sendNotification({
      notificationId: 'notif_crit',
      channel: 'WEB',
      severity: 'CRITICAL',
      recipient: 'Operator',
      title: 'CRITICAL SECURITY BREACH',
      message: 'Immediate attention required',
      createdAt: new Date().toISOString(),
    });
    assert.equal(criticalNotif.sent, true);
  });

  // Test 21: Global autonomy pause
  test('Test 21: Global autonomy pause halts all new autonomous executions immediately', async () => {
    // 1. Activate pause
    service.toggleGlobalPause(true, 'Maintenance drill', 'Security Officer');
    assert.equal(service.isGlobalPauseActive(), true);

    // 2. Policy evaluation blocked
    const check = service.evaluatePolicy('READ', 'LOW', 'AI_MANAGER');
    assert.equal(check.permitted, false);
    assert.ok(check.reason.includes('Global Autonomy Pause is currently ACTIVE'));

    // 3. Runbook blocked
    const runbookRes = await service.executeRunbook('rbk_website_health');
    assert.equal(runbookRes.status, 'BLOCKED_BY_POLICY');

    // 4. Resume
    service.toggleGlobalPause(false, 'Drill complete', 'Security Officer');
    assert.equal(service.isGlobalPauseActive(), false);

    const resumeCheck = service.evaluatePolicy('READ', 'LOW', 'AI_MANAGER');
    assert.equal(resumeCheck.permitted, true);
  });

  // Test 22: Dry run
  test('Test 22: Dry run produces full execution preview with zero mutations', async () => {
    const dryRes = await service.executeRunbook('rbk_website_health', {}, { dryRun: true });
    assert.equal(dryRes.status, 'COMPLETED');
    assert.ok(dryRes.dryRunResult);
    assert.equal(dryRes.dryRunResult.executedMutations, false);
    assert.ok(dryRes.dryRunResult.proposedActions.length >= 4);
    assert.ok(dryRes.dryRunResult.estimatedCost > 0);
  });

  // Test 23: Simulation mode
  test('Test 23: Simulation mode executes workflow against isolated fixtures', async () => {
    const simRes = await service.executeRunbook('rbk_website_health', {}, { simulation: true });
    assert.equal(simRes.status, 'COMPLETED');
    assert.ok(simRes.simulationResult);
    assert.equal(simRes.simulationResult.productionStateAffected, false);
    assert.equal(simRes.simulationResult.simulatedOutcome, 'SUCCESS');
  });

  // Test 24: Decision trace
  test('Test 24: Decision trace captures concise rationale and evidence without hidden CoT', () => {
    service.recordDecisionTrace({
      decisionId: 'dec_test_audit_01',
      objectiveId: 'obj_maintain_website',
      policyId: 'pol_read_telemetry',
      agentId: 'AGT-ENG-001',
      reason: 'Executed weekly synthetic health check in conformance with policy pol_read_telemetry',
      evidence: ['Cron schedule 08:00 WIB', 'Read-only telemetry check', 'Latency P95 = 24ms'],
      decision: 'PERMITTED',
      timestamp: new Date().toISOString(),
    });

    const traces = service.getDecisionTraces();
    const found = traces.find((t) => t.decisionId === 'dec_test_audit_01');
    assert.ok(found);
    assert.equal(found.decision, 'PERMITTED');
    assert.equal(found.evidence.length, 3);
  });

  // Test 25: Audit trail
  test('Test 25: Audit trail records all governance and operational actions', () => {
    service.recordAudit({
      actor: 'Human Operator',
      action: 'TEST_AUDIT_ACTION',
      targetType: 'SYSTEM_SETTINGS',
      targetId: 'conf_test',
      details: 'Audit verification test entry',
    });

    const logs = service.getAuditTrail();
    const found = logs.find((l) => l.action === 'TEST_AUDIT_ACTION');
    assert.ok(found);
    assert.equal(found.actor, 'Human Operator');
  });

  // Test 26: Self-modification prevention
  test('Test 26: AI self-modification attempt of autonomy policy throws security exception', () => {
    assert.throws(
      () => {
        service.updateAutonomyPolicy(
          'pol_prod_mutation_gate',
          { approvalRequired: false, riskLevel: 'LOW' },
          'AI Agent (AGT-ENG-001)'
        );
      },
      (err: any) => {
        return err.message.includes('SECURITY VIOLATION') && err.message.includes('prohibited');
      }
    );
  });

  // Test 27: Budget abuse prevention
  test('Test 27: Budget abuse prevention blocks overspending', () => {
    const res = service.checkBudget('obj_maintain_website', 9999.0);
    assert.equal(res.allowed, false);
    assert.equal(res.budgetStatus, 'EXCEEDED');
  });

  // Test 28: Permission escalation prevention
  test('Test 28: Agent cannot approve its own pending action', () => {
    const approvals = service.getPendingApprovals();
    assert.ok(approvals.length > 0);
    const target = approvals[0];

    assert.throws(
      () => {
        service.decideApproval(target.approvalId, 'APPROVE', 'ONCE', 'AI Agent AGT-ENG-001');
      },
      (err: any) => {
        return err.message.includes('SECURITY VIOLATION') && err.message.includes('approving its own actions');
      }
    );
  });

  // Test 29: 3D office event integration
  test('Test 29: 3D Living Office event integration emits required telemetry frames', () => {
    assert.ok(emittedEvents.length > 0, 'Must have captured 3D events during tests');
    const eventTypes = emittedEvents.map((e) => e.type);

    assert.ok(
      eventTypes.includes('automation.started') ||
      eventTypes.includes('task.spawned') ||
      eventTypes.includes('approval.required') ||
      eventTypes.includes('incident.opened') ||
      eventTypes.includes('autonomy.global_pause_toggled') ||
      eventTypes.includes('daily_briefing.published'),
      'Must contain living office event types'
    );
  });

  // Test 30: End-to-end autonomous workflow
  test('Test 30: End-to-end autonomous workflow with Human Command Center override', async () => {
    // 1. Natural Language Command received
    const cmd = service.processNaturalLanguageCommand(
      'Review all active projects and tell me what needs attention.',
      'Human Lead'
    );
    assert.equal(cmd.classification, 'ANALYSIS');
    assert.ok(cmd.responseMessage.includes('Operational Analysis Complete'));

    // 2. Operator reviews pending approval and approves it
    const pendingList = service.getPendingApprovals();
    assert.ok(pendingList.length > 0);
    const appr = pendingList[0];
    const decisionRes = service.decideApproval(
      appr.approvalId,
      'APPROVE',
      'FOR_OBJECTIVE',
      'Human Lead',
      'Approved following manual code review'
    );
    assert.equal(decisionRes.success, true);
    assert.equal(decisionRes.approval.status, 'APPROVED');

    // 3. Autonomous health check runbook executes cleanly
    const runRes = await service.executeRunbook('rbk_website_health');
    assert.equal(runRes.status, 'COMPLETED');

    // 4. Briefing generated reflecting updated state
    const briefing = service.generateDailyBriefing();
    assert.ok(briefing.briefingId);

    // 5. Emergency stop verification
    const emergencyCmd = service.processNaturalLanguageCommand('emergency halt all automations', 'Human Lead');
    assert.equal(emergencyCmd.classification, 'EMERGENCY');
    assert.equal(service.isGlobalPauseActive(), true);

    // Clean up pause for subsequent tests
    service.toggleGlobalPause(false, 'Test cleanup', 'Human Lead');
    assert.equal(service.isGlobalPauseActive(), false);
  });
});
