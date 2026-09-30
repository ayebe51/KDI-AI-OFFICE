# Portfolio Domain Model Specification

## 1. Overview
The KDI AI Office Portfolio Domain Model establishes a single source of truth for software projects engineered by KDI. It provides a bridge between operational engineering artifacts (tasks, commits, tests) and public client-facing presentations (case studies, architectural blueprints, live demos).

## 2. Canonical Schema (`Project`)
Stored in PostgreSQL table `portfolio_projects`:

| Field | Type | Description |
|---|---|---|
| `projectId` | string | Unique primary key (`prj_...`) |
| `slug` | string | Unique, URL-safe lowercase slug (e.g. `simmaci`) |
| `name` | string | Full public title |
| `shortDescription` | string | High-impact summary for cards & meta tags |
| `description` | string | Comprehensive narrative |
| `category` | string | Primary domain category |
| `projectType` | ProjectType | `WEB_APP`, `MOBILE_APP`, `SAAS`, `AI_SYSTEM`, etc. |
| `status` | ProjectStatus | `CONCEPT`, `PROTOTYPE`, `DEVELOPMENT`, `PRODUCTION`, etc. |
| `publishStatus` | PublishStatus | `DRAFT`, `REVIEW`, `APPROVED`, `PUBLISHED`, `ARCHIVED` |
| `year` | string | Release / production year |
| `clientType` | string | Target industry (e.g. `Higher Education`) |
| `problem` | string | Documented business/technical bottleneck |
| `solution` | string | Architectural solution engineered |
| `role` | string | Engineering scope executed |
| `technologies` | string[] | Array of normalized stack components |
| `features` | ProjectFeature[] | Feature breakdowns with public flags |
| `aiContribution` | AiContribution | Human governance vs AI agent contributions |
| `screenshots` | string[] | High-resolution image URLs |
| `videos` | string[] | Demo video URLs |
| `media` | ProjectMedia[] | Categorized media with captions and sort orders |
| `demoUrl` | string? | Validated HTTPS live demonstration URL |
| `repositoryUrl` | string? | Public repository URL (if public) |
| `isRepositoryPublic`| boolean | Visibility flag for Git repository |
| `caseStudy` | CaseStudy? | In-depth engineering case study |
| `architecture` | Architecture? | Structured multi-layer component topology |
| `timeline` | Milestone[] | Major milestones with completion status |
| `team` | TeamMember[] | Multi-agent + human team members |
| `results` | ResultMetric[] | Verified, measured outcome metrics |
| `featured` | boolean | Promoted to hero showcase |
| `visibility` | Visibility | `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` |
| `internalNotes` | string? | Strictly confidential operator notes |
| `totalCostUsd` | number? | Internal model cost (NEVER leaks to public) |
| `totalTokensUsed` | number? | Internal token usage (NEVER leaks to public) |
| `privateRepoUrl` | string? | Internal Git server address (NEVER leaks) |
