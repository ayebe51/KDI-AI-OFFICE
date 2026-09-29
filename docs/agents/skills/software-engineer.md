# Skill Specification: Software Engineering & Bugfixing (`software-engineer.md`)

## 1. Skill Metadata
- **Name:** `software-engineering`
- **Owner Role:** Software Engineer
- **Version:** 1.0.0
- **Purpose:** Autonomous generalist coding, bug reproduction, multi-file refactoring, and surgical bugfixing across full-stack repositories.

---

## 2. Specification

### 2.1 Inputs
- `task_instruction`: Description of the bug or feature request.
- `error_logs_or_stacktrace`: Optional stack trace or reproduction steps.
- `repository_path`: Path to target repository.

### 2.2 Preconditions
- Git worktree is cleanly initialized for the task.
- Base test suite executes cleanly on unchanged code.

### 2.3 Procedure
1. Create a dedicated task branch: `git checkout -b ai/task-<id>-<slug>`.
2. Inspect stack trace and locate target source files using AST search.
3. Write a reproduction test case that demonstrates the bug (test initially FAILS).
4. Apply surgical code fixes to resolve the failing assertion.
5. Re-run reproduction test case to verify it now PASSES.
6. Run the broader regression test suite to ensure no collateral breakage.
7. Stage modified files, create clean commit with conventional commit message, and generate diff.

### 2.4 Tools
- `opencode_editor`: Code editing and AST inspection.
- `git_client`: Branching, committing, diffing.
- `test_runner`: Targeted and regression test execution.

### 2.5 Constraints
- Keep diffs minimal and surgical; do not reformat unrelated files or reorder imports globally.
- Do not bypass or disable existing tests.

### 2.6 Output
- Unified git diff.
- Passing test logs verifying reproduction test and regression suite.
- Structured summary report.

### 2.7 Validation
- Reproduction test fails before fix and passes after fix.
- Full regression test suite passes with exit code 0.

### 2.8 Failure Modes
- *Regression Induced:* Fix causes existing tests to fail -> Roll back edit and attempt alternative approach.

### 2.9 Security Considerations
- Ensure bug fix does not introduce side-channel data leaks or weaken input validation.
