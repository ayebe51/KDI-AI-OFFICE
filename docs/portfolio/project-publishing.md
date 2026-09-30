# Project Publishing Lifecycle

## 1. Publishing State Machine

Projects progress through a linear, auditable lifecycle:

```text
       ┌──────────┐
       │  DRAFT   │ ◄────────── (unpublish)
       └────┬─────┘                  │
            │ (submitForReview)      │
            ▼                        │
       ┌──────────┐                  │
       │  REVIEW  │                  │
       └────┬─────┘                  │
            │ (approveProject)       │
            ▼                        │
       ┌──────────┐                  │
       │ APPROVED │                  │
       └────┬─────┘                  │
            │ (publishProject)       │
            ▼                        │
       ┌───────────┐                 │
       │ PUBLISHED ├─────────────────┘
       └────┬──────┘
            │ (archiveProject)
            ▼
       ┌──────────┐
       │ ARCHIVED │
       └──────────┘
```

## 2. Guard Rules
1. Only records in `PUBLISHED` state with `visibility === 'PUBLIC'` can be served via the public API.
2. Promoting to `PUBLISHED` automatically sets `visibility = 'PUBLIC'` if previously unset.
3. Unpublishing (`unpublishProject`) transitions the record back to `DRAFT`, instantly removing it from public endpoints and 3D visitor kiosks.
4. Archiving (`archiveProject`) freezes the project state permanently.
