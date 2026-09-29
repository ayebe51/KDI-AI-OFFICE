# Reusable Skill: Debugging & Root Cause Analysis (`debugging.md`)

## 1. Metadata
- **Name:** `debugging`
- **Reusability:** High (Used by Software Engineer, QA Engineer, Backend Engineer)
- **Version:** 1.0.0
- **Purpose:** Systematically isolate bugs, analyze stack traces, identify faulty code paths, and pinpoint the minimal root cause.

---

## 2. Specification

### 2.1 Inputs
- `stack_trace`: Error message, stack trace, or unexpected runtime output.
- `reproduction_steps`: User steps or API payload causing the issue.
- `repo_root`: Workspace path.

### 2.2 Preconditions
- The stack trace contains at least one referenced file or line within the target repo.

### 2.3 Procedure
1. Parse stack trace to extract the primary call frame originating within application code.
2. Inspect the offending file and surrounding 50 lines of context.
3. Trace variable states and input values backward to identify where invariants broke.
4. Formulate a root cause hypothesis (e.g., unhandled null, concurrency race, off-by-one).
5. Design a targeted reproduction test to validate the hypothesis.
6. Hand off hypothesis and reproduction test to the coding skill.

### 2.4 Tools
- `stacktrace_parser`: Extracts file names and line numbers.
- `ast_tracer`: Traces symbol references and variable declarations.
- `git_blame_inspector`: Checks recent commits touching the offending line.

### 2.5 Constraints
- Do not apply guesses; root cause must be corroborated by code logic analysis.

### 2.6 Output
- Structured Root Cause Analysis (RCA) report specifying file, line, breaking invariant, and proposed fix.

### 2.7 Validation
- The identified line directly correlates with the runtime exception.

### 2.8 Failure Modes
- *Obfuscated or Truncated Trace:* Trace lacks file info -> Request full debug log.

### 2.9 Security Considerations
- Redact any database passwords or user PII that may appear in raw stack trace variables.
