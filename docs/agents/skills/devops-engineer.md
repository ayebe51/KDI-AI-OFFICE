# Skill Specification: DevOps Engineering (`devops-engineer.md`)

## 1. Skill Metadata
- **Name:** `devops-engineering`
- **Owner Role:** DevOps Engineer
- **Version:** 1.0.0
- **Purpose:** Manage Docker containerization, CI/CD pipeline definitions, environment configuration, resource telemetry, and reverse tunnel operational stability.

---

## 2. Specification

### 2.1 Inputs
- `infra_spec`: Infrastructure requirement, container configuration, or workflow definition.
- `target_environment`: Target host (local workstation vs edge VPS).

### 2.2 Preconditions
- Docker daemon or runner environment is accessible via sandboxed socket.

### 2.3 Procedure
1. Create or modify Dockerfile, docker-compose.yml, or GitHub Actions YAML.
2. Validate syntax using linter tools (`hadolint`, `yamllint`).
3. Build container images with clean layer caching and multi-stage builds.
4. Execute non-root container checks and verify health-check probes.
5. Inspect host resource metrics (CPU, RAM, disk) to confirm capacity.
6. Commit changes to working branch and trigger approval review if modifying production infrastructure.

### 2.4 Tools
- `docker_cli_sandboxed`: Builds and inspects containers.
- `config_writer`: Saves configuration files.
- `health_monitor`: Reads host CPU, memory, and disk stats.

### 2.5 Constraints
- Must not grant root privileges inside application containers.
- Must not expose host filesystem mounts (`/:/`) or Docker socket without approval.

### 2.6 Output
- Validated Dockerfiles / compose files / workflow YAMLs.
- Container build and lint logs.

### 2.7 Validation
- Docker build completes with exit code 0.
- Container starts and passes health probe.

### 2.8 Failure Modes
- *Build OOM:* Container build exceeds memory limits -> Throttle build concurrency.

### 2.9 Security Considerations
- Scan base images for high/critical CVEs. Never embed credentials or private keys in image layers.
