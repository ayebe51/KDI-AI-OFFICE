# Skill Specification: Backend Engineering (`backend-engineer.md`)

## 1. Skill Metadata
- **Name:** `backend-engineering`
- **Owner Role:** Backend Engineer
- **Version:** 1.0.0
- **Purpose:** Implement backend business logic, REST/WebSocket controllers, database repositories, and service integration layers.

---

## 2. Specification

### 2.1 Inputs
- `api_contract`: Approved OpenAPI spec or interface contract.
- `database_schema`: Active relational or graph schema.
- `workspace_path`: Path to backend service repository.

### 2.2 Preconditions
- Backend development environment is configured.
- Database models or migrations are present.

### 2.3 Procedure
1. Create or update controller, service, and repository classes adhering to clean architecture.
2. Implement request validation schemas (Pydantic / Zod / Class-Validator).
3. Implement parameterized SQL or ORM queries to prevent injection vulnerabilities.
4. Add structured logging with propagated `trace_id`.
5. Execute unit and integration tests against local mock services.
6. Commit changes to working branch and trigger QA handoff.

### 2.4 Tools
- `opencode_editor`: Code modification and AST inspection.
- `test_runner`: Executes backend test framework (pytest, jest, phpunit).
- `git_client`: Git branch and commit management.

### 2.5 Constraints
- Zero raw unparameterized string SQL queries.
- Must not block the event loop with synchronous I/O in async runtimes.

### 2.6 Output
- Production backend source files.
- Integration tests and updated OpenAPI specs.
- Unified Git diff.

### 2.7 Validation
- 100% of unit tests pass.
- API endpoints strictly fulfill OpenAPI request/response contracts.

### 2.8 Failure Modes
- *Database Connection Failure:* Local test database unreachable -> Trigger local container check.

### 2.9 Security Considerations
- Validate all incoming parameters against strict schemas.
- Enforce authentication and role-based authorization guards on all protected endpoints.
