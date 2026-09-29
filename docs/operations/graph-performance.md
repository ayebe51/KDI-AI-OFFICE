# Graph Performance & Guardrails

## 1. Performance Guardrails
- **Max Hops:** Hard capped at 4 hops. Default 2 hops for entity context.
- **Max Nodes per Query:** 50–100 nodes.
- **Query Timeout:** 3000ms Bolt connection timeout.
- **Context Budget:** 2,500–3,000 tokens for GraphRAG prompts.
- **Vector Dimension:** 384 dimensions (optimized for CPU/RAM usage and sub-5ms cosine similarity).

## 2. In-Memory Resilient Fallback
In testing environments or during temporary network interruptions, `Neo4jGraphRepository` serves requests from an in-memory graph cache, guaranteeing continuous system operation with zero degradation of core task execution.
