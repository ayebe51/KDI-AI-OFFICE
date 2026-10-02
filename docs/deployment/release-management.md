# Release Management Strategy

## 1. Overview & Principles
The KDI AI Office release management process enforces zero-risk deployments to the canonical Office Computer environment while coordinating public updates to the Hostinger frontend. 

Production safety priority:
```text
Data Integrity > Security > Recoverability > Availability
```

## 2. Release Gate & Preflight Pipeline
Every production release must satisfy the 7-stage automated release gate before execution:
1. **Automated Test Matrix**: 100% test pass rate across all monorepo packages (`@kdi/types`, `@kdi/config`, `@kdi/shared`, `@kdi/api`, `@kdi/web`).
2. **Security & Secret Audit**: Static analysis and regex scans verifying zero leaked keys, tokens, or plaintext credentials.
3. **Database Migration Safety Verification**: Forward-only, additive schema migrations tested against clean-room restore fixtures.
4. **Pre-Release Encrypted Backup**: Verified AES-256-GCM backup snapshot created on drive `D:\kdi-backups` with SHA-256 manifest.
5. **Rollback Script Preparation**: Automated rollback artifact packaged with pre-release commit hash and schema reversal paths.
6. **Health Monitor Calibration**: Pre-flight verification that all 10 core subsystems are reporting `healthy` status.
7. **Operator Authorization**: Manual approval logged in the immutable audit trail with operator identity and release reason.

## 3. Versioning & Build Artifacts
Every deployment artifact produces a version manifest adhering to Semantic Versioning (`MAJOR.MINOR.PATCH`):
- `release_version`: Current tagged version (e.g., `1.0.0-phase10`).
- `build_id`: Unique ISO-timestamped build identifier.
- `git_commit`: 40-character SHA commit hash.
- `deployment_timestamp`: UTC timestamp of deployment initiation.
- `environment`: `production`, `staging`, or `development`.
- `configuration_hash`: SHA-256 hash of non-sensitive configuration values.

## 4. Promotion Channels
To protect production integrity, code flows through strict isolated stages:
- **Development**: Local development environments (e.g., developer laptops).
- **Staging**: Representative test environment with mocked AI providers or sandbox credentials; sanitized non-production fixtures.
- **Production**: Canonical Office Computer (`localhost:3000` KDI API, Native PostgreSQL 16 on `5432`, Redis on `6379`, Neo4j on `7687`) and Hostinger Web Gateway.
