# Reusable Skill: Test Execution & Verification (`testing.md`)

## 1. Metadata
- **Name:** `testing`
- **Reusability:** High (Used by QA Engineer, Software Engineer, Frontend Engineer, Backend Engineer)
- **Version:** 1.0.0
- **Purpose:** Execute targeted unit and integration test runners inside sandboxed environments, capturing execution logs, pass/fail status, execution time, and coverage.

---

## 2. Specification

### 2.1 Inputs
- `test_target`: Specific test file, suite, or test filter string.
- `workspace_path`: Path to target repository worktree.
- `timeout_seconds`: Maximum execution duration (default: 60s).

### 2.2 Preconditions
- The workspace contains a recognized test runner (npm, pytest, phpunit, cargo, go test).
- Test dependencies are installed.

### 2.3 Procedure
1. Identify the appropriate test runner command from repository metadata.
2. Formulate the non-interactive CLI invocation (e.g., `npm test -- --testPathPattern=pickup`).
3. Spawn sandboxed child process with enforced CPU/RAM limits and execution timeout.
4. Capture stdout, stderr, and process exit code in real time.
5. Parse test runner output into structured JSON (passed, failed, skipped, duration).
6. Emit telemetry events to Redis and 3D dashboard.

### 2.4 Tools
- `test_runner_sandbox`: Runs test CLI within restricted process wrapper.
- `test_output_parser`: Parses TAP / JUnit / Jest JSON outputs.

### 2.5 Constraints
- Test execution must run in non-interactive mode (`CI=true`).
- Execution must terminate strictly upon timeout to prevent infinite test hangs.

### 2.6 Output
```json
{
  "exit_code": 0,
  "passed": 14,
  "failed": 0,
  "skipped": 0,
  "duration_ms": 3420,
  "coverage_line_percent": 88.5
}
```

### 2.7 Validation
- Output contains structured counts matching raw stdout logs.

### 2.8 Failure Modes
- *Test Timeout:* Test hung waiting for external network or infinite loop -> Terminate process and flag timeout error.

### 2.9 Security Considerations
- Tests must not have write permissions outside the designated test sandbox or read host secrets.
