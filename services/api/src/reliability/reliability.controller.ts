import { Controller, Get, Post, Body, Param, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ServiceRegistryService } from './service-registry.service.js';
import { HealthMonitorService } from './health-monitor.service.js';
import { BackupService } from './backup.service.js';
import { RestoreTestService } from './restore-test.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { QueueDurabilityService } from './queue-durability.service.js';
import { EmergencyModeService } from './emergency-mode.service.js';
import { ObservabilityService } from './observability.service.js';
import { ResourceGovernanceService } from './resource-governance.service.js';
import { SecurityHardeningService } from './security-hardening.service.js';
import { DriftDetectionService } from './drift-detection.service.js';
import { DegradedModeService } from './degraded-mode.service.js';

@Controller('reliability')
export class ReliabilityController {
  constructor(
    private readonly serviceRegistry: ServiceRegistryService,
    private readonly healthMonitor: HealthMonitorService,
    private readonly backupService: BackupService,
    private readonly restoreTestService: RestoreTestService,
    private readonly reconciliationService: ReconciliationService,
    private readonly queueDurability: QueueDurabilityService,
    private readonly emergencyMode: EmergencyModeService,
    private readonly observabilityService: ObservabilityService,
    private readonly resourceGovernance: ResourceGovernanceService,
    private readonly securityHardening: SecurityHardeningService,
    private readonly driftDetection: DriftDetectionService,
    private readonly degradedMode: DegradedModeService
  ) {}

  @Get('services')
  getServices() {
    return this.serviceRegistry.getSnapshot();
  }

  @Get('health/10')
  async get10SubsystemsHealth() {
    return this.healthMonitor.get10SubsystemsHealth();
  }

  @Get('health/liveness')
  getLiveness(@Res() res: Response) {
    const probe = this.healthMonitor.getLiveness();
    return res.status(probe.alive ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(probe);
  }

  @Get('health/readiness')
  async getReadiness(@Res() res: Response) {
    const probe = await this.healthMonitor.getReadiness();
    return res.status(probe.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(probe);
  }

  @Get('health/startup')
  getStartup(@Res() res: Response) {
    const probe = this.healthMonitor.getStartup();
    return res.status(probe.initialized ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(probe);
  }

  @Get('backups')
  getAllBackups() {
    return this.backupService.getAllBackups();
  }

  @Post('backups')
  async createBackup(@Body() body: { database?: 'POSTGRESQL' | 'NEO4J' | 'REDIS'; tier?: 'DAILY' | 'WEEKLY' | 'MONTHLY' }) {
    this.emergencyMode.assertMutationAllowed('createBackup');
    const database = body.database || 'POSTGRESQL';
    const tier = body.tier || 'DAILY';
    return this.backupService.createBackup(database, tier);
  }

  @Post('backups/:backupId/restore-test')
  async testRestore(@Param('backupId') backupId: string) {
    return this.restoreTestService.testRestore(backupId);
  }

  @Get('rpo-rto')
  getRPORTO() {
    return this.backupService.getRPORTOStatus();
  }

  @Get('reconciliations')
  getReconciliations() {
    return this.reconciliationService.getRecentReports();
  }

  @Post('reconciliations')
  async triggerReconciliation(@Body() body: { type: any; autoRemediate?: boolean }) {
    this.emergencyMode.assertMutationAllowed('triggerReconciliation');
    return this.reconciliationService.runReconciliation(body.type, body.autoRemediate);
  }

  @Get('dlq')
  getDLQ() {
    return this.queueDurability.getDLQRecords();
  }

  @Post('dlq/:dlqId/replay')
  async replayDLQItem(@Param('dlqId') dlqId: string) {
    this.emergencyMode.assertMutationAllowed('replayDLQItem');
    return this.queueDurability.replayEvent(dlqId);
  }

  @Get('emergency')
  getEmergencyState() {
    return this.emergencyMode.getState();
  }

  @Post('emergency/read-only')
  setReadOnly(@Body() body: { enabled: boolean; operator: string; reason?: string }) {
    return this.emergencyMode.setReadOnlyMode(body.enabled, body.operator || 'operator', body.reason);
  }

  @Post('emergency/maintenance')
  setMaintenance(@Body() body: { enabled: boolean; operator: string; reason?: string }) {
    return this.emergencyMode.setMaintenanceMode(body.enabled, body.operator || 'operator', body.reason);
  }

  @Post('emergency/safe-mode')
  setSafeMode(@Body() body: { enabled: boolean; operator: string; reason?: string }) {
    return this.emergencyMode.setSafeMode(body.enabled, body.operator || 'operator', body.reason);
  }

  @Post('emergency/recovery-mode')
  setRecoveryMode(@Body() body: { enabled: boolean; operator: string }) {
    return this.emergencyMode.setRecoveryMode(body.enabled, body.operator || 'operator');
  }

  @Get('scorecard')
  getOperationalScorecard() {
    return this.driftDetection.generateOperationalScorecard();
  }

  @Get('drift')
  getDriftReports() {
    return {
      architecture: this.driftDetection.detectArchitectureDrift(),
      configuration: this.driftDetection.detectConfigurationDrift(),
      security: this.driftDetection.detectSecurityDrift(),
    };
  }

  @Get('governance')
  getResourceGovernance() {
    return this.resourceGovernance.getMetrics();
  }

  @Get('observability/alerts')
  getAlerts() {
    return this.observabilityService.getAllAlerts();
  }

  @Post('observability/alerts/:alertId/ack')
  ackAlert(@Param('alertId') alertId: string, @Body() body: { operator: string }) {
    const success = this.observabilityService.acknowledgeAlert(alertId, body.operator || 'operator');
    return { success };
  }

  @Get('observability/slos')
  getSLOs() {
    return this.observabilityService.getSLOs();
  }

  @Get('degraded')
  getDegradedState() {
    return this.degradedMode.getState();
  }

  @Get('manifest')
  getManifest() {
    return this.securityHardening.generateDeploymentManifest();
  }
}
