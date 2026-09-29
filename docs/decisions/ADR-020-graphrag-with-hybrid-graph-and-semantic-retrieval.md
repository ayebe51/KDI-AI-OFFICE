# ADR-020: GraphRAG with Hybrid Graph and Semantic Retrieval

## Status
Accepted

## Context
Standard Retrieval-Augmented Generation (Naive Vector RAG) relies solely on cosine similarity between prompt embeddings and chunked document embeddings. In complex enterprise engineering environments, naive vector RAG suffers from critical limitations:
1. **Lack of Topological Awareness:** Naive vector search cannot follow structural links, such as finding which ADR decision caused an architectural refactoring that touched specific files and resulted in passing unit tests.
2. **Hallucination of Connections:** LLMs guess connections between semantically similar but structurally unrelated entities.
3. **Absence of Provenance:** Answers cannot cite explicit entity IDs or verified relationships.

## Decision
We implement **Hybrid GraphRAG** combining structural graph topology traversal and dense vector similarity:
1. **Retrieval Pipeline:**
   - **Semantic Retrieval (`SemanticRetriever`):** Vector search over indexed graph nodes (`Memory`, `Decision`, `Document`) utilizing 384-dimensional dense embeddings with score normalization [0, 1].
   - **Graph Retrieval (`GraphRetriever`):** Bounded k-hop neighborhood traversal (default 1–3 hops, max 4) around identified root entities (`Project`, `Task`, `Execution`).
   - **Normalized Hybrid Fusion (`HybridGraphRetriever`):** Combined score formula:
     `score = (alpha * semanticScore + (1 - alpha) * graphScore + recencyBonus) * confidenceWeight`
     where alpha defaults to 0.5, recency adds up to +10% for recent verified items, and confidence weights range from 1.0 (`VERIFIED`) to 0.1 (`STALE`).
2. **Context Engineering (`GraphContextBuilder`):**
   - Strictly enforces token budgets (e.g. 2,500–3,000 tokens) with priority tiering: `Working Memory (Priority 1) > Project Memory (Priority 2) > Organizational Memory (Priority 3)`.
   - Binds untrusted graph memories within explicit `<!-- UNTRUSTED_GRAPH_KNOWLEDGE_BOUNDARY -->` markdown comments to defend against prompt injection.
3. **Anti-Hallucination & Citable Output Contract:**
   - If evidence in the graph is insufficient, the system explicitly returns `INSUFFICIENT_CONTEXT` rather than fabricating claims.
   - Answers cite specific node IDs (e.g. `[DEC-018]`, `[TSK-101]`) with verified support statuses (`SUPPORTED`, `INFERRED`, `INSUFFICIENT_CONTEXT`).

## Consequences
- **Positive:** Zero hallucination on project facts; explicit source attribution; strict prompt injection defense; resilient deterministic synthesis when external LLMs are unreachable.
- **Trade-offs:** Requires indexing embeddings on memory nodes; traversal depth must be capped to prevent graph explosion.
