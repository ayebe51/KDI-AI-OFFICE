import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';
import pg from 'pg';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private pool: pg.Pool;
  private readonly logger = new StructuredLogger('PostgresService');
  private isConnected = false;

  constructor() {
    const config = loadAppConfig();
    this.pool = new pg.Pool({
      connectionString: config.postgres.url,
      max: 10,
      connectionTimeoutMillis: 3000,
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      this.logger.info('onModuleInit', 'Connected to PostgreSQL database successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('onModuleInit', `PostgreSQL connection probe skipped / offline: ${msg}`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async checkHealth(): Promise<{ status: 'UP' | 'DOWN'; latencyMs: number; message?: string }> {
    const start = Date.now();
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'DOWN', latencyMs: Date.now() - start, message: msg };
    }
  }

  getPool(): pg.Pool {
    return this.pool;
  }
}
