# Public Data Sanitization & Zero-Leakage Policy

## 1. Zero-Trust Projection Rule
Under no circumstances may raw internal database entities be serialized directly to public HTTP clients.

## 2. Whitelist Data Projection
The `ProjectsService.toPublicProjectDto()` function acts as an immutable projection boundary:

```text
Raw Internal Project (PostgreSQL / Neo4j)
             │
             ▼
   [Sanitization Gate]
   - visibility === 'PUBLIC'?
   - publishStatus === 'PUBLISHED'?
             │
             ├──► NO  ──► Throw 404 Not Found
             │
             └──► YES ──► Strict Whitelist Projection:
                           ├── name (sanitized)
                           ├── slug (URL-safe)
                           ├── features (isPublic === true only)
                           ├── media (visibility === 'PUBLIC' only)
                           ├── team (stripped internal agentId)
                           ├── demoUrl (validated safe URL)
                           └── repositoryUrl (if isRepositoryPublic)
```

## 3. Forbidden Leakage Fields
The following fields are strictly excluded from the `PublicProject` interface:
1. `internalNotes` (Proprietary business negotiations & client codes)
2. `totalCostUsd` (Internal LLM inference and cloud expenditure)
3. `totalTokensUsed` (Prompt and completion token counts)
4. `privateRepoUrl` (Internal Git server hostnames and paths)
5. `agentId` (Internal digital employee UUIDs)
6. Non-public `ProjectFeature` records (`isPublic: false`)
