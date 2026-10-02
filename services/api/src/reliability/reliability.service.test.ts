import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { ServiceRegistryService } from './service-registry.service.js';
import { HealthMonitorService } from './health-monitor.service.js';
import { RestartPolicyService } from './restart-policy.service.js';
import { GracefulShutdownService } from './graceful-shutdown.service.js';
import { WorkerRecoveryService } from './worker-recovery.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { QueueDurabilityService } from './queue-durability.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { BackupService } from './backup.service.js';
import { RestoreTestService } from './restore-test.service.js';
import { DegradedModeService } from './degraded-mode.service.js';
import { SecurityHardeningService } from './security-hardening.service.js';
import { ResourceGovernanceService } from './resource-governance.service.js';
import { ObservabilityService } from './observability.service.js';
import { EmergencyModeService } from './emergency-mode.service.js';
import { DriftDetectionService } from './drift-detection.service.js';

describe('PHASE 10: Complete Production Hardening, Reliability & Disaster Recovery Suite', () => {
  let serviceRegistry: ServiceRegistryService;
  let restartPolicy: RestartPolicyService;
  let workerRecovery: WorkerRecoveryService;
  let idempotencyService: IdempotencyService;
  let queueDurability: QueueDurabilityService;
  let degradedMode: DegradedModeService;
  let securityHardening: SecurityHardeningService;
  let resourceGovernance: ResourceGovernanceService;
  let observabilityService: ObservabilityService;
  let emergencyMode: EmergencyModeService;
  let backupService: BackupService;
  let restoreTestService: RestoreTestService;
  let reconciliationService: ReconciliationService;
  let driftDetection: DriftDetectionService;

  beforeEach(() => {
    serviceRegistry = new ServiceRegistryService();
    restartPolicy = new RestartPolicyService();
    workerRecovery = new WorkerRecoveryService();
    idempotencyService = new IdempotencyService();
    queueDurability = new QueueDurabilityService(idempotencyService);
    degradedMode = new DegradedModeService();
    securityHardening = new SecurityHardeningService();
    resourceGovernance = new ResourceGovernanceService();
    observabilityService = new ObservabilityService();
    emergencyMode = new EmergencyModeService();
    backupService = new BackupService();
    restoreTestService = new RestoreTestService(backupService);
    reconciliationService = new ReconciliationService({} as any, {} as any);
    driftDetection = new DriftDetectionService(
      serviceRegistry,
      securityHardening,
      backupService,
      resourceGovernance
    );
  });

  // Test 1: Service Inventory & Canonical Registry
  it('Test 1: Service inventory registers all 11 canonical services with correct metadata', () => {
    const services = serviceRegistry.getAllServices();
    assert.equal(services.length, 11);

    const postgres = serviceRegistry.getService('kdi-postgres');
    assert.ok(postgres);
    assert.equal(postgres.port, 5432);
    assert.equal(postgres.criticality, 'CRITICAL');
    assert.equal(postgres.backupRequired, true);

    const redis = serviceRegistry.getService('kdi-redis');
    assert.ok(redis);
    assert.equal(redis.port, 6379);

    const neo4j = serviceRegistry.getService('kdi-neo4j');
    assert.ok(neo4j);
    assert.equal(neo4j.port, 7687);

    const api = serviceRegistry.getService('kdi-api');
    assert.ok(api);
    assert.equal(api.port, 3000);
  });

  // Test 2: Startup Order & Shutdown Sequence Validation
  it('Test 2: Startup order sequence respects strict infrastructure-first hierarchy', () => {
    const sequence = serviceRegistry.getStartupSequence();
    assert.equal(sequence[0].serviceId, 'kdi-postgres');
    assert.equal(sequence[1].serviceId, 'kdi-redis');
    assert.equal(sequence[2].serviceId, 'kdi-neo4j');

    const apiIndex = sequence.findIndex((s) => s.serviceId === 'kdi-api');
    const workerIndex = sequence.findIndex((s) => s.serviceId === 'kdi-agent-runtime');
    assert.ok(apiIndex < workerIndex, 'API must start before workers');

    const shutdown = serviceRegistry.getShutdownSequence();
    assert.equal(shutdown[shutdown.length - 1].serviceId, 'kdi-postgres', 'Database must shut down last');
  });

  // Test 3: Dependency Graph Validation
  it('Test 3: Dependency graph validation succeeds with zero cycles or forward violations', () => {
    const validation = serviceRegistry.validateDependencies();
    assert.equal(validation.valid, true);
    assert.equal(validation.errors.length, 0);
  });

  // Test 4: Restart Policy & Exponential Backoff with Jitter
  it('Test 4: Restart policy calculates exponential backoff with jitter on repeated failure', () => {
    const res1 = restartPolicy.recordFailure('kdi-api');
    assert.equal(res1.state, 'BACKOFF');
    assert.ok(res1.backoffMs >= 1000);

    const res2 = restartPolicy.recordFailure('kdi-api');
    assert.equal(res2.state, 'BACKOFF');
    assert.ok(res2.backoffMs >= 2000);
  });

  // Test 5: Crash Loop Protection & Escalation
  it('Test 5: Crash loop protection detects repeated failures and transitions to CRASH_LOOP then ESCALATED', () => {
    // 3 failures triggers crash loop
    restartPolicy.recordFailure('kdi-api');
    restartPolicy.recordFailure('kdi-api');
    const res3 = restartPolicy.recordFailure('kdi-api');
    assert.equal(res3.state, 'CRASH_LOOP');

    // 6 failures exceeds max attempts (5) -> ESCALATED
    restartPolicy.recordFailure('kdi-api');
    restartPolicy.recordFailure('kdi-api');
    const res6 = restartPolicy.recordFailure('kdi-api');
    assert.equal(res6.state, 'ESCALATED');
    assert.equal(res6.retryAllowed, false);
  });

  // Test 6: Cooldown Recovery
  it('Test 6: Cooldown window resets consecutive failure counter after quiet period', () => {
    restartPolicy.recordFailure('kdi-api');
    const rec = restartPolicy.getRecord('kdi-api');
    assert.equal(rec.consecutiveFailures, 1);

    restartPolicy.recordSuccess('kdi-api');
    const updated = restartPolicy.getRecord('kdi-api');
    assert.equal(updated.consecutiveFailures, 0);
    assert.equal(updated.state, 'NORMAL');
  });

  // Test 7: Worker Recovery & Heartbeat Monitoring
  it('Test 7: Worker recovery detects orphan tasks on stale heartbeats and triggers recovery', () => {
    workerRecovery.recordHeartbeat('worker-1', 'SOFTWARE_ENGINEER', 'tsk_101');
    assert.equal(workerRecovery.getAllWorkers().length, 1);

    // Simulate elapsed time by manually altering lastHeartbeatAt
    const worker = workerRecovery.getWorkerStatus('worker-1');
    assert.ok(worker);
    worker.lastHeartbeatAt = new Date(Date.now() - 35000).toISOString(); // 35s ago

    const orphans = workerRecovery.detectAndRecoverOrphans();
    assert.equal(orphans.orphansDetected, 1);
    assert.deepEqual(orphans.tasksRecovered, ['tsk_101']);
    assert.equal(worker.status, 'RECOVERED');
  });

  // Test 8: Idempotency Key Guard
  it('Test 8: Idempotency service prevents duplicate execution of identical operations', async () => {
    const key = 'idem_task_exec_999';
    const payload = { taskId: 'tsk_01', action: 'deploy' };

    const first = await idempotencyService.acquire(key, 'task_execution', payload);
    assert.equal(first.acquired, true);

    idempotencyService.complete(key, { result: 'OK' });

    // Second attempt with same key
    const second = await idempotencyService.acquire(key, 'task_execution', payload);
    assert.equal(second.acquired, false);
    assert.equal(second.existingRecord?.status, 'COMPLETED');
  });

  // Test 9: Dead Letter Queue (DLQ) Routing
  it('Test 9: Queue durability routes exhausted event failures to Dead Letter Queue without dropping', () => {
    const record = queueDurability.enqueueDeadLetter(
      'evt_fail_101',
      'neo4j_graph_ingestion',
      3,
      'Connection timed out',
      { entityId: 'node_5' }
    );
    assert.ok(record.dlqId.startsWith('dlq_'));
    assert.equal(record.nextAction, 'MANUAL_INSPECTION');

    const list = queueDurability.getDLQRecords();
    assert.equal(list.length, 1);
    assert.equal(list[0].eventId, 'evt_fail_101');
  });

  // Test 10: Event Replay Engine with Idempotency Guard
  it('Test 10: Event replay successfully reprocesses DLQ item and sets resolved state', async () => {
    const record = queueDurability.enqueueDeadLetter(
      'evt_replay_202',
      'portfolio_sync',
      3,
      'Network glitch',
      { projectId: 'prj_01' }
    );

    let handlerInvoked = false;
    const res = await queueDurability.replayEvent(record.dlqId, async () => {
      handlerInvoked = true;
    });

    assert.equal(res.success, true);
    assert.equal(handlerInvoked, true);
    assert.equal(record.nextAction, 'RETRY');
    assert.ok(record.resolvedAt);
  });

  // Test 11: Cross-Database Data Integrity & Reconciliation
  it('Test 11: Reconciliation service inspects tasks, graph, and cost projections', async () => {
    const report = await reconciliationService.runReconciliation('tasks', false);
    assert.equal(report.status, 'CONSISTENT');
    assert.equal(report.discrepanciesFound, 0);

    const graphReport = await reconciliationService.runReconciliation('graph', false);
    assert.equal(graphReport.type, 'graph');
  });

  // Test 12: Encrypted Backup Creation (AES-256-GCM)
  it('Test 12: Backup service produces AES-256-GCM encrypted backup with valid checksum', async () => {
    const bkp = await backupService.createBackup('POSTGRESQL', 'DAILY');
    assert.ok(bkp.backupId.startsWith('bkp_postgresql_'));
    assert.equal(bkp.encrypted, true);
    assert.equal(bkp.cipher, 'aes-256-gcm');
    assert.ok(bkp.checksumSha256.length === 64);
    assert.ok(bkp.sizeBytes > 0);
  });

  // Test 13: Clean-Environment Restore Verification Drill
  it('Test 13: Restore test verifies schema, entities, and executes test query suite', async () => {
    const bkp = await backupService.createBackup('POSTGRESQL', 'DAILY');
    const report = await restoreTestService.testRestore(bkp.backupId);

    assert.equal(report.status, 'SUCCESS');
    assert.equal(report.integrityCheckPassed, true);
    assert.ok(report.entitiesVerified.projects >= 1);
    assert.ok(report.entitiesVerified.tasks >= 1);
    assert.ok(report.testQueryResults.every((q) => q.passed));
  });

  // Test 14: Backup Retention Policy Pruning
  it('Test 14: Backup retention policy identifies and prunes expired historical backups', async () => {
    const bkp = await backupService.createBackup('POSTGRESQL', 'DAILY');
    assert.ok(bkp);

    // Simulate expiration
    bkp.expiresAt = new Date(Date.now() - 1000).toISOString();
    const pruneResult = backupService.pruneExpiredBackups();
    assert.equal(pruneResult.prunedCount, 1);
  });

  // Test 15: RPO and RTO Targets Compliance
  it('Test 15: RPO and RTO evaluation confirms targets are compliant across all subsystems', () => {
    const targets = backupService.getRPORTOStatus();
    assert.equal(targets.length, 5);
    for (const t of targets) {
      assert.equal(t.compliant, true, `${t.subsystem} should be compliant`);
      assert.ok(t.rationale.length > 0);
    }
  });

  // Test 16: Degraded Mode — Neo4j Outage
  it('Test 16: Degraded mode handles Neo4j outage by suspending GraphRAG without crashing API', () => {
    const state = degradedMode.handleNeo4jFailure(true);
    assert.equal(state.neo4jDegraded, true);
    assert.equal(state.graphRagAvailable, false);

    // Recovery
    const recovered = degradedMode.handleNeo4jFailure(false);
    assert.equal(recovered.neo4jDegraded, false);
    assert.equal(recovered.graphRagAvailable, true);
  });

  // Test 17: Degraded Mode — Ollama Local Inference Outage
  it('Test 17: Degraded mode handles Ollama outage by activating cloud provider fallback', () => {
    const state = degradedMode.handleOllamaFailure(true);
    assert.equal(state.ollamaDegraded, true);
    assert.equal(state.aiRouterFallbackActive, true);
  });

  // Test 18: Degraded Mode — Antigravity Engineering Outage
  it('Test 18: Degraded mode handles Antigravity outage by parking tasks in WAITING_PROVIDER', () => {
    const state = degradedMode.handleAntigravityFailure(true);
    assert.equal(state.antigravityDegraded, true);
    assert.equal(state.engineeringInWaitingProvider, true);
  });

  // Test 19: Degraded Mode — Network Outage (Isolated Local Mode)
  it('Test 19: Degraded mode handles Internet loss by isolating local databases and runtimes', () => {
    const state = degradedMode.handleNetworkFailure(true);
    assert.equal(state.networkDegraded, true);
    assert.equal(state.localOperationsIsolated, true);
  });

  // Test 20: Security Hardening — Secret Scanner
  it('Test 20: Secret scanner flags hardcoded keys, tokens, and passwords in repository scans', () => {
    const cleanContent = 'const port = 3000;\nconsole.log("Started");';
    const cleanScan = securityHardening.scanTextForSecrets(cleanContent);
    assert.equal(cleanScan.passed, true);
    assert.equal(cleanScan.violationsFound, 0);

    const dirtyContent = 'const key = "AIzaSyD-1234567890123456789012345678901";';
    const dirtyScan = securityHardening.scanTextForSecrets(dirtyContent);
    assert.equal(dirtyScan.passed, false);
    assert.equal(dirtyScan.violationsFound, 1);
    assert.equal(dirtyScan.violations[0].rule, 'Unmasked Google API Key');
  });

  // Test 21: Security Hardening — Network Exposure & Firewall
  it('Test 21: Network exposure audit confirms zero public exposure of database ports', () => {
    const audit = securityHardening.auditNetworkExposure();
    assert.equal(audit.compliant, true);
    assert.ok(audit.portsInspected[5432].safe);
    assert.ok(audit.portsInspected[6379].safe);
    assert.ok(audit.portsInspected[7687].safe);
  });

  // Test 22: Security Hardening — Least Privilege Service Accounts
  it('Test 22: Least privilege service accounts enforce role-based permission boundaries', () => {
    const accounts = securityHardening.getServiceAccounts();
    assert.equal(accounts.length, 4);
    const backupAcc = accounts.find((a) => a.name === 'kdi_backup_svc');
    assert.ok(backupAcc);
    assert.ok(backupAcc.restrictedFrom.includes('DROP'));
    assert.ok(backupAcc.restrictedFrom.includes('DELETE'));
  });

  // Test 23: Resource Governance — Disk Threshold Awareness (C: vs D:)
  it('Test 23: Resource governance evaluates host disk limits with C: warning and D: vault', () => {
    const metrics = resourceGovernance.getMetrics();
    assert.ok(metrics.cpuUsagePercent >= 0);
    assert.ok(metrics.memoryUsagePercent >= 0);
    assert.ok(metrics.diskFreeBytesC > 0);
    assert.ok(metrics.diskFreeBytesD > 100 * 1024 * 1024 * 1024, 'D: drive has plenty of storage');
    assert.equal(metrics.diskStatus, 'WARNING', 'C: drive triggers WARNING so backups store on D:');
  });

  // Test 24: Resource Governance — Ollama Concurrency Limits
  it('Test 24: Resource governance caps concurrent Ollama inferences to prevent OS starvation', () => {
    const slot1 = resourceGovernance.acquireOllamaSlot();
    assert.equal(slot1.acquired, true);

    const slot2 = resourceGovernance.acquireOllamaSlot();
    assert.equal(slot2.acquired, true);

    // 3rd slot should be throttled
    const slot3 = resourceGovernance.acquireOllamaSlot();
    assert.equal(slot3.acquired, false);
    assert.ok(slot3.reason?.includes('limit reached'));

    resourceGovernance.releaseOllamaSlot();
    const slotAfterRelease = resourceGovernance.acquireOllamaSlot();
    assert.equal(slotAfterRelease.acquired, true);
  });

  // Test 25: Observability — OpenTelemetry Trace Context & Spans
  it('Test 25: Observability service creates distributed trace context and captures spans', () => {
    const ctx = observabilityService.createTraceContext('corr_req_101');
    assert.ok(ctx.traceId.startsWith('trc_'));
    assert.ok(ctx.spanId.startsWith('spn_'));

    const { span, context } = observabilityService.startSpan('database_query', ctx, { table: 'tasks' });
    assert.equal(span.name, 'database_query');
    assert.equal(context.traceId, ctx.traceId);

    const finished = observabilityService.endSpan(span.spanId, 'OK');
    assert.ok(finished);
    assert.equal(finished.status, 'OK');
    assert.ok(finished.durationMs !== undefined);
  });

  // Test 26: Observability — Alerting Engine & Deduplication
  it('Test 26: Observability alerting deduplicates rapid identical alerts within quiet window', () => {
    const alt1 = observabilityService.triggerAlert(
      'HIGH',
      'redis_sentinel',
      'High latency on ping',
      'Slow task dispatch',
      'Flush stale cache keys',
      'rbk_diag_service'
    );
    assert.ok(alt1);
    assert.equal(alt1.severity, 'HIGH');

    // Duplicate alert fired immediately
    const alt2 = observabilityService.triggerAlert(
      'HIGH',
      'redis_sentinel',
      'High latency on ping',
      'Slow task dispatch',
      'Flush stale cache keys',
      'rbk_diag_service'
    );
    assert.equal(alt2, null, 'Duplicate alert within 60s should be suppressed');

    const acknowledged = observabilityService.acknowledgeAlert(alt1.alertId, 'DevOpsLead');
    assert.equal(acknowledged, true);
  });

  // Test 27: Emergency Mode — Read-Only Mode Blocks Mutations
  it('Test 27: Read-Only mode blocks mutation operations while allowing queries and audit', () => {
    emergencyMode.setReadOnlyMode(true, 'LeadArchitect', 'Pre-deployment database inspection');
    const state = emergencyMode.getState();
    assert.equal(state.readOnlyMode, true);

    assert.throws(
      () => emergencyMode.assertMutationAllowed('deleteUser'),
      /MUTATION_BLOCKED: System is in READ-ONLY MODE/
    );

    // Audit trail should record action
    const audit = emergencyMode.getAuditLog();
    assert.equal(audit[0].action, 'SET_READ_ONLY_MODE');
    assert.equal(audit[0].performedBy, 'LeadArchitect');

    emergencyMode.setReadOnlyMode(false, 'LeadArchitect');
    assert.doesNotThrow(() => emergencyMode.assertMutationAllowed('createUser'));
  });

  // Test 28: Emergency Mode — Safe Mode Blocks High-Risk Actions
  it('Test 28: Safe mode blocks high-risk and critical actions during operational caution', () => {
    emergencyMode.setSafeMode(true, 'SecurityLead', 'Anomaly detected in worker log');
    assert.throws(
      () => emergencyMode.assertSafeModeAllowed('HIGH'),
      /ACTION_BLOCKED: System is in SAFE MODE/
    );

    assert.doesNotThrow(() => emergencyMode.assertSafeModeAllowed('LOW'));
  });

  // Test 29: Drift Detection & Operational Scorecard
  it('Test 29: Drift detection checks architecture, config, and outputs 9-category scorecard', () => {
    const archDrift = driftDetection.detectArchitectureDrift();
    assert.equal(archDrift.driftDetected, false);

    const scorecard = driftDetection.generateOperationalScorecard();
    const cats = scorecard.categories;

    assert.ok(cats.availability.score >= 90);
    assert.ok(cats.security.score >= 90);
    assert.ok(cats.backups.score >= 90);
    assert.ok(cats.recovery.score >= 90);
    assert.ok(cats.performance.score >= 90);
    assert.ok(cats.queueHealth.score >= 90);
    assert.ok(cats.providerHealth.score >= 90);
    assert.ok(cats.autonomySafety.score >= 90);
    assert.ok(cats.dataIntegrity.score >= 90);
  });

  // Test 30: End-to-End Disaster Recovery Drill Simulation
  it('Test 30: End-to-end disaster recovery drill validates host recovery workflow', async () => {
    // Stage 1: Primary host creates encrypted backup
    const backup = await backupService.createBackup('POSTGRESQL', 'DAILY');
    assert.ok(backup.storageLocation);

    // Stage 2: Simulate host loss & degraded mode
    degradedMode.handleNetworkFailure(true);
    degradedMode.handleNeo4jFailure(true);
    assert.equal(degradedMode.getState().networkDegraded, true);

    // Stage 3: Clean environment restore verification
    const restoreReport = await restoreTestService.testRestore(backup.backupId);
    assert.equal(restoreReport.status, 'SUCCESS');
    assert.equal(restoreReport.integrityCheckPassed, true);

    // Stage 4: Service recovery and resumption
    degradedMode.handleNetworkFailure(false);
    degradedMode.handleNeo4jFailure(false);
    assert.equal(degradedMode.getState().networkDegraded, false);

    // Stage 5: Final integrity reconciliation check
    const reconciliation = await reconciliationService.runReconciliation('tasks', true);
    assert.equal(reconciliation.status, 'CONSISTENT');
  });
});
