import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type { DegradedModeState } from '@kdi/types';

@Injectable()
export class DegradedModeService {
  private readonly logger = new StructuredLogger('DegradedModeService');

  private state: DegradedModeState = {
    neo4jDegraded: false,
    graphRagAvailable: true,
    ollamaDegraded: false,
    aiRouterFallbackActive: false,
    antigravityDegraded: false,
    engineeringInWaitingProvider: false,
    networkDegraded: false,
    localOperationsIsolated: false,
    notes: [],
  };

  getState(): DegradedModeState {
    return { ...this.state };
  }

  handleNeo4jFailure(failed = true): DegradedModeState {
    this.state.neo4jDegraded = failed;
    this.state.graphRagAvailable = !failed;
    if (failed) {
      this.logger.warn(
        'handleNeo4jFailure',
        'Neo4j is unavailable. Degraded mode active: GraphRAG and semantic graph queries suspended; core CRUD & task execution remain healthy.'
      );
      this.addNote('Neo4j unavailable: GraphRAG suspended; relational operations active.');
    } else {
      this.removeNote('Neo4j unavailable');
    }
    return this.getState();
  }

  handleOllamaFailure(failed = true): DegradedModeState {
    this.state.ollamaDegraded = failed;
    this.state.aiRouterFallbackActive = failed;
    if (failed) {
      this.logger.warn(
        'handleOllamaFailure',
        'Ollama local inference offline. AI Router fallback active: routing tasks to cloud providers (Gemini/Groq/OpenRouter).'
      );
      this.addNote('Ollama offline: cloud AI router fallback active.');
    } else {
      this.removeNote('Ollama offline');
    }
    return this.getState();
  }

  handleAntigravityFailure(failed = true): DegradedModeState {
    this.state.antigravityDegraded = failed;
    this.state.engineeringInWaitingProvider = failed;
    if (failed) {
      this.logger.warn(
        'handleAntigravityFailure',
        'Antigravity engineering layer offline. Engineering tasks transition to WAITING_PROVIDER state instead of failing permanently.'
      );
      this.addNote('Antigravity offline: tasks parked in WAITING_PROVIDER.');
    } else {
      this.removeNote('Antigravity offline');
    }
    return this.getState();
  }

  handleNetworkFailure(failed = true): DegradedModeState {
    this.state.networkDegraded = failed;
    this.state.localOperationsIsolated = failed;
    if (failed) {
      this.logger.warn(
        'handleNetworkFailure',
        'Internet connectivity lost. Local isolated operation mode active: PostgreSQL, Redis, Neo4j, Ollama continue normally; cloud LLMs and public frontend suspended.'
      );
      this.addNote('Internet down: isolated local operation active.');
    } else {
      this.removeNote('Internet down');
    }
    return this.getState();
  }

  private addNote(note: string): void {
    if (!this.state.notes.includes(note)) {
      this.state.notes.push(note);
    }
  }

  private removeNote(prefix: string): void {
    this.state.notes = this.state.notes.filter((n) => !n.startsWith(prefix));
  }

  reset(): void {
    this.state = {
      neo4jDegraded: false,
      graphRagAvailable: true,
      ollamaDegraded: false,
      aiRouterFallbackActive: false,
      antigravityDegraded: false,
      engineeringInWaitingProvider: false,
      networkDegraded: false,
      localOperationsIsolated: false,
      notes: [],
    };
  }
}
