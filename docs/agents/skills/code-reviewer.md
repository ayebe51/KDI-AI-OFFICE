# Skill Specification: Code Review (`code-reviewer.md`)

## 1. Skill Metadata
- **Name:** `code-review`
- **Owner Role:** Code Reviewer
- **Version:** 1.0.0
- **Purpose:** Perform rigorous, objective line-by-line peer reviews on proposed git diffs to ensure code quality, maintainability, architectural compliance, and style consistency.

---

## 2. Specification

### 2.1 Inputs
- `git_diff`: Complete unified diff of proposed changes.
- `task_requirements`: Acceptance criteria and user story.
- `qa_report`: Test execution results.
- `security_report`: Security scan findings.

### 2.2 Preconditions
- QA tests have executed and passed.
- Security scan reported `PASS`.

### 2.3 Procedure
1. Verify the diff addresses the stated task requirements without extraneous scope creep.
2. Check for anti-patterns: code duplication, god methods, deep nesting, magic numbers, lack of comments on complex logic.
3. Validate error handling: Are promise rejections caught? Are nil/null checks in place?
4. Verify adherence to language-specific idioms (PEP 8, TypeScript strict mode, etc.).
5. Check commit message format against Conventional Commits specification.
6. Issue formal review outcome: `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`.

### 2.4 Tools
- `git_diff_reader`: Parses diff files into file-by-file hunks.
- `linter_verifier`: Checks static linter output.
- `docs_reader`: Reads project style guide.

### 2.5 Constraints
- Must not edit code directly; must provide concrete, actionable feedback for the author agent to apply.
- Reviews must be constructive, concise, and focused on maintainability.

### 2.6 Output
- Structured Code Review Report with line-specific comments and overall disposition (`APPROVE` or `REQUEST_CHANGES`).

### 2.7 Validation
- Review report contains explicit disposition and references specific diff line numbers.

### 2.8 Failure Modes
- *Unsatisfactory Code Quality:* Emit `REQUEST_CHANGES` with actionable recommendations back to the author agent.

### 2.9 Security Considerations
- Independently verify that no commented-out security checks or hardcoded test bypasses remain in the diff.
