# Public Portfolio API Specification

## 1. Architecture & Rate Limiting
All public endpoints are accessible without Bearer authentication under `/public/projects/*`. Responses are strictly projected through `ProjectsService.toPublicProjectDto()`.

## 2. Endpoints

### 2.1 List Public Projects
- **Route:** `GET /public/projects`
- **Query Parameters:**
  - `category` (string, case-insensitive substring)
  - `projectType` (enum: `WEB_APP`, `SAAS`, etc.)
  - `technology` (string, exact tag match)
  - `year` (string)
  - `status` (string)
  - `featured` (boolean: `true` / `false`)
  - `search` (string: matches title, descriptions, or tech stack)
- **Response:**
  ```json
  {
    "total": 5,
    "data": [
      {
        "projectId": "prj_01_simmaci",
        "slug": "simmaci",
        "name": "SIMMACI — Academic Management & Student Statistics",
        "category": "Web Application",
        "projectType": "WEB_APP",
        "status": "Production Active",
        "technologies": ["Laravel", "PHP", "React", "TypeScript"],
        "featured": true
      }
    ]
  }
  ```

### 2.2 Featured Projects
- **Route:** `GET /public/projects/featured`
- **Response:** Array of `PublicProject` records with `featured: true`.

### 2.3 Single Project by Slug
- **Route:** `GET /public/projects/:slug`
- **Errors:** `404 Not Found` if project is unpublished, draft, internal, or non-existent.

### 2.4 Sub-Resources
- `GET /public/projects/:slug/media`
- `GET /public/projects/:slug/case-study`
- `GET /public/projects/:slug/architecture`
