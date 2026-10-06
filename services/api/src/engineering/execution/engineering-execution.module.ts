// ==========================================================
// services/api/src/engineering/execution/engineering-execution.module.ts
// Phase 15.2: Engineering Execution Module
// ==========================================================

import { Module } from '@nestjs/common';
import { EngineeringExecutorService } from './engineering-executor.service.js';
import { EngineeringAgentService } from './engineering-agent.service.js';
import { GitWorkspaceAdapter } from './adapters/git-workspace.adapter.js';
import { AntigravityExecutorAdapter } from './adapters/antigravity.adapter.js';
import { ApprovalGateService } from '../security/approval-gate.service.js';

import { AcceptanceCriteriaEngine } from './acceptance-criteria.engine.js';
import { EngineeringCodingWorker } from './coding-worker.service.js';
import { CodingWorkerAdapter } from './adapters/coding-worker.adapter.js';
import { AntigravityDiscoveryService } from './antigravity-discovery.service.js';
import { EngineeringHostService } from './engineering-host.service.js';
import { ControlPlaneService } from '../control-plane/control-plane.service.js';
import { ControlPlanePersistenceService } from '../control-plane/control-plane-persistence.service.js';
import { EngineeringQueueService } from '../control-plane/queue.service.js';
import { WorktreeLeaseService } from '../control-plane/worktree-lease.service.js';
import { RecoveryService } from '../control-plane/recovery.service.js';

@Module({
  providers: [
    ApprovalGateService,
    GitWorkspaceAdapter,
    AntigravityDiscoveryService,
    EngineeringHostService,
    AntigravityExecutorAdapter,
    CodingWorkerAdapter,
    EngineeringCodingWorker,
    AcceptanceCriteriaEngine,
    EngineeringAgentService,
    ControlPlanePersistenceService,
    EngineeringQueueService,
    WorktreeLeaseService,
    RecoveryService,
    ControlPlaneService,
    EngineeringExecutorService,
  ],
  exports: [
    EngineeringExecutorService,
    EngineeringAgentService,
    EngineeringCodingWorker,
    AcceptanceCriteriaEngine,
    GitWorkspaceAdapter,
    AntigravityDiscoveryService,
    EngineeringHostService,
    AntigravityExecutorAdapter,
    CodingWorkerAdapter,
    ApprovalGateService,
    ControlPlaneService,
    ControlPlanePersistenceService,
    EngineeringQueueService,
    WorktreeLeaseService,
    RecoveryService,
  ],
})
export class EngineeringExecutionModule {}
