import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { loadAppConfig } from '@kdi/config';
import { StructuredLogger } from '@kdi/shared';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new StructuredLogger('RedisService');
  private isConnected = false;

  constructor() {
    const config = loadAppConfig();
    try {
      this.client = new Redis(config.redis.url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
      });
    } catch (err: unknown) {
      this.logger.warn('constructor', 'Redis initialization deferred');
    }
  }

  async onModuleInit() {
    if (!this.client) return;
    try {
      await this.client.connect();
      await this.client.ping();
      this.isConnected = true;
      this.logger.info('onModuleInit', 'Connected to Redis server successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('onModuleInit', `Redis connection probe skipped / offline: ${msg}`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async checkHealth(): Promise<{ status: 'UP' | 'DOWN'; latencyMs: number; message?: string }> {
    const start = Date.now();
    if (!this.client) {
      return { status: 'DOWN', latencyMs: 0, message: 'Redis client uninitialized' };
    }
    try {
      if (this.client.status !== 'ready') {
        await this.client.connect();
      }
      await this.client.ping();
      return { status: 'UP', latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'DOWN', latencyMs: Date.now() - start, message: msg };
    }
  }

  getClient(): Redis | null {
    return this.client;
  }
}
