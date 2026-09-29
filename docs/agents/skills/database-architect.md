# Skill Specification: Database Architecture (`database-architect.md`)

## 1. Skill Metadata
- **Name:** `database-architecture`
- **Owner Role:** Database Architect
- **Version:** 1.0.0
- **Purpose:** Design, optimize, and maintain relational (PostgreSQL), graph (Neo4j), and cache (Redis) data structures, producing reversible and idempotent migration scripts.

---

## 2. Specification

### 2.1 Inputs
- `domain_entities`: Required data entities and attributes.
- `access_patterns`: Read/write query frequency, latency targets, transaction boundaries.
- `existing_schema`: Current database schemas.

### 2.2 Preconditions
- The target database engine (Postgres, Neo4j, Redis) is determined.
- Current schema version is identified.

### 2.3 Procedure
1. Model relational entities, primary keys (UUIDv7 preferred), foreign keys, and constraints.
2. Define indexing strategy (B-Tree, GIN for JSONB, composite indexes) based on query patterns.
3. For Neo4j: Define node labels, relationship types, properties, and uniqueness constraints.
4. Author forward migration script (`up.sql`) and matching backward rollback script (`down.sql`).
5. Execute dry-run migration against an isolated local test database.
6. Verify rollback executes cleanly without data corruption.
7. Package migration artifact and flag with Risk: HIGH (requires Human Approval).

### 2.4 Tools
- `sql_linter`: Validates SQL syntax against PostgreSQL 16 standards.
- `db_test_runner`: Executes migration in an isolated ephemeral SQLite/Postgres container.
- `neo4j_validator`: Validates Cypher schema definitions.

### 2.5 Constraints
- Zero un-migratable raw edits; all database changes must be versioned migrations.
- Destructive operations (`DROP COLUMN`, `DROP TABLE`) must be isolated in separate multi-step migration plans.

### 2.6 Output
- `migrations/YYYYMMDD_action_name.up.sql`
- `migrations/YYYYMMDD_action_name.down.sql`
- Updated conceptual ERD in markdown/Mermaid format.

### 2.7 Validation
- Both `up.sql` and `down.sql` execute in test container with exit code 0.
- Zero table lock timeouts or unindexed foreign keys.

### 2.8 Failure Modes
- *Rollback Failure:* Down migration fails to restore previous state -> Flag error and abort.

### 2.9 Security Considerations
- Ensure sensitive fields (passwords, tokens, PII) are marked for application-layer encryption or hashing.
