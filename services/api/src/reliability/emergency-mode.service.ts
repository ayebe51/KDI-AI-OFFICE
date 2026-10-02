import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { EmergencyModeState } from '@kdi/types';

export interface AccessAuditEntry {
  auditId: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class EmergencyModeService {
  private readonly logger = new StructuredLogger('EmergencyModeService');
  private readonly accessAuditLog: AccessAuditEntry[] = [];

  private state: EmergencyModeState = {
    maintenanceMode: false,
    readOnlyMode: false,
    safeMode: false,
    recoveryMode: false,
    globalAutonomyPaused: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_init',
  };

  getState(): EmergencyModeState {
    return { ...this.state };
  }

  setReadOnlyMode(enabled: boolean, operator: string, reason?: string): EmergencyModeState {
    this.state.readOnlyMode = enabled;
    this.state.readOnlyReason = reason;
    this.state.updatedAt = new Date().toISOString();
    this.state.updatedBy = operator;

    this.recordAudit('SET_READ_ONLY_MODE', operator, { enabled, reason });
    this.logger.warn(
      'setReadOnlyMode',
      `READ-ONLY MODE ${enabled ? 'ENABLED' : 'DISABLED'} by ${operator}. Reason: ${reason || 'Operator directive'}`
    );

    return this.getState();
  }

  setMaintenanceMode(enabled: boolean, operator: string, reason?: string): EmergencyModeState {
    this.state.maintenanceMode = enabled;
    this.state.maintenanceReason = reason;
    this.state.updatedAt = new Date().toISOString();
    this.state.updatedBy = operator;

    this.recordAudit('SET_MAINTENANCE_MODE', operator, { enabled, reason });
    this.logger.warn(
      'setMaintenanceMode',
      `MAINTENANCE MODE ${enabled ? 'ENABLED' : 'DISABLED'} by ${operator}. Reason: ${reason || 'Scheduled maintenance'}`
    );

    return this.getState();
  }

  setSafeMode(enabled: boolean, operator: string, reason?: string): EmergencyModeState {
    this.state.safeMode = enabled;
    this.state.safeModeReason = reason;
    this.state.updatedAt = new Date().toISOString();
    this.state.updatedBy = operator;

    this.recordAudit('SET_SAFE_MODE', operator, { enabled, reason });
    this.logger.warn(
      'setSafeMode',
      `SAFE MODE ${enabled ? 'ENABLED' : 'DISABLED'} by ${operator}. Reason: ${reason || 'Precautionary lock'}`
    );

    return this.getState();
  }

  setRecoveryMode(enabled: boolean, operator: string): EmergencyModeState {
    this.state.recoveryMode = enabled;
    this.state.recoveryOperator = enabled ? operator : undefined;
    this.state.updatedAt = new Date().toISOString();
    this.state.updatedBy = operator;

    this.recordAudit('SET_RECOVERY_MODE', operator, { enabled });
    this.logger.warn(
      'setRecoveryMode',
      `RECOVERY MODE ${enabled ? 'ENABLED' : 'DISABLED'} by ${operator}. Normal autonomous triggers halted during recovery operations.`
    );

    return this.getState();
  }

  setGlobalAutonomyPause(paused: boolean, operator: string, reason?: string): EmergencyModeState {
    this.state.globalAutonomyPaused = paused;
    this.state.updatedAt = new Date().toISOString();
    this.state.updatedBy = operator;

    this.recordAudit('SET_GLOBAL_AUTONOMY_PAUSE', operator, { paused, reason });
    this.logger.warn(
      'setGlobalAutonomyPause',
      `GLOBAL AUTONOMY PAUSE ${paused ? 'ACTIVATED' : 'DEACTIVATED'} by ${operator}. Reason: ${reason || 'N/A'}`
    );

    return this.getState();
  }

  assertMutationAllowed(operationName: string): void {
    if (this.state.readOnlyMode) {
      throw new Error(`MUTATION_BLOCKED: System is in READ-ONLY MODE. Cannot execute "${operationName}".`);
    }
    if (this.state.maintenanceMode) {
      throw new Error(`MUTATION_BLOCKED: System is in MAINTENANCE MODE. Cannot execute "${operationName}".`);
    }
  }

  assertSafeModeAllowed(riskLevel: string): void {
    if (this.state.safeMode && (riskLevel === 'HIGH' || riskLevel === 'CRITICAL')) {
      throw new Error(`ACTION_BLOCKED: System is in SAFE MODE. High-risk mutations are strictly disabled.`);
    }
  }

  recordAudit(action: string, performedBy: string, details?: Record<string, unknown>): void {
    const entry: AccessAuditEntry = {
      auditId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      performedBy,
      timestamp: new Date().toISOString(),
      details,
    };
    this.accessAuditLog.unshift(entry);
    if (this.accessAuditLog.length > 200) {
      this.accessAuditLog.pop();
    }
  }

  getAuditLog(): AccessAuditEntry[] {
    return this.accessAuditLog;
  }
}
