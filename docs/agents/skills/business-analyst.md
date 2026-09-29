# Skill Specification: Business Analysis (`business-analyst.md`)

## 1. Skill Metadata
- **Name:** `business-analysis`
- **Owner Role:** Business Analyst
- **Version:** 1.0.0
- **Purpose:** Analyze and model complex business logic, domain rules, validation matrices, state transitions, and edge cases to ensure organizational correctness.

---

## 2. Specification

### 2.1 Inputs
- `requirement_spec`: Output from PM skill (`FR-xxx`).
- `domain_model_uri`: Path to existing domain models or entity definitions.

### 2.2 Preconditions
- The requirement specification must be approved and contain valid acceptance criteria.

### 2.3 Procedure
1. Extract business entities and stateful objects from the requirement.
2. Model permissible state transitions (e.g., `PENDING -> VERIFIED -> COMPLETED -> CANCELLED`).
3. Construct a Decision Table or Truth Matrix covering edge cases (e.g., invalid timestamps, concurrent pickup requests).
4. Identify compliance, policy, or fiscal constraints.
5. Produce a Business Logic Matrix for consumption by the System Architect and QA Engineer.

### 2.4 Tools
- `docs_reader`: Reads existing domain models.
- `neo4j_reader`: Queries entity relationship structures.
- `docs_writer`: Emits business specification files.

### 2.5 Constraints
- Must not dictate database physical table structures or index names.
- Must focus purely on domain rules, invariables, and state transitions.

### 2.6 Output
Structured Business Specification with State Transition Tables and Edge-case Matrix.

### 2.7 Validation
- All state transitions must have well-defined trigger events and terminal states.

### 2.8 Failure Modes
- *Contradictory Business Rules:* Conflicting legacy rules -> Flag contradiction and submit to PM/Human.

### 2.9 Security Considerations
- Ensure business logic does not bypass authorization invariants (e.g., role hierarchy checks).
