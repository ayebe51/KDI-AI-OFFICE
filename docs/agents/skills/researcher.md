# Skill Specification: Technical Research (`researcher.md`)

## 1. Skill Metadata
- **Name:** `technical-research`
- **Owner Role:** Researcher
- **Version:** 1.0.0
- **Purpose:** Investigate technical frameworks, query documentation, analyze benchmarks, and evaluate third-party tools or algorithms for software decisions.

---

## 2. Specification

### 2.1 Inputs
- `research_topic`: Specific question, library candidate, or architectural dilemma.
- `constraints`: Performance bounds, license requirements (e.g., MIT/Apache only), language ecosystem.

### 2.2 Preconditions
- Internet connectivity is active for sandboxed documentation retrieval.

### 2.3 Procedure
1. Break down research inquiry into targeted queries.
2. Query official documentation, package repositories (npm, PyPI, Packagist), and release notes.
3. Compare candidate solutions across:
   - License compatibility.
   - Community maintenance & open issue ratio.
   - Performance benchmarks and memory footprints.
   - Ease of integration with existing KDI architecture.
4. Synthesize findings into a concise Technical Evaluation Memorandum.
5. Provide a ranked recommendation with explicit trade-offs.

### 2.4 Tools
- `web_search_sandboxed`: Query technical documentation.
- `docs_fetcher`: Fetches official Markdown/HTML documentation pages.
- `docs_writer`: Saves research memoranda in `/docs/research/`.

### 2.5 Constraints
- Must not download or execute unverified binary executables.
- Prioritize official documentation and empirical data over random forum opinions.

### 2.6 Output
- Markdown Technical Evaluation Memorandum (`docs/research/YYYYMMDD-topic.md`).
- Summary comparison matrix.

### 2.7 Validation
- Memorandum contains at least two compared options, trade-offs, and an unambiguous recommendation.

### 2.8 Failure Modes
- *Conflicting Benchmark Claims:* Seek primary benchmark source or perform local micro-benchmark.

### 2.9 Security Considerations
- Screen evaluated packages for known malware or typosquatting risks.
