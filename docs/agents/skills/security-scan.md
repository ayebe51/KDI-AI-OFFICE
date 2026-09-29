# Reusable Skill: Security Scan (`security-scan.md`)

## 1. Metadata
- **Name:** `security-scan`
- **Reusability:** High (Used by Security Engineer, DevOps, Code Reviewer)
- **Version:** 1.0.0
- **Purpose:** Perform automated static vulnerability scanning, secret leak detection, and software supply chain analysis across a codebase or diff.

---

## 2. Specification

### 2.1 Inputs
- `target_path`: Directory or unified diff to scan.
- `scan_scope`: `secrets_only`, `sast_only`, or `full`.

### 2.2 Preconditions
- The target files are accessible in the local workspace.

### 2.3 Procedure
1. Execute regex and Shannon entropy scanners to identify leaked private keys, API tokens, and credentials.
2. Run SAST rules to identify common security flaws:
   - Injection patterns (SQL, Command, LDAP).
   - Insecure cryptographic algorithms (MD5, SHA1 for passwords).
   - Hardcoded IP addresses or bypass endpoints.
3. Check manifest lockfiles (`package-lock.json`, `poetry.lock`, `composer.lock`) for vulnerable package versions.
4. Calculate composite Risk Score (CLEAN / LOW / MEDIUM / HIGH / CRITICAL).
5. Emit Security Findings Report.

### 2.4 Tools
- `secret_detector`: Gitleaks / regex rules engine.
- `sast_engine`: Semgrep rules engine.
- `vuln_database_lookup`: Offline vulnerability database matcher.

### 2.5 Constraints
- Scans must complete within 30 seconds to maintain workflow responsiveness.

### 2.6 Output
- JSON Security Report with file, line, rule ID, severity, and remediation advice.

### 2.7 Validation
- Zero false positives on standard placeholder strings (e.g., `your_api_key_here`).

### 2.8 Failure Modes
- *Critical Threat Detected:* Immediately trigger VETO event and alert developer.

### 2.9 Security Considerations
- Redact detected secret values before storing findings in logs or database records.
