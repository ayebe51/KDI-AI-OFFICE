# Reusable Skill: Repository Analysis (`repository-analysis.md`)

## 1. Metadata
- **Name:** `repository-analysis`
- **Reusability:** High (Used by Architect, Software Engineer, Code Reviewer, Security Engineer)
- **Version:** 1.0.0
- **Purpose:** Analyze repository folder structure, language composition, dependencies, git history, and AST relationships to build understanding of a codebase.

---

## 2. Specification

### 2.1 Inputs
- `repo_root_path`: Absolute path to cloned repository worktree.
- `depth`: Depth of AST inspection (Shallow / Deep).

### 2.2 Preconditions
- The repository exists on local disk and is a valid Git repository.

### 2.3 Procedure
1. Scan root directory for manifest files (`package.json`, `composer.json`, `pom.xml`, `go.mod`, `requirements.txt`).
2. Identify primary programming languages, frameworks, and testing tools.
3. Traverse directory tree to index source files, configuration files, and test suites.
4. Extract top-level module names, export signatures, and dependency imports.
5. Ingest structural metadata into Neo4j as `(:Repository)-[:CONTAINS]->(:Module)-[:CONTAINS]->(:File)`.
6. Return structured repository profile.

### 2.4 Tools
- `filesystem_scanner`: Recursively walks directory tree.
- `ast_parser`: Tree-sitter / regex parser for import/export signatures.
- `neo4j_writer`: Populates repository graph nodes.

### 2.5 Constraints
- Exclude `node_modules/`, `vendor/`, `.git/`, `dist/`, and binary build artifacts from analysis.
- Maximum traversal file count limit: 10,000 files per run to protect host memory.

### 2.6 Output
Structured JSON summary describing framework, entry points, test commands, and graph mapping status.

### 2.7 Validation
- Output must successfully identify at least one entry point and the test runner command.

### 2.8 Failure Modes
- *Unknown Project Type:* Manifest missing -> Fall back to file extension heuristic scan.

### 2.9 Security Considerations
- Read-only operations; no file writes or execution of untrusted scripts during analysis.
