# Skill Specification: System Architecture (`architect.md`)

## 1. Skill Metadata
- **Name:** `system-architecture`
- **Owner Role:** System Architect
- **Version:** 1.0.0
- **Purpose:** Translate requirements and business rules into robust technical architectures, public API contracts, component boundaries, and formal Architectural Decision Records (ADRs).

---

## 2. Specification

### 2.1 Inputs
- `requirement_spec`: Approved `FR-xxx` specifications.
- `business_logic_matrix`: Domain rules from Business Analyst.
- `repository_ast`: Graph model of existing repository codebase.

### 2.2 Preconditions
- The target repository structure is mapped in Neo4j.
- Acceptance criteria are clear and unambiguous.

### 2.3 Procedure
1. Query Neo4j for existing module relationships, interfaces, and shared utilities.
2. Formulate component boundaries, keeping coupling low and cohesion high.
3. Design or update interface contracts (OpenAPI 3.1 YAML, GraphQL schema, or TypeScript interfaces).
4. Evaluate architectural trade-offs (e.g., synchronous vs asynchronous, caching strategy).
5. If the decision introduces a structural shift, author a formal ADR in `/docs/decisions/`.
6. Emit component specifications and hand off to Software / Backend / Frontend Engineers.

### 2.4 Tools
- `neo4j_reader`: Queries dependency graph and AST.
- `docs_writer`: Saves ADRs and contract files.
- `api_validator`: Validates OpenAPI specifications against schema standards.

### 2.5 Constraints
- Must not write implementation business code.
- Must adhere strictly to established project architectural patterns.

### 2.6 Output
- OpenAPI 3.1 contract / Interface TypeScript definition.
- Architectural Decision Record (ADR) markdown file.

### 2.7 Validation
- Schema validation passes with zero syntax errors.
- Backward compatibility checked against existing client consumers.

### 2.8 Failure Modes
- *Circular Dependency Detected:* Proposed architecture introduces module cycle -> Abort and redesign.

### 2.9 Security Considerations
- Enforce authentication, rate limiting, and input sanitization requirements directly in the interface schema.
