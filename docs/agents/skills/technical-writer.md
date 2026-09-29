# Skill Specification: Technical Documentation (`technical-writer.md`)

## 1. Skill Metadata
- **Name:** `technical-documentation`
- **Owner Role:** Technical Writer
- **Version:** 1.0.0
- **Purpose:** Author and maintain comprehensive system documentation, API contracts, changelogs, architecture guides, and user manuals in clean GitHub-Flavored Markdown.

---

## 2. Specification

### 2.1 Inputs
- `source_code_changes`: Git commit history or unified diff.
- `adr_files`: Architecture decision records.
- `target_doc_path`: Path within `/docs` to create or update.

### 2.2 Preconditions
- The code or architectural feature has been implemented or approved.

### 2.3 Procedure
1. Inspect commit messages, PR descriptions, and modified interfaces.
2. Structure documentation adhering to standard engineering templates:
   - Context & Purpose
   - Architecture & Component Diagrams (Mermaid)
   - Configuration & Environment Variables
   - API Reference & Example Payloads
   - Troubleshooting & FAQs
3. Ensure all file paths use markdown links and adhere to documentation integrity.
4. Update the project changelog (`CHANGELOG.md`) following Keep a Changelog standards.
5. Index document metadata and relationships in Neo4j.

### 2.4 Tools
- `docs_writer`: Creates and updates documentation markdown files.
- `git_log_reader`: Reads commit history and diffs.
- `neo4j_writer`: Links `(:Document)` nodes to `(:Project)` and `(:Module)`.

### 2.5 Constraints
- Preserve existing comments and docstrings in code; never alter application logic.
- Ensure all diagrams compile cleanly with standard Mermaid renderers.

### 2.6 Output
- Production Markdown documentation files in `/docs`.
- Updated `CHANGELOG.md` and `README.md`.

### 2.7 Validation
- Markdown passes linting (`markdownlint`).
- All internal cross-links and anchors resolve successfully.

### 2.8 Failure Modes
- *Stale Documentation Conflict:* Document contradicts newly merged code -> Synchronize doc with active code truth.

### 2.9 Security Considerations
- Redact all real server IPs, internal domain secrets, and production credentials from example snippets.
