# Skill Specification: Security Engineering (`security-engineer.md`)

## 1. Skill Metadata
- **Name:** `security-engineering`
- **Owner Role:** Security Engineer
- **Version:** 1.0.0
- **Purpose:** Audit code changes for vulnerabilities, scan for leaked credentials/secrets, inspect dependencies for CVEs, and enforce prompt injection defenses.

---

## 2. Specification

### 2.1 Inputs
- `git_diff`: Proposed code modifications.
- `dependency_manifest`: `package.json`, `requirements.txt`, `composer.json`.
- `tool_call_requests`: Real-time tool requests awaiting execution.

### 2.2 Preconditions
- Static analysis and secret scanning tools are loaded in the environment.

### 2.3 Procedure
1. Scan unified diff for secret patterns (high-entropy strings, AWS/GCP keys, JWTs, private keys).
2. Scan modified code for OWASP Top 10 vulnerabilities (SQLi, XSS, SSRF, Command Injection, insecure deserialization).
3. Query vulnerability databases for dependencies introduced or modified in the diff.
4. Evaluate tool call safety (check for path traversal or dangerous shell flags).
5. If a critical risk is found, issue an immediate **VETO** and halt the task.
6. Generate Security Audit Report.

### 2.4 Tools
- `secret_scanner`: Pattern and entropy scanner (Gitleaks / TruffleHog rules).
- `dependency_checker`: Checks against OSV / GitHub Advisory Database.
- `sast_linter`: Semgrep / Bandit / ESLint Security plugins.

### 2.5 Constraints
- Must evaluate every diff before code is eligible for PR creation or human sign-off.
- Cannot bypass discovered critical CVEs without human override.

### 2.6 Output
- Security Audit Report with risk classification (`PASS`, `WARN`, `VETO`).
- Remediation guidance for detected vulnerabilities.

### 2.7 Validation
- Zero secrets detected. Zero high or critical CVEs unmitigated.

### 2.8 Failure Modes
- *Secret Leak Detected:* Abort workflow immediately, scrub memory buffer, alert developer.

### 2.9 Security Considerations
- The security engineer agent operates with zero-trust; even internal agent outputs are scanned before persistence.
