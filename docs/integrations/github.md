# Integration Specification: Git & GitHub Integration (`github.md`)

## 1. Overview
The **GitHub & Git Host Integration** enables **KDI AI Office** to clone repositories, fetch issues, track commit lineage, and push pull requests.

---

## 2. Authentication & Credential Storage
1. **Zero Plaintext Tokens:** GitHub Personal Access Tokens (PAT) or GitHub App Private Keys are stored in the encrypted PostgreSQL `system_settings` table (encrypted via AES-256-GCM).
2. **In-Memory Injection:** Tokens are injected only at execution time as environment variables or via transient SSH agent sockets.
3. **Least Privilege Scopes:** The GitHub PAT is granted restricted repository permissions: `repo:status`, `repo_deployment`, `public_repo`, `pull_requests:write`. Direct administrative permissions or organization-wide access are omitted.

---

## 3. Remote Operations & Approval Envelopes
To enforce human sovereignty:
1. **Local Commits:** Agents can commit freely to task-specific local branches (`ai/task-<id>`).
2. **Push to Remote (`git push`):** Flagged as **Risk: HIGH**. The agent must submit an approval request containing the target remote URL, branch name, and commit list.
3. **Pull Request (PR) Drafting:** Once pushed with human approval, the Technical Writer or Software Engineer agent can call the GitHub API (`POST /repos/:owner/:repo/pulls`) to generate a formatted PR with:
   - Closes Issue `#xxx` link.
   - Comprehensive summary of changes.
   - Test execution evidence.
   - Architecture Decision Record (ADR) reference.

---

## 4. Webhook Ingestion (Optional Edge Relay)
When enabled on the VPS Gateway:
- Inbound webhooks from GitHub (`issues.opened`, `push`, `pull_request.review_requested`) are received by Nginx on the VPS.
- Webhook signature (`X-Hub-Signature-256`) is verified using HMAC-SHA256 at the edge before proxying through the tunnel to the office computer.
- Triggers automated reproduction or review workflows in the AI Manager.
