# GraphRAG Architecture: Anti-Hallucination & Provenance

## 1. End-to-End Workflow

```text
User / Agent Query
        ↓
Scope & Visibility Evaluation (PUBLIC, INTERNAL, PRIVATE, CONFIDENTIAL)
        ↓
Hybrid Retrieval (Graph Topology + Semantic Vector Search)
        ↓
Graph Expansion (Bounded 1–3 Hops Neighborhood)
        ↓
Context Builder (Deduplication, Token Budget, Scope Priority Tiering)
        ↓
Anti-Hallucination Prompt Framing (UNTRUSTED_GRAPH_KNOWLEDGE_BOUNDARY)
        ↓
AI Router / LLM Service (or Deterministic Synthesis Fallback)
        ↓
Structured Answer + Explicit Source Citations + Support Status
```

## 2. Anti-Hallucination Framing
To eliminate fabrications of repositories, files, or decisions:
1. Prompts require that answers be grounded **only** in provided graph memory facts.
2. If evidence is missing, the system outputs: `"Evidence in KDI Graph Memory is insufficient to confirm this claim."`
3. Support Status classifications:
   - **`SUPPORTED`**: Claims are backed by verified ADR decisions or passing test runs.
   - **`INFERRED`**: Claims are logical deductions from available graph nodes.
   - **`INSUFFICIENT_CONTEXT`**: Zero relevant graph evidence was discovered.

## 3. Citable Source Attribution
Every GraphRAG answer exposes explicit source citations:
```json
{
  "id": "DEC-018",
  "type": "Decision",
  "title": "Antigravity as Primary Engineering Execution Layer",
  "confidence": "VERIFIED",
  "snippet": "Adopt Google Antigravity SDK/CLI as primary engineering execution layer."
}
```
