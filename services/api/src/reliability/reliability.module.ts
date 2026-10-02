import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { RuntimeModule } from '../runtime/runtime.module.js';
import { EngineeringModule } from '../engineering/engineering.module.js';
import { WebSocketModule } from '../websocket/websocket.module.js';

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
import { ReliabilityController } from './reliability.controller.js';

@Module({
  imports: [
    DatabaseModule,
    LLMModule,
    RuntimeModule,
    EngineeringModule,
    WebSocketModule,
  ],
  controllers: [ReliabilityController],
  providers: [
    ServiceRegistryService,
    HealthMonitorService,
    RestartPolicyService,
    GracefulShutdownService,
    WorkerRecoveryService,
    IdempotencyService,
    QueueDurabilityService,
    ReconciliationService,
    BackupService,
    RestoreTestService,
    DegradedModeService,
    SecurityHardeningService,
    ResourceGovernanceService,
    ObservabilityService,
    EmergencyModeService,
    DriftDetectionService,
  ],
  exports: [
    ServiceRegistryService,
    HealthMonitorService,
    RestartPolicyService,
    GracefulShutdownService,
    WorkerRecoveryService,
    IdempotencyService,
    QueueDurabilityService,
    ReconciliationService,
    BackupService,
    RestoreTestService,
    DegradedModeService,
    SecurityHardeningService,
    ResourceGovernanceService,
    ObservabilityService,
    EmergencyModeService,
    DriftDetectionService,
  ],
})
export class ReliabilityModule {}
