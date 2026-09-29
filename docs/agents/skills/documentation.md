# Reusable Skill: Documentation Authoring (`documentation.md`)

## 1. Metadata
- **Name:** `documentation`
- **Reusability:** High (Used by Technical Writer, Architect, Product Manager)
- **Version:** 1.0.0
- **Purpose:** Generate, structure, and update system documentation, user guides, API specifications, and architectural blueprints in standard Markdown.

---

## 2. Specification

### 2.1 Inputs
- `doc_type`: Architecture, PRD, API spec, or release changelog.
- `source_artifacts`: Code diffs, ADRs, or requirement objects.
- `output_path`: Relative destination in `/docs`.

### 2.2 Preconditions
- The source artifacts are finalized and verified.

### 2.3 Procedure
1. Load document template appropriate for `doc_type`.
2. Generate structured headings, badges, and metadata frontmatter.
3. Embed clean Mermaid diagrams for workflows and component relations.
4. Document all interface endpoints, request/response JSON schemas, and error codes.
5. Create markdown clickable links (`[filename](file:///...)`) conforming to project style.
6. Write file to target path and verify with markdown linter.

### 2.4 Tools
- `markdown_editor`: Document creation and editing.
- `mermaid_linter`: Validates Mermaid diagram syntax.

### 2.5 Constraints
- Keep lines concise; avoid wrapped walls of text.
- Do not make assumptions about unverified system behaviors.

### 2.6 Output
- Production Markdown file.
- Updated table of contents / index.

### 2.7 Validation
- Zero markdown syntax errors; all diagram blocks parse cleanly.

### 2.8 Failure Modes
- *Diagram Syntax Error:* Mermaid block fails render -> Fix node labels and edge syntax.

### 2.9 Security Considerations
- Ensure internal production IP addresses, hostnames, and real API tokens are excluded.
