# Graph Schema & Constraints: KDI Intelligence Graph

## 1. Node Types & Attributes

| Node Label | Core Properties | Primary Source System | Description |
|---|---|---|---|
| `Project` | `id`, `name`, `status`, `description` | `kdi-postgres` | High-level software project or product |
| `Task` | `id`, `title`, `status`, `priority`, `projectId` | `kdi-postgres` | Discrete engineering task unit |
| `Agent` | `id`, `name`, `role`, `department` | `kdi-postgres` | Digital employee persona |
| `Execution`| `id`, `status`, `taskId`, `agentId`, `projectId` | `kdi-runtime` | Canonical execution instance |
| `File` | `id`, `path`, `language` | `git` | Repository source file |
| `Commit` | `id`, `hash`, `message`, `author` | `git` | Git commit object |
| `Decision` | `id`, `projectId`, `title`, `decision`, `status` | `kdi-adr` | Architecture Decision Record (ADR) |
| `Memory` | `id`, `scope`, `title`, `content`, `confidence`, `embedding` | `kdi-memory` | 3-tier semantic memory record |
| `Technology`| `id`, `name`, `category` | `kdi-registry` | Framework, database, language, or tool |
| `Issue` | `id`, `title`, `severity`, `status` | `kdi-issues` | Bug, defect, or architectural ticket |

## 2. Relationships

| Relationship Type | Source Node | Target Node | Key Properties |
|---|---|---|---|
| `OWNS` | `Person` | `Project` | `timestamp` |
| `HAS_TASK` | `Project` | `Task` | `timestamp` |
| `DEPENDS_ON` | `Task` | `Task` | `dependencyType` |
| `ASSIGNED_TO` | `Agent` | `Task` | `assignedAt` |
| `EXECUTED` | `Agent` | `Execution` | `startedAt`, `durationMs` |
| `FOR_TASK` | `Execution` | `Task` | `timestamp` |
| `WORKED_ON` | `Execution` | `Project` | `timestamp` |
| `CHANGED` | `Execution` / `Commit` | `File` | `timestamp` |
| `PRODUCED` | `Execution` | `Commit` / `Artifact` | `timestamp` |
| `USES` | `Project` | `Technology` | `category` |
| `HAS_DECISION` | `Project` | `Decision` | `timestamp` |
| `SUPERSEDED_BY`| `Decision` / `Memory` | `Decision` / `Memory` | `timestamp` |
| `ABOUT` | `Memory` | `Project` / `Task` | `timestamp` |
| `GENERATED` | `Agent` | `Memory` | `timestamp` |

## 3. Uniqueness Constraints & Indexes

```cypher
// Uniqueness Constraints
CREATE CONSTRAINT c_project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT c_task_id IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT c_agent_id IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT c_execution_id IF NOT EXISTS FOR (e:Execution) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT c_decision_id IF NOT EXISTS FOR (d:Decision) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT c_memory_id IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE;

// Vector Index (384-dimensional cosine similarity)
CREATE VECTOR INDEX memory_embedding_idx IF NOT EXISTS
FOR (m:Memory) ON (m.embedding)
OPTIONS { indexConfig: {
  'vector.dimensions': 384,
  'vector.similarity_function': 'cosine'
}};
```
