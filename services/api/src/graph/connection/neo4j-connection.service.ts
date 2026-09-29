// ==========================================================
// services/api/src/graph/connection/neo4j-connection.service.ts
// Neo4j Connection, Pooling, Health & Transaction Management
// ==========================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session, ManagedTransaction } from 'neo4j-driver';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';

@Injectable()
export class Neo4jConnectionService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver | null = null;
  private readonly logger = new StructuredLogger('Neo4jConnectionService');
  private isConnected = false;
  private isOfflineMode = false;

  constructor() {
    this.initializeDriver();
  }

  private initializeDriver(): void {
    const config = loadAppConfig();
    try {
      this.driver = neo4j.driver(
        config.neo4j.uri,
        neo4j.auth.basic(config.neo4j.user, config.neo4j.password || ''),
        {
          maxConnectionLifetime: 3 * 60 * 1000,
          maxConnectionPoolSize: 20,
          connectionTimeout: 3000,
          logging: {
            level: 'warn',
            logger: (level, message) => this.logger.debug('driver', `[${level}] ${message}`),
          },
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('initializeDriver', `Neo4j driver initialization deferred: ${msg}`);
      this.isOfflineMode = true;
    }
  }

  public async onModuleInit(): Promise<void> {
    await this.verifyConnectivity();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  public async verifyConnectivity(): Promise<boolean> {
    if (!this.driver) {
      this.isConnected = false;
      this.isOfflineMode = true;
      return false;
    }

    try {
      await this.driver.verifyConnectivity();
      this.isConnected = true;
      this.isOfflineMode = false;
      this.logger.info('verifyConnectivity', 'Neo4j connection verified successfully.');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.isConnected = false;
      this.isOfflineMode = true;
      this.logger.warn(
        'verifyConnectivity',
        `Neo4j offline / unavailable (${msg}). Graceful fallback enabled.`
      );
      return false;
    }
  }

  public async healthCheck(): Promise<{
    status: 'UP' | 'DOWN';
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    if (!this.driver || this.isOfflineMode) {
      return {
        status: 'DOWN',
        latencyMs: 0,
        error: 'Neo4j driver offline or uninitialized',
      };
    }

    try {
      await this.driver.verifyConnectivity();
      return {
        status: 'UP',
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        error: msg,
      };
    }
  }

  public async executeRead<T = Record<string, unknown>>(
    cypher: string,
    params: Record<string, unknown> = {}
  ): Promise<T[]> {
    if (!this.driver || !this.isConnected) {
      return [];
    }

    const session: Session = this.driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.executeRead((tx: ManagedTransaction) =>
        tx.run(cypher, params)
      );
      return result.records.map((record) => record.toObject() as T);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('executeRead', `Neo4j read query failed: ${msg}`);
      throw err;
    } finally {
      await session.close();
    }
  }

  public async executeWrite<T = Record<string, unknown>>(
    cypher: string,
    params: Record<string, unknown> = {}
  ): Promise<T[]> {
    if (!this.driver || !this.isConnected) {
      return [];
    }

    const session: Session = this.driver.session({ defaultAccessMode: neo4j.session.WRITE });
    try {
      const result = await session.executeWrite((tx: ManagedTransaction) =>
        tx.run(cypher, params)
      );
      return result.records.map((record) => record.toObject() as T);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('executeWrite', `Neo4j write query failed: ${msg}`);
      throw err;
    } finally {
      await session.close();
    }
  }

  public async transaction<T>(work: (tx: ManagedTransaction) => Promise<T>): Promise<T | null> {
    if (!this.driver || !this.isConnected) {
      return null;
    }

    const session: Session = this.driver.session();
    try {
      return await session.executeWrite(work);
    } finally {
      await session.close();
    }
  }

  public async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.isConnected = false;
      this.logger.info('close', 'Neo4j driver connection closed');
    }
  }

  public getDriver(): Driver | null {
    return this.driver;
  }

  public isAvailable(): boolean {
    return this.isConnected && !this.isOfflineMode;
  }
}
