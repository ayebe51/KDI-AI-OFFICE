# Reusable Skill: Database Analysis (`database-analysis.md`)

## 1. Metadata
- **Name:** `database-analysis`
- **Reusability:** High (Used by Database Architect, Backend Engineer, System Architect)
- **Version:** 1.0.0
- **Purpose:** Analyze database schemas, inspect query execution plans (EXPLAIN ANALYZE), detect missing indexes, and assess migration risks.

---

## 2. Specification

### 2.1 Inputs
- `schema_ddl`: Existing table definitions or migration history.
- `slow_queries`: Optional slow query log or specific SQL string to profile.

### 2.2 Preconditions
- Access to local test database or schema definition files.

### 2.3 Procedure
1. Parse table structures, primary keys, foreign keys, and existing indexes.
2. Evaluate query against schema: Identify sequential scans (`Seq Scan`) on large tables.
3. Suggest optimal index candidates (B-Tree, Partial Index, Composite Index).
4. For migrations: Detect destructive locks (e.g., adding non-nullable column without default on large table).
5. Compile Database Optimization Assessment report.

### 2.4 Tools
- `sql_parser`: Parses DDL and queries into AST.
- `explain_plan_analyzer`: Interprets PostgreSQL EXPLAIN output.

### 2.5 Constraints
- Analysis is strictly read-only; no live schema mutation is performed by this skill.

### 2.6 Output
- Database Analysis Report with index recommendations, lock risk rating, and optimized SQL queries.

### 2.7 Validation
- Proposed indexes reference existing table columns and follow indexing best practices.

### 2.8 Failure Modes
- *Invalid SQL Syntax:* Query fails parsing -> Flag query syntax error.

### 2.9 Security Considerations
- Never log query parameter values containing passwords or PII.
