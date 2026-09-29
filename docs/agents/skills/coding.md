# Reusable Skill: Coding & Modification (`coding.md`)

## 1. Metadata
- **Name:** `coding`
- **Reusability:** High (Used by Software Engineer, Backend Engineer, Frontend Engineer)
- **Version:** 1.0.0
- **Purpose:** Perform precise, surgical code modifications, additions, and refactoring on targeted source files in an isolated worktree.

---

## 2. Specification

### 2.1 Inputs
- `target_files`: Array of relative file paths to modify.
- `instructions`: Detailed modification instructions and target symbols.
- `context_snippets`: Relevant existing code or architectural contracts.

### 2.2 Preconditions
- The target files exist and are checked out on an isolated task branch.
- Workspace is not in a conflicted git merge state.

### 2.3 Procedure
1. Read existing target file contents into memory.
2. Locate precise line numbers or AST nodes requiring alteration.
3. Apply code replacements or block insertions preserving indentation and style.
4. Verify AST syntax integrity using OpenCode syntax checkers.
5. If syntax check fails, revert file and self-correct patch.
6. Write verified content to disk and stage files for testing.

### 2.4 Tools
- `opencode_editor`: Surgical replacement and file writing.
- `syntax_validator`: Language-specific AST parser.

### 2.5 Constraints
- Never rewrite entire large files from scratch if only localized modifications are needed.
- Preserve all existing comments, docstrings, and licensing headers.

### 2.6 Output
- Modified files on disk.
- Patch diff summary with line additions and deletions.

### 2.7 Validation
- File passes AST syntax validation with 0 syntax errors.

### 2.8 Failure Modes
- *Target Content Mismatch:* File changed externally -> Re-read file and re-anchor patch.

### 2.9 Security Considerations
- Prohibit writing unescaped dynamic strings into shell execution or raw SQL blocks.
