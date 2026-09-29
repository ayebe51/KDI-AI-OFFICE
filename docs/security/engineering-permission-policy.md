# Engineering Command Permission & Security Policy

## 1. Command Risk Classification

Commands issued during autonomous engineering executions are strictly classified by the `CommandClassifier`:

| Category | Examples | Policy Decision | Notes |
|---|---|---|---|
| **READ ONLY** | `ls`, `pwd`, `find`, `grep`, `rg`, `git status`, `git diff`, `git log`, `cat`, `head`, `tail` | **ALLOW** | Zero side-effects. Safe for repository inspection. |
| **NORMAL ENGINEERING** | `npm test`, `npm run build`, `npm run lint`, `npm run typecheck`, `pytest`, `cargo test` | **ALLOW** | Permitted strictly within the isolated workspace/worktree. |
| **HIGH RISK** | `git push`, `git reset --hard`, `git clean -fd`, `npm publish`, production deploy | **HUMAN_APPROVAL_REQUIRED** | Blocks execution until an authorized human operator approves. |
| **FORBIDDEN** | `rm -rf /`, `sudo`, `su`, `chmod 777`, `DROP DATABASE`, `docker system prune` | **DENY** | Immediate unconditional rejection. |

---

## 2. Prompt Injection Defense (Untrusted Repository Data)

Repository files (README, source comments, PR descriptions, test fixtures) are treated as **untrusted data**.
Under no circumstances may repository content override system instructions or security policies.

### Strict Authority Order:
```text
1. KDI Security Policy (Highest, Immutable Authority)
       ↓
2. KDI Task Policy & Command Whitelist
       ↓
3. Agent System Instructions & Role Boundaries
       ↓
4. Human-Approved Task Description
       ↓
5. Repository Content (UNTRUSTED DATA ONLY)
```

Repository content is wrapped in `<untrusted_repository_content>` boundaries to prevent LLM prompt jailbreaks.

---

## 3. Secret Protection & Redaction

- Automated scrubbing is applied to all prompts, logs, Redis event streams, WebSocket broadcasts, and Neo4j graph nodes.
- Patterns redacted include:
  - Private PEM keys (`-----BEGIN PRIVATE KEY-----`)
  - Google API Keys (`AIzaSy...`)
  - OpenAI / Anthropic keys (`sk-...`)
  - Groq API keys (`gsk_...`)
  - GitHub Personal Access Tokens (`ghp_...`)
  - Database connection strings (`postgresql://user:pass@host`)
  - Authorization Bearer tokens (`Bearer ...`)

---

## 4. Human Approval Gatekeeping
- High-risk operations spawn an `EngineeringApprovalRequest`.
- Status is set to `WAITING_APPROVAL`.
- **Anti-Self-Approval Rule**: An agent is strictly prohibited from approving its own request.
- Approvals must be signed by an authorized human operator.
