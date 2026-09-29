# Skill Specification: Quality Assurance & Testing (`qa-engineer.md`)

## 1. Skill Metadata
- **Name:** `qa-engineering`
- **Owner Role:** QA Engineer
- **Version:** 1.0.0
- **Purpose:** Design automated unit, integration, and regression test suites, verify bug reproduction, measure code coverage, and validate acceptance criteria.

---

## 2. Specification

### 2.1 Inputs
- `acceptance_criteria`: Functional criteria from PM/User Stories.
- `git_diff`: Proposed code modifications.
- `repository_path`: Path to target repository.

### 2.2 Preconditions
- Test framework (Jest, PyTest, PHPUnit, Go test) is configured in target repo.

### 2.3 Procedure
1. Parse acceptance criteria into automated test assertions.
2. Review git diff to identify untested branches or boundary conditions.
3. Author new test cases in dedicated test directories (`tests/unit/`, `tests/integration/`).
4. Execute test runner in sandboxed process with resource timeouts.
5. Capture test execution telemetry (total passed, failed, execution time, line coverage).
6. Generate QA verification report.

### 2.4 Tools
- `test_runner`: Executes automated test framework.
- `coverage_reporter`: Generates lcov / html coverage metrics.
- `opencode_editor`: Writes test files.

### 2.5 Constraints
- Must not alter production source code files (only test files and fixtures).
- Tests must be deterministic and isolated; no dependencies on external live network services.

### 2.6 Output
- New/updated test files (`*.test.ts`, `test_*.py`).
- JSON test execution results and coverage report.

### 2.7 Validation
- 100% of newly written and existing regression tests pass.
- Code coverage on modified lines >= 80%.

### 2.8 Failure Modes
- *Flaky Test Detected:* Non-deterministic timing failures -> Refactor test to use explicit awaits and mock timers.

### 2.9 Security Considerations
- Ensure test fixtures do not contain real production user data or real credentials.
