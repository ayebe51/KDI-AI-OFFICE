# 3-Tier Graph Memory Model: KDI AI Office

## 1. Overview
KDI AI Office implements a 3-tier memory model ensuring that agents do not start each engineering task with zero context, while strictly bounding context size to avoid information overload.

```text
┌────────────────────────────────────────────────────────┐
│                   WORKING MEMORY                       │
│  • Current task constraints, active diffs, errors      │
│  • Ephemeral retention (task duration)                 │
│  • Priority 1 in Context Builder                       │
├────────────────────────────────────────────────────────┤
│                   PROJECT MEMORY                       │
│  • Architecture decisions (ADRs), conventions          │
│  • Database schemas, known bugs, dependencies          │
│  • Project retention (lifetime of project)             │
│  • Priority 2 in Context Builder                       │
├────────────────────────────────────────────────────────┤
│                ORGANIZATIONAL MEMORY                   │
│  • Reusable engineering patterns, security standards   │
│  • Corporate governance rules, shared libraries        │
│  • Permanent retention                                 │
│  • Priority 3 in Context Builder                       │
└────────────────────────────────────────────────────────┘
```

## 2. Memory Record Attributes
Every `GraphMemoryItem` node in the graph contains:
- `id`: Canonical identifier (`mem_{timestamp}_{random}`).
- `scope`: `WORKING` | `PROJECT` | `ORGANIZATIONAL`.
- `title` & `content`: Clear textual summary and technical description.
- `retention`: `EPHEMERAL` | `TASK` | `PROJECT` | `ORGANIZATIONAL` | `HISTORICAL`.
- `confidence`: `VERIFIED` | `SUPPORTED` | `INFERRED` | `UNVERIFIED` | `STALE`.
- `visibility`: `PUBLIC` | `INTERNAL` | `PRIVATE` | `CONFIDENTIAL`.
- `lifecycle`: `ACTIVE` | `VERIFIED` | `SUPERSEDED` | `ARCHIVED` | `INVALIDATED`.
- `provenance`: `sourceType`, `sourceId`, `createdBy`, `lastVerifiedAt`.
- `temporal`: `validFrom`, `validUntil`, `createdAt`, `updatedAt`.
- `embedding`: 384-dimensional unit-normalized vector for dense semantic search.
