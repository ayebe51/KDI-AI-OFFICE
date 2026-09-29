# Reusable Skill: Git Operations (`git.md`)

## 1. Metadata
- **Name:** `git`
- **Reusability:** High (Used by Software Engineer, DevOps, Backend, Frontend, Technical Writer)
- **Version:** 1.0.0
- **Purpose:** Manage local git operations including branch creation, worktrees, staging, committing with conventional standards, generating diffs, and preparing PR payloads.

---

## 2. Specification

### 2.1 Inputs
- `action`: Branch, stage, commit, diff, or status.
- `branch_name`: Name for task working branch.
- `commit_message`: Formatted commit message string.
- `workspace_path`: Path to git repository.

### 2.2 Preconditions
- The workspace directory is an initialized Git repository.
- Git config (`user.name="KDI AI Agent"`, `user.email="agent@kdi-office.internal"`) is configured.

### 2.3 Procedure
1. Verify working directory cleanliness (`git status --porcelain`).
2. Create and switch to isolated task branch: `git checkout -b <branch_name>`.
3. Stage specified files: `git add <files>`.
4. Validate commit message against Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).
5. Execute commit: `git commit -m "<message>"`.
6. Generate unified diff against base branch: `git diff origin/main...HEAD > task.diff`.
7. Link commit hash in Neo4j to current Task and Agent nodes.

### 2.4 Tools
- `git_cli_sandbox`: Executes restricted git commands.
- `diff_parser`: Parses diff into readable file blocks.
- `neo4j_writer`: Persists `(:Commit)` node.

### 2.5 Constraints
- Pushing to remote repositories (`git push`) is gated by Risk: HIGH and requires Human Approval.
- Force pushing (`--force`) is strictly forbidden.
- Cannot commit directly to `main`, `master`, or `production`.

### 2.6 Output
- Commit SHA-1/SHA-256 hash.
- Full unified `.diff` file path and summary statistics.

### 2.7 Validation
- `git log -1` confirms commit exists with correct message and author attribution.

### 2.8 Failure Modes
- *Dirty Working Tree:* Uncommitted conflicts exist -> Abort and reset to clean branch state.

### 2.9 Security Considerations
- Pre-commit hook runs secret scanner; commit fails if private keys or API tokens are detected in staged files.
