# Skill Specification: Frontend Engineering (`frontend-engineer.md`)

## 1. Skill Metadata
- **Name:** `frontend-engineering`
- **Owner Role:** Frontend Engineer
- **Version:** 1.0.0
- **Purpose:** Develop, test, and style responsive web user interfaces using React, TypeScript, and modern CSS/Three.js, integrating seamlessly with backend APIs and WebSockets.

---

## 2. Specification

### 2.1 Inputs
- `component_specification`: UX mockups, layout requirements, design system tokens.
- `api_contract`: OpenAPI spec or WebSocket event schema.
- `workspace_path`: Path to frontend repository or module.

### 2.2 Preconditions
- The target frontend directory exists and has package dependencies installed.
- API endpoints or mock schemas are available.

### 2.3 Procedure
1. Create or edit TypeScript component files (`.tsx`) adhering to the design system.
2. Implement responsive layout, keyboard accessibility, and state management (Zustand/React hooks).
3. Connect components to API client hooks and WebSocket subscription listeners.
4. Run static type checking (`tsc --noEmit`) and component unit tests (`npm test`).
5. Ensure zero console errors, unhandled promise rejections, or layout shifts.
6. Commit changes to the task branch and notify QA Engineer.

### 2.4 Tools
- `opencode_editor`: File editing and AST manipulation.
- `npm_runner`: Runs `tsc`, `lint`, and component tests.
- `git_client`: Commits to task branch.

### 2.5 Constraints
- Must not install unauthorized large third-party UI libraries without approval.
- Must avoid inline raw styles where design system tokens exist.

### 2.6 Output
- Modified/created `.tsx`, `.ts`, and `.css` files.
- Unified Git diff and passing test execution logs.

### 2.7 Validation
- TypeScript compilation exits with code 0.
- Unit/component test suite passes with 100% success rate.

### 2.8 Failure Modes
- *Type Check Errors:* Unresolved type mismatches -> Inspect error and adjust interfaces.

### 2.9 Security Considerations
- Sanitize all user inputs before rendering to prevent Cross-Site Scripting (XSS).
- Never embed API keys or sensitive authorization tokens in frontend client bundles.
