# Tool System & Execution Layer: KDI AI Office

## 1. Overview & Architecture
The **Tool System** provides the deterministic execution primitives utilized by skills and agents in the **KDI AI Office**. No agent has raw, uncontrolled access to host operating system resources. Every tool call passes through a strict capability-based authorization guard, parameter validation layer, timeout supervisor, and immutable audit logger.

```text
Agent Persona
      ↓ (Requests Tool Invocation)
Skill Pipeline
      ↓ (Validates Preconditions & JSON Schema)
Tool Sandbox Engine (Checks Permissions & Risk Level)
      ↓ (Passes Whitelist & Policy Check)
Tool Driver Implementation (Executes Sandboxed Action)
      ↓ (Captures Exit Code, Stdout, Stderr)
Audit Logger & Graph Lineage Tracer
```

---

## 2. Core Tool Catalog

### 2.1 Tool: `tool_filesystem`
- **Tool ID:** `tool.filesystem.v1`
- **Purpose:** Read, write, search, and list files strictly within the task-designated working directory.
- **Inputs:**
  - `action`: `read_file`, `write_file`, `list_directory`, `file_exists`.
  - `path`: Target file or directory path relative to workspace root.
  - `content`: Content string (for `write_file`).
- **Outputs:** File contents, directory listing array, or byte count written.
- **Permissions Required:** `READ` or `WRITE`.
- **Timeout:** 5,000 ms.
- **Risk Level:** `LOW` (for read) / `MEDIUM` (for write).
- **Audit Requirements:** Log file path, action, content hash, and byte size.
- **Failure Modes:**
  - *Path Traversal Attempt:* Contains `../` or attempts to access root filesystem -> Throws `SecurityException`, triggers audit violation alert.
  - *File Not Found:* Target file missing -> Returns structured `FileNotFound` error.

### 2.2 Tool: `tool_git`
- **Tool ID:** `tool.git.v1`
- **Purpose:** Perform local git version control operations (branching, committing, staging, status, diff generation).
- **Inputs:**
  - `subcommand`: `checkout`, `branch`, `status`, `diff`, `commit`, `log`.
  - `args`: Array of validated command flags and values.
  - `working_dir`: Target repository workspace path.
- **Outputs:** Git stdout/stderr output, commit SHA, unified diff text.
- **Permissions Required:** `READ`, `COMMIT`, or `PUSH`.
- **Timeout:** 15,000 ms.
- **Risk Level:** `LOW` (status, diff) / `MEDIUM` (branch, commit) / `HIGH` (push).
- **Audit Requirements:** Full git command string, branch name, generated commit hash, diff statistics.
- **Failure Modes:**
  - *Merge Conflict:* Branch cannot cleanly merge -> Abort with `MergeConflictError`.
  - *Push Gate:* Pushing to remote triggers mandatory human approval interceptor.

### 2.3 Tool: `tool_shell` (Whitelisted Execution)
- **Tool ID:** `tool.shell.v1`
- **Purpose:** Execute strictly whitelisted developer CLI commands (e.g., linters, compilers, dependency managers) in a sandboxed subshell.
- **Inputs:**
  - `command`: Base executable (must match whitelist: `npm`, `yarn`, `pytest`, `python`, `cargo`, `go`, `php`, `composer`).
  - `args`: Array of arguments (sanitized against command injection).
  - `working_dir`: Workspace directory.
  - `env_vars`: Whitelisted environment variables.
- **Outputs:** Process exit code (0 = success), stdout string, stderr string, execution duration.
- **Permissions Required:** `EXECUTE`.
- **Timeout:** 60,000 ms (configurable up to 180,000 ms for long test runs).
- **Risk Level:** `MEDIUM` (for tests/linters) / `HIGH` (for package installations).
- **Audit Requirements:** Command string, sanitized args, exit code, execution duration, and truncated output logged to PostgreSQL.
- **Failure Modes:**
  - *Non-Whitelisted Binary:* Attempt to run `curl`, `wget`, `bash`, `powershell`, `rm -rf` -> Immediate block and security alert.
  - *Command Timeout:* Process exceeds time limit -> SIGKILL issued; returns `ExecutionTimeoutError`.

### 2.4 Tool: `tool_repository`
- **Tool ID:** `tool.repository.v1`
- **Purpose:** Manage repository worktrees, inspect git branches, and fetch project metadata.
- **Inputs:**
  - `action`: `create_worktree`, `remove_worktree`, `get_metadata`.
  - `project_id`: Target registered project.
  - `branch_name`: Name for task worktree.
- **Outputs:** Worktree path on local SSD, base commit hash.
- **Permissions Required:** `READ` or `WRITE`.
- **Timeout:** 10,000 ms.
- **Risk Level:** `LOW` (metadata) / `MEDIUM` (worktree creation).
- **Audit Requirements:** Project ID, worktree filesystem path, base commit.
- **Failure Modes:**
  - *Insufficient Disk Space:* Host SSD < 5GB -> Reject worktree creation to protect host.

### 2.5 Tool: `tool_testing`
- **Tool ID:** `tool.testing.v1`
- **Purpose:** Invoke test runners in structured test execution mode, parsing test results into canonical JSON metrics.
- **Inputs:**
  - `runner_type`: `jest`, `pytest`, `phpunit`, `gotest`.
  - `filter`: Specific test suite or test function name.
  - `working_dir`: Workspace directory.
- **Outputs:** Structured test result: total tests, passed count, failed count, skipped count, failure details array.
- **Permissions Required:** `EXECUTE`.
- **Timeout:** 120,000 ms.
- **Risk Level:** `LOW`.
- **Audit Requirements:** Test suite path, passed/failed ratio, duration.
- **Failure Modes:**
  - *Infinite Loop in Test:* Runner killed after timeout; marked `TEST_TIMEOUT`.

### 2.6 Tool: `tool_browser` (Sandboxed Headless Navigation)
- **Tool ID:** `tool.browser.v1`
- **Purpose:** Perform headless web rendering for documentation reading or local web UI smoke testing.
- **Inputs:**
  - `url`: Target web URL (whitelisted domains or `http://localhost:<port>`).
  - `action`: `navigate`, `screenshot`, `get_dom_text`.
- **Outputs:** Page title, cleaned Markdown text, or base64 screenshot PNG.
- **Permissions Required:** `READ`.
- **Timeout:** 15,000 ms.
- **Risk Level:** `LOW`.
- **Audit Requirements:** Target URL, fetched content length.
- **Failure Modes:**
  - *SSRF Block:* Attempting to access cloud metadata endpoints (`169.254.169.254`) or internal router IPs -> Blocked by network sandbox.

### 2.7 Tool: `tool_search`
- **Tool ID:** `tool.search.v1`
- **Purpose:** Query technical documentation, package indexes, and indexed codebase symbols.
- **Inputs:**
  - `query`: Search string or symbol name.
  - `scope`: `local_codebase`, `docs`, or `web_tech`.
- **Outputs:** Ranked array of search result snippets with file paths or URLs.
- **Permissions Required:** `READ`.
- **Timeout:** 8,000 ms.
- **Risk Level:** `LOW`.
- **Audit Requirements:** Search query string, result count.
- **Failure Modes:**
  - *Search Provider Outage:* Fall back to local Neo4j fulltext index.

### 2.8 Tool: `tool_documentation`
- **Tool ID:** `tool.documentation.v1`
- **Purpose:** Read and write project markdown documentation and update changelogs.
- **Inputs:**
  - `doc_path`: Target path within `/docs`.
  - `content`: Markdown text.
  - `action`: `read`, `write`, `update_section`.
- **Outputs:** Written document path, character count.
- **Permissions Required:** `READ` or `WRITE`.
- **Timeout:** 5,000 ms.
- **Risk Level:** `LOW`.
- **Audit Requirements:** Document path, change summary.
- **Failure Modes:**
  - *Corrupted Markdown:* Linting fails -> Correct formatting before saving.
