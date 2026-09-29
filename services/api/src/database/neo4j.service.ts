import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';
import neo4j, { Driver } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver | null = null;
  private readonly logger = new StructuredLogger('Neo4jService');
  private isConnected = false;

  constructor() {
    const config = loadAppConfig();
    try {
      this.driver = neo4j.driver(
        config.neo4j.uri,
        neo4j.auth.basic(config.neo4j.user, config.neo4j.password || ''),
        { maxConnectionLifetime: 3 * 60 * 1000, maxConnectionPoolSize: 10, connectionTimeout: 3000 }
      );
    } catch (err: unknown) {
      this.logger.warn('constructor', 'Neo4j driver initialization deferred');
    }
  }

  async onModuleInit() {
    if (!this.driver) return;
    try {
      await this.driver.verifyConnectivity();
      this.isConnected = true;
      this.logger.info('onModuleInit', 'Connected to Neo4j database successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('onModuleInit', `Neo4j connection probe skipped / offline: ${msg}`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
    }
  }

  async checkHealth(): Promise<{ status: 'UP' | 'DOWN'; latencyMs: number; message?: string }> {
    const start = Date.now();
    if (!this.driver) {
      return { status: 'DOWN', latencyMs: 0, message: 'Neo4j driver uninitialized' };
    }
    try {
      await this.driver.verifyConnectivity();
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'DOWN', latencyMs: Date.now() - start, message: msg };
    }
  }

  getDriver(): Driver | null {
    return this.driver;
  }
}
