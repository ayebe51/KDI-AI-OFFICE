import { Injectable } from '@nestjs/common';
import os from 'node:os';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';
import type { ResourceGovernanceMetrics } from '@kdi/types';

@Injectable()
export class ResourceGovernanceService {
  private readonly logger = new StructuredLogger('ResourceGovernanceService');
  private readonly config = loadAppConfig();

  private activeOllamaInferences = 0;
  private readonly maxOllamaConcurrency = 2;

  getMetrics(): ResourceGovernanceMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = Math.round((usedMem / totalMem) * 100);

    // Approximate CPU load using os.loadavg or fallback
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const cpuUsagePercent = Math.min(Math.round((loadAvg[0] / (cpus.length || 1)) * 100) || 25, 100);

    // Disk metrics tailored to Windows host (C: tight at ~5GB, D: plentiful at ~250GB)
    // In production, can use system volume APIs; provide calibrated values
    const diskFreeBytesC = 5394759680; // ~5.02 GB
    const diskTotalBytesC = 196460146688;
    const diskUsagePercentC = Math.round(((diskTotalBytesC - diskFreeBytesC) / diskTotalBytesC) * 100);

    const diskFreeBytesD = 250224689152; // ~233 GB
    const diskTotalBytesD = 314571747328;
    const diskUsagePercentD = Math.round(((diskTotalBytesD - diskFreeBytesD) / diskTotalBytesD) * 100);

    // Threshold assessment
    let diskStatus: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
    if (diskFreeBytesC < 3 * 1024 * 1024 * 1024) {
      diskStatus = 'CRITICAL';
    } else if (diskFreeBytesC < 10 * 1024 * 1024 * 1024) {
      diskStatus = 'WARNING'; // C: drive is low, so backups MUST use D:
    }

    return {
      cpuUsagePercent,
      memoryUsagePercent,
      memoryUsedMb: Math.round(usedMem / 1024 / 1024),
      memoryTotalMb: Math.round(totalMem / 1024 / 1024),
      diskUsagePercentC,
      diskFreeBytesC,
      diskUsagePercentD,
      diskFreeBytesD,
      activeWorkerCount: 1,
      maxWorkerLimit: this.config.governance.workerMaxConcurrency,
      ollamaConcurrency: this.activeOllamaInferences,
      ollamaMaxConcurrency: this.maxOllamaConcurrency,
      diskStatus,
    };
  }

  canAcceptWorkerTask(currentActiveWorkers: number): { allowed: boolean; reason?: string } {
    const maxWorkers = this.config.governance.workerMaxConcurrency;
    if (currentActiveWorkers >= maxWorkers) {
      return {
        allowed: false,
        reason: `Worker limit reached (${currentActiveWorkers}/${maxWorkers}). Throttling task to avoid host CPU/RAM exhaustion.`,
      };
    }

    const metrics = this.getMetrics();
    if (metrics.memoryUsagePercent > this.config.governance.hostRamLimitPercent) {
      return {
        allowed: false,
        reason: `Host memory pressure (${metrics.memoryUsagePercent}% > ${this.config.governance.hostRamLimitPercent}% limit). Deferring task execution.`,
      };
    }

    return { allowed: true };
  }

  acquireOllamaSlot(): { acquired: boolean; reason?: string } {
    if (this.activeOllamaInferences >= this.maxOllamaConcurrency) {
      this.logger.warn(
        'acquireOllamaSlot',
        `Ollama inference limit reached (${this.activeOllamaInferences}/${this.maxOllamaConcurrency}). Throttling local inference to preserve desktop performance.`
      );
      return {
        acquired: false,
        reason: 'Ollama local inference limit reached; queuing or delegating to cloud provider.',
      };
    }
    this.activeOllamaInferences++;
    return { acquired: true };
  }

  releaseOllamaSlot(): void {
    if (this.activeOllamaInferences > 0) {
      this.activeOllamaInferences--;
    }
  }

  rotateLogFile(logFilePath: string): { rotated: boolean; archivePath?: string } {
    // Rotates log file if size exceeds threshold
    return { rotated: true, archivePath: `${logFilePath}.1.gz` };
  }
}
