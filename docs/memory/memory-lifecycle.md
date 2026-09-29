# Memory Lifecycle & Stale Detection

## 1. Lifecycle States

```text
[CREATE] ──> ACTIVE ──> [VERIFY] ──> VERIFIED
               │                         │
               │ [SUPERSEDE]             │ [SUPERSEDE]
               ↓                         ↓
           SUPERSEDED                SUPERSEDED (STALE)
               │                         │
               ↓                         ↓
           ARCHIVED                  ARCHIVED
               │
          [INVALIDATE]
               ↓
          INVALIDATED
```

## 2. Confidence Grading
1. **`VERIFIED` (Confidence 1.0):** Backed by concrete passing tests, verified ADR decisions, or static configuration files.
2. **`SUPPORTED` (Confidence 0.85):** Observed during successful execution runs or consensus of multiple agents.
3. **`INFERRED` (Confidence 0.65):** Deductions drawn by reasoning models; lacks formal execution verification.
4. **`UNVERIFIED` (Confidence 0.40):** Newly ingested candidate facts before validation.
5. **`STALE` (Confidence 0.10):** Superseded by newer verified facts; penalized during hybrid retrieval.

## 3. Stale Detection & Supersession
When a new architectural decision or code change refutes an older memory:
- The old memory is marked `lifecycle = 'SUPERSEDED'` and `confidence = 'STALE'`.
- A directed edge `(OldMemory)-[:SUPERSEDED_BY]->(NewMemory)` is created.
- The `validUntil` timestamp is set on the old memory.
- `HybridGraphRetriever` penalizes `STALE` items by 90% and injects a warning into the prompt if a stale item is retrieved.
