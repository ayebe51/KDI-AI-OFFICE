// ==========================================================
// services/api/src/graph/embedding/embedding-provider.interface.ts
// Embedding Provider Contract for GraphRAG & Semantic Retrieval
// ==========================================================

export interface EmbeddingModelInfo {
  provider: 'ollama' | 'gemini' | 'local_deterministic';
  model: string;
  dimension: number;
  version: string;
}

export interface EmbeddingProvider {
  /**
   * Compute normalized dense vector embedding for single text.
   */
  embedText(text: string): Promise<number[]>;

  /**
   * Compute batch embeddings.
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Vector dimensions (e.g., 384 or 768).
   */
  getDimension(): number;

  /**
   * Model metadata.
   */
  getModelInfo(): EmbeddingModelInfo;
}
