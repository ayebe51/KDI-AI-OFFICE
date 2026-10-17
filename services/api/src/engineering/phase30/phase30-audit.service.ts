// ==========================================================
// services/api/src/engineering/phase30/phase30-audit.service.ts
// Phase 30.2: Persistent Audit Ledger with SHA-256 Hash Chaining & Secret Redaction (§13)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Injectable, Optional } from '@nestjs/common';
import type { AuditEvent, DeploymentEnvironment } from './phase30.types.js';

export interface AuditServiceConfig {
  ledgerFilePath?: string;
  enableDiskPersistence?: boolean;
}

@Injectable()
export class Phase30AuditService {
  private readonly events: AuditEvent[] = [];
  private readonly ledgerFilePath: string;
  private readonly enableDiskPersistence: boolean;
  private lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(@Optional() config?: AuditServiceConfig) {
    this.enableDiskPersistence = config?.enableDiskPersistence ?? true;
    this.ledgerFilePath =
      config?.ledgerFilePath || path.join(os.tmpdir(), 'kdi-phase30-audit-ledger.jsonl');

    if (this.enableDiskPersistence) {
      this.loadFromDisk();
    }
  }

  /**
   * Secret Sanitizer: Redacts passwords, tokens, private keys (§13)
   */
  public sanitize(text: string): string {
    return text
      .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+ PRIVATE KEY-----/gi, '[REDACTED_PRIVATE_KEY]')
      .replace(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[REDACTED_JWT_TOKEN]')
      .replace(/(password|secret|token|apiKey|passwd)\s*[:=]\s*["']?[^\s,"']+["']?/gi, '$1=[REDACTED]');
  }

  /**
   * Append audit event with cryptographic hash chaining (§13)
   */
  public recordEvent(params: {
    phase: string;
    action: string;
    project: 'SIMMACI' | 'ILMORA' | 'KDI';
    service: string;
    environment: DeploymentEnvironment;
    releaseId?: string;
    actor: string;
    details: string;
  }): AuditEvent {
    const eventId = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const sanitizedDetails = this.sanitize(params.details);

    const rawPayload = `${this.lastHash}|${eventId}|${timestamp}|${params.phase}|${params.action}|${params.project}|${params.service}|${params.environment}|${params.releaseId || ''}|${params.actor}|${sanitizedDetails}`;
    const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const event: AuditEvent = {
      eventId,
      previousHash: this.lastHash,
      hash,
      timestamp,
      phase: params.phase,
      action: params.action,
      project: params.project,
      service: params.service,
      environment: params.environment,
      releaseId: params.releaseId,
      actor: params.actor,
      details: sanitizedDetails,
      sanitized: true,
    };

    this.events.push(event);
    this.lastHash = hash;

    if (this.enableDiskPersistence) {
      try {
        fs.appendFileSync(this.ledgerFilePath, JSON.stringify(event) + '\n', 'utf-8');
      } catch {
        // Ignore write failures in sandboxes
      }
    }

    return event;
  }

  /**
   * Cryptographically verify ledger integrity (§13)
   */
  public verifyLedgerIntegrity(): { isValid: boolean; errorIndex?: number; reason?: string } {
    let prev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (e.previousHash !== prev) {
        return {
          isValid: false,
          errorIndex: i,
          reason: `Broken hash chain at event index ${i}: expected prevHash ${prev}, got ${e.previousHash}`,
        };
      }
      const rawPayload = `${e.previousHash}|${e.eventId}|${e.timestamp}|${e.phase}|${e.action}|${e.project}|${e.service}|${e.environment}|${e.releaseId || ''}|${e.actor}|${e.details}`;
      const recomputed = crypto.createHash('sha256').update(rawPayload).digest('hex');
      if (e.hash !== recomputed) {
        return {
          isValid: false,
          errorIndex: i,
          reason: `Digest mismatch at event index ${i}: expected ${recomputed}, found ${e.hash}`,
        };
      }
      prev = e.hash;
    }
    return { isValid: true };
  }

  public getEvents(): AuditEvent[] {
    return [...this.events];
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.ledgerFilePath)) {
        const content = fs.readFileSync(this.ledgerFilePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const ev = JSON.parse(line) as AuditEvent;
            this.events.push(ev);
            this.lastHash = ev.hash;
          } catch {}
        }
      }
    } catch {}
  }

  public clear(): void {
    this.events.length = 0;
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    if (this.enableDiskPersistence && fs.existsSync(this.ledgerFilePath)) {
      try {
        fs.unlinkSync(this.ledgerFilePath);
      } catch {}
    }
  }
}
