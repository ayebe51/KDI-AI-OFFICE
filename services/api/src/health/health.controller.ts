import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PostgresService } from '../database/postgres.service.js';
import { RedisService } from '../database/redis.service.js';
import { Neo4jService } from '../database/neo4j.service.js';
import { loadAppConfig } from '@kdi/config';
import type { AggregateHealthResponse } from '@kdi/types';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly postgresService: PostgresService,
    private readonly redisService: RedisService,
    private readonly neo4jService: Neo4jService
  ) {}

  @Get()
  async getAggregateHealth(@Res() res: Response) {
    const config = loadAppConfig();
    const [pgHealth, redisHealth, neo4jHealth] = await Promise.all([
      this.postgresService.checkHealth(),
      this.redisService.checkHealth(),
      this.neo4jService.checkHealth(),
    ]);

    const isAllUp = pgHealth.status === 'UP' && redisHealth.status === 'UP' && neo4jHealth.status === 'UP';
    const isAnyUp = pgHealth.status === 'UP' || redisHealth.status === 'UP' || neo4jHealth.status === 'UP';

    const overallStatus = isAllUp ? 'HEALTHY' : isAnyUp ? 'DEGRADED' : 'DOWN';

    const response: AggregateHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: config.env,
      subsystems: {
        postgres: pgHealth,
        redis: redisHealth,
        neo4j: neo4jHealth,
      },
    };

    // In dev mode, return 200 even if some containers are optional; in prod return appropriate status
    const httpStatus = overallStatus === 'DOWN' && config.env === 'production' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
    return res.status(httpStatus).json(response);
  }

  @Get('postgres')
  async getPostgresHealth(@Res() res: Response) {
    const health = await this.postgresService.checkHealth();
    const status = health.status === 'UP' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(health);
  }

  @Get('redis')
  async getRedisHealth(@Res() res: Response) {
    const health = await this.redisService.checkHealth();
    const status = health.status === 'UP' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(health);
  }

  @Get('neo4j')
  async getNeo4jHealth(@Res() res: Response) {
    const health = await this.neo4jService.checkHealth();
    const status = health.status === 'UP' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(health);
  }
}
