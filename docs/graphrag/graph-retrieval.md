# Graph Retrieval & Hybrid Scoring

## 1. Retrieval Strategies

### A. Graph Topology Retrieval (`GraphRetriever`)
- Executes bounded k-hop neighborhood walks (1–3 hops, hard-capped at 4).
- Traverses explicit domain relationships:
  - `Project -HAS_TASK-> Task`
  - `Task -DEPENDS_ON-> Task`
  - `Agent -ASSIGNED_TO-> Task`
  - `Project -HAS_DECISION-> Decision`
  - `Execution -CHANGED-> File`

### B. Vector Semantic Retrieval (`SemanticRetriever`)
- Performs cosine similarity matching against 384-dimensional dense vectors.
- Matches user query concepts against indexed memories and decision titles.
- Normalizes raw cosine scores into a clean $[0, 1]$ interval.

### C. Hybrid Rank Fusion (`HybridGraphRetriever`)
- Fuses structural proximity and semantic similarity:
  $$\text{Score} = \left(\alpha \cdot \text{Score}_{\text{semantic}} + (1 - \alpha) \cdot \text{Score}_{\text{graph}} + \text{Bonus}_{\text{recency}}\right) \cdot W_{\text{confidence}}$$
- Parameters:
  - $\alpha$: Balance factor (default 0.5).
  - $\text{Bonus}_{\text{recency}}$: Up to +0.10 for memories updated within the last 7 days.
  - $W_{\text{confidence}}$: Weight from 1.0 (`VERIFIED`) down to 0.10 (`STALE`).
