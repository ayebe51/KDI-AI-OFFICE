// ==========================================================
// services/api/src/engineering/host/remote-execution-channel.service.ts
// Authenticated Execution Channel with Replay Protection & Fault Simulation (§5, §30, §31, §36)
// ==========================================================

import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  ExecutionRequestPayload,
  ExecutionResponsePayload,
} from './host.types.js';

export interface ChannelTransportHandler {
  (request: ExecutionRequestPayload): Promise<ExecutionResponsePayload>;
}

@Injectable()
export class RemoteExecutionChannelService {
  private readonly logger = new StructuredLogger('RemoteExecutionChannelService');

  private readonly sharedSecret: string;
  private readonly seenNonces = new Set<string>();
  private transportHandler?: ChannelTransportHandler;

  // Simulation flags for testing network and executor failures (§30 & §31)
  private simulateNetworkLoss = false;
  private simulateTimeout = false;
  private simulateProcessFailure = false;

  constructor(secretKey = 'kdi_exec_token_default_secret') {
    this.sharedSecret = secretKey;
  }

  /**
   * Set custom transport handler (e.g. HTTP, WebSocket or direct agent dispatch)
   */
  public setTransportHandler(handler: ChannelTransportHandler): void {
    this.transportHandler = handler;
  }

  /**
   * Set simulated failure modes for testing resilience
   */
  public setSimulateNetworkLoss(enable: boolean): void {
    this.simulateNetworkLoss = enable;
  }

  public setSimulateTimeout(enable: boolean): void {
    this.simulateTimeout = enable;
  }

  public setSimulateProcessFailure(enable: boolean): void {
    this.simulateProcessFailure = enable;
  }

  /**
   * Sign an execution request payload using HMAC-SHA256
   */
  public signRequest(payload: Omit<ExecutionRequestPayload, 'authSignature'>): ExecutionRequestPayload {
    const rawData = `${payload.requestId}:${payload.taskId}:${payload.nonce}:${payload.timestamp}:${payload.project}`;
    const hmac = crypto.createHmac('sha256', this.sharedSecret);
    hmac.update(rawData);
    const signature = hmac.digest('hex');

    return {
      ...payload,
      authSignature: signature,
    };
  }

  /**
   * Verify authentication signature and replay defense (§5 & §32)
   */
  public verifyRequest(request: ExecutionRequestPayload): {
    valid: boolean;
    reason?: string;
  } {
    // 1. Replay defense: check if nonce was already processed
    if (this.seenNonces.has(request.nonce)) {
      this.logger.warn('verifyRequest', `Replay attack detected: Nonce ${request.nonce} already used`);
      return { valid: false, reason: 'Replay protection: Nonce already used (§5)' };
    }

    // 2. Timestamp freshness check (allow max 60s skew)
    const now = Date.now();
    const timeDelta = Math.abs(now - request.timestamp);
    if (timeDelta > 60000) {
      this.logger.warn('verifyRequest', `Request timestamp expired or skewed by ${timeDelta}ms`);
      return { valid: false, reason: 'Request timestamp expired or clock skew exceeded 60s' };
    }

    // 3. Signature verification
    if (!request.authSignature) {
      return { valid: false, reason: 'Missing authorization signature' };
    }

    const rawData = `${request.requestId}:${request.taskId}:${request.nonce}:${request.timestamp}:${request.project}`;
    const hmac = crypto.createHmac('sha256', this.sharedSecret);
    hmac.update(rawData);
    const expectedSignature = hmac.digest('hex');

    if (request.authSignature !== expectedSignature) {
      this.logger.warn('verifyRequest', `Signature mismatch for request ${request.requestId}`);
      return { valid: false, reason: 'Invalid authentication signature (§32)' };
    }

    // Mark nonce as used
    this.seenNonces.add(request.nonce);

    // Prune seen nonces if map grows excessively
    if (this.seenNonces.size > 10000) {
      const iterator = this.seenNonces.values();
      for (let i = 0; i < 2000; i++) {
        this.seenNonces.delete(iterator.next().value!);
      }
    }

    return { valid: true };
  }

  /**
   * Send execution request across the secure channel to the Windows Execution Host (§5)
   */
  public async dispatchExecution(
    request: ExecutionRequestPayload
  ): Promise<ExecutionResponsePayload> {
    const startTime = Date.now();

    // 1. Check network failure simulation (§31)
    if (this.simulateNetworkLoss) {
      this.logger.error('dispatchExecution', `Simulated network failure: Docker <-> Windows host communication severed`);
      const error = new Error('HOST_CONNECTION_LOST: Failed to reach Windows Execution Host via secure channel');
      (error as any).code = 'HOST_CONNECTION_LOST';
      throw error;
    }

    // 2. Check timeout simulation
    if (this.simulateTimeout) {
      this.logger.error('dispatchExecution', `Simulated timeout: Windows host did not reply within ${request.timeoutMs}ms`);
      const error = new Error('ANTIGRAVITY_TIMEOUT: Execution timed out on Windows host');
      (error as any).code = 'ANTIGRAVITY_TIMEOUT';
      throw error;
    }

    // 3. Check process failure simulation (§30)
    if (this.simulateProcessFailure) {
      this.logger.warn('dispatchExecution', `Simulated Antigravity process crash on Windows host`);
      return {
        requestId: request.requestId,
        taskId: request.taskId,
        hostId: 'WINDOWS-HOST-01',
        status: 'FAILED',
        success: false,
        stdout: '',
        stderr: 'Simulated process crash: agy.exe exited unexpectedly with code 137',
        exitCode: 137,
        changedFiles: [],
        verification: {
          gitStatusClean: true,
          testsVerified: false,
          buildVerified: false,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
        },
        durationMs: Date.now() - startTime,
        error: 'Simulated process crash: agy.exe exited unexpectedly with code 137',
        timestamp: Date.now(),
      };
    }

    // 4. Verify request signature before transmission
    const verification = this.verifyRequest(request);
    if (!verification.valid) {
      throw new Error(`Execution request rejected by security policy: ${verification.reason}`);
    }

    if (!this.transportHandler) {
      throw new Error('No transport handler registered for RemoteExecutionChannelService');
    }

    return this.transportHandler(request);
  }
}
