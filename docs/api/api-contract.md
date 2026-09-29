# REST API Contract Specification: KDI AI Office

## 1. Overview & General Conventions
The **KDI AI Office REST API** adheres to RESTful architectural principles using OpenAPI 3.1 standards.
- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Authentication:** HTTP Bearer Token (`Authorization: Bearer <JWT>`) for Private routes; Public routes accessible without token.
- **Error Format:** Standard RFC 7807 Problem Details JSON.

---

## 2. Endpoint Catalog & Specifications

### 2.1 Task Endpoints
- `POST /api/v1/tasks`: Ingests and enqueues a new engineering task.
- `GET /api/v1/tasks`: Lists paginated tasks with filter options.
- `GET /api/v1/tasks/{id}`: Returns task details, subtask runs, diffs, and audit events.
- `POST /api/v1/tasks/{id}/cancel`: Aborts in-progress task execution.
- `POST /api/v1/tasks/{id}/approve`: Approves high-risk action with optional comment.
- `POST /api/v1/tasks/{id}/reject`: Rejects high-risk action with developer feedback.

### 2.2 Agent & Living Office Endpoints
- `GET /api/v1/agents`: Returns real-time status, room allocation, and activity of all 14 digital employees.
- `GET /api/v1/agents/{id}`: Granular persona details, assigned tools, skills, and current subtask.

### 2.3 Project & Repository Endpoints
- `GET /api/v1/projects`: Lists registered software projects.
- `GET /api/v1/projects/{id}`: Detailed project information, repositories, and linked Neo4j nodes.

### 2.4 Runs, Approvals & Audit Endpoints
- `GET /api/v1/runs`: Lists recent execution runs across worker pool.
- `GET /api/v1/approvals`: Retrieves pending and historical approval requests.
- `GET /api/v1/audit`: Searches append-only audit trail by trace ID, actor, or date range.

### 2.5 Health Check Endpoints
- `GET /api/v1/health`: Composite system health status.
- `GET /api/v1/health/ollama`: Pings local Ollama daemon and loaded models.
- `GET /api/v1/health/neo4j`: Checks Neo4j Bolt protocol connectivity.
- `GET /api/v1/health/redis`: Checks Redis ping, memory allocation, and queue depths.
- `GET /api/v1/health/postgres`: Validates PostgreSQL connection pool latency.

---

### 2.6 Portfolio Endpoints (Addendum Extension)

#### `GET /api/v1/portfolio`
Returns public list of portfolio projects with filtering by `technology`, `category`, and `year`.
- **Visibility:** `PUBLIC` (Returns sanitized records).
- **Responses:**
  - `200 OK`:
    ```json
    [
      {
        "id": "prj_01J9X8K2M4N5",
        "name": "Koneksi Santri",
        "category": "MOBILE_APP",
        "status": "PRODUCTION",
        "year": 2026,
        "tagline": "Real-time Student Management & Pickup Portal",
        "technologies": ["React Native", "TypeScript", "Node.js", "PostgreSQL"],
        "featured": true,
        "hero_image_url": "https://cdn.kdioffice.internal/media/ks-hero.webp"
      }
    ]
    ```

#### `GET /api/v1/portfolio/{id}`
Returns complete project showcase payload including problem, solution, features, and verified AI contribution summaries.

#### `GET /api/v1/portfolio/{id}/team`
Returns the assigned digital employee roster and human collaborators linked in Neo4j.

#### `GET /api/v1/portfolio/{id}/timeline`
Returns the chronological development milestone progression from Concept to Production.

#### `GET /api/v1/portfolio/{id}/case-study`
Returns full structured technical case study with research, architecture, challenges, solutions, and lessons learned.

#### `GET /api/v1/portfolio/{id}/architecture`
Returns sanitized architectural overview, Mermaid diagram string, and component boundaries.

---

### 2.7 Workforce Economics & Cost Accounting Endpoints (Addendum Extension)

#### `GET /api/v1/workforce`
Returns summary list of all 14 digital employees with seniority grades, departments, and simulated compensation packages.
- **Visibility:** `PRIVATE` (Requires authentication).

#### `GET /api/v1/workforce/{agentId}`
Returns detailed employee profile:
- **Responses:**
  - `200 OK`:
    ```json
    {
      "agent_id": "AGT-BE-01",
      "role": "BACKEND_ENGINEER",
      "display_name": "Backend Engineer",
      "department": "Engineering",
      "grade": "GR-04",
      "seniority": "Senior",
      "room_id": "RM-10",
      "current_project": "Koneksi Santri",
      "current_activity": "CODING",
      "model_policy": "Tier 1 / Tier 2"
    }
    ```

#### `GET /api/v1/workforce/{agentId}/compensation`
Returns simulated compensation breakdown: Base Salary, Allowance, Performance Incentive, and total virtual package.

#### `GET /api/v1/workforce/{agentId}/performance`
Returns verified performance scorecard: Tasks Completed, Success Rate, Average Cycle Time, Tests Authored, and Bugs Fixed.

#### `GET /api/v1/costs`
Returns multi-project cost ledger allocating virtual labor and actual cloud LLM bills across repositories.

#### `GET /api/v1/budgets`
Returns department spending caps, current actual cloud spend, and threshold alert statuses.

#### `GET /api/v1/workload-mirror`
Returns Workload Mirror calculation mapping single-human developer responsibilities to equivalent AI workforce teams with comparative economic metrics.
- **Responses:**
  - `200 OK`:
    ```json
    {
      "human_responsibilities_count": 7,
      "equivalent_ai_roles_count": 5,
      "estimated_virtual_workforce_cost_idr": 77000000,
      "actual_llm_cost_idr": 1850000,
      "actual_infra_cost_idr": 450000,
      "total_ai_workforce_cost_idr": 79300000,
      "mapped_roles": [
        {"role": "DevOps Specialist", "grade": "Senior", "virtual_cost_idr": 18000000},
        {"role": "Backend Engineer", "grade": "Senior", "virtual_cost_idr": 19500000},
        {"role": "Frontend Specialist", "grade": "Mid", "virtual_cost_idr": 12000000},
        {"role": "WordPress Specialist", "grade": "Mid", "virtual_cost_idr": 10000000},
        {"role": "QA & Support Engineer", "grade": "Mid", "virtual_cost_idr": 11000000}
      ]
    }
    ```
