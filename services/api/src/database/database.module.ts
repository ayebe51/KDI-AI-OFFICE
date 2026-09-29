import { Module, Global } from '@nestjs/common';
import { PostgresService } from './postgres.service.js';
import { RedisService } from './redis.service.js';
import { Neo4jService } from './neo4j.service.js';

@Global()
@Module({
  providers: [PostgresService, RedisService, Neo4jService],
  exports: [PostgresService, RedisService, Neo4jService],
})
export class DatabaseModule {}
