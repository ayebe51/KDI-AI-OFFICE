# Reusable Skill: Technical Research (`research.md`)

## 1. Metadata
- **Name:** `research-procedure`
- **Reusability:** High (Used by Researcher, Architect, Security Engineer)
- **Version:** 1.0.0
- **Purpose:** Conduct deep technical investigation, gather official documentation, compare package ecosystems, and analyze benchmark metrics.

---

## 2. Specification

### 2.1 Inputs
- `query_terms`: Targeted technical search query.
- `comparison_criteria`: License, performance, community health, integration friction.

### 2.2 Preconditions
- Outbound HTTP access to verified documentation endpoints is available.

### 2.3 Procedure
1. Execute search against curated technical domains (GitHub, official docs, MDN, StackOverflow).
2. Fetch top 3-5 authoritative documentation pages.
3. Extract API signatures, configuration examples, and hardware prerequisites.
4. Construct a comparative evaluation matrix across the stated criteria.
5. Formulate an actionable engineering recommendation.
6. Package findings into a Technical Evaluation Brief.

### 2.4 Tools
- `web_search_sandboxed`: Executes technical search.
- `doc_reader`: Fetches and extracts clean markdown/text from URLs.

### 2.5 Constraints
- Restrict queries to reputable developer documentation; ignore unverified blogs.
- Limit scraping payload size to < 2MB per page.

### 2.6 Output
- Structured Technical Evaluation Brief with pros, cons, and final recommendation.

### 2.7 Validation
- Brief includes at least two evaluated options with direct documentation citations.

### 2.8 Failure Modes
- *Outdated Information:* Candidate library deprecated -> Verify against latest commit date.

### 2.9 Security Considerations
- Screen evaluated packages for malicious install scripts or suspicious maintainer turnover.
