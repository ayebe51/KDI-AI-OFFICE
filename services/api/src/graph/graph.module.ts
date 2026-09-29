// ==========================================================
// services/api/src/graph/graph.module.ts
// NestJS Module for Graph Memory, Intelligence & GraphRAG
// ==========================================================

import { Module } from '@nestjs/common';
import { Neo4jConnectionService } from './connection/neo4j-connection.service.js';
import { GraphSchemaMigrator } from './schema/graph-schema.migrator.js';
import { Neo4jGraphRepository } from './repository/neo4j-graph.repository.js';
import { EmbeddingService } from './embedding/embedding.service.js';
import { GraphRetriever } from './retrieval/graph.retriever.js';
import { SemanticRetriever } from './retrieval/semantic.retriever.js';
import { HybridGraphRetriever } from './retrieval/hybrid-graph.retriever.js';
import { GraphContextBuilder } from './context/graph-context.builder.js';
import { GraphRAGService } from './graphrag/graphrag.service.js';
import { MemoryService } from './memory/memory.service.js';
import { DecisionService } from './memory/decision.service.js';
import { MemoryExtractor } from './memory/memory.extractor.js';
import { GraphEventConsumer } from './ingestion/graph-event.consumer.js';
import { GraphRebuildService } from './ingestion/graph-rebuild.service.js';
import { GraphController } from './graph.controller.js';
import { LLMModule } from '../llm/llm.module.js';
import { WebSocketModule } from '../websocket/websocket.module.js';

@Module({
  imports: [LLMModule, WebSocketModule],
  controllers: [GraphController],
  providers: [
    Neo4jConnectionService,
    GraphSchemaMigrator,
    Neo4jGraphRepository,
    EmbeddingService,
    GraphRetriever,
    SemanticRetriever,
    HybridGraphRetriever,
    GraphContextBuilder,
    GraphRAGService,
    MemoryService,
    DecisionService,
    MemoryExtractor,
    GraphEventConsumer,
    GraphRebuildService,
  ],
  exports: [
    Neo4jConnectionService,
    GraphSchemaMigrator,
    Neo4jGraphRepository,
    EmbeddingService,
    GraphRetriever,
    SemanticRetriever,
    HybridGraphRetriever,
    GraphContextBuilder,
    GraphRAGService,
    MemoryService,
    DecisionService,
    MemoryExtractor,
    GraphEventConsumer,
    GraphRebuildService,
  ],
})
export class GraphModule {}
