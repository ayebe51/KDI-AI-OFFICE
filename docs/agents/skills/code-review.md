# Reusable Skill: Automated Code Review (`code-review.md`)

## 1. Metadata
- **Name:** `code-review-procedure`
- **Reusability:** High (Used by Code Reviewer, System Architect, Security Engineer)
- **Version:** 1.0.0
- **Purpose:** Execute comprehensive multi-dimensional static and heuristic code review over a unified diff.

---

## 2. Specification

### 2.1 Inputs
- `unified_diff`: Raw unified diff string or file path.
- `context_rules`: Repository coding guidelines and architectural standards.

### 2.2 Preconditions
- The unified diff is valid and parses cleanly.

### 2.3 Procedure
1. Parse diff into file blocks, additions, and deletions.
2. Check for anti-patterns:
   - Deep nested conditionals (> 3 levels).
   - Catch-all empty exception blocks (`catch (e) {}` / `except: pass`).
   - Magic strings and unconfigured environment variables.
   - Missing unit test coverage for new public functions.
3. Review variable and function naming against camelCase/snake_case project conventions.
4. Calculate maintainability score (0 - 100).
5. Compile structured review comments keyed by file and line number.

### 2.4 Tools
- `diff_analyzer`: Structural diff parser.
- `linter_runner`: ESLint / Flake8 / PHP_CodeSniffer.

### 2.5 Constraints
- Focus on substance, maintainability, and correctness; avoid purely bikeshedding feedback.

### 2.6 Output
- Review outcome: `APPROVE` or `REQUEST_CHANGES`.
- Line-by-line comments and overall maintainability score.

### 2.7 Validation
- Output contains explicit verdict and at least one qualitative assessment point.

### 2.8 Failure Modes
- *Unparseable Diff:* Corrupted patch format -> Request clean regeneration of diff.

### 2.9 Security Considerations
- Screen for sneaky obfuscated code patterns or base64 decoded payloads.
