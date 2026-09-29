# ADR-001: Local Office Computer as Primary AI Execution Runtime

## Status
**APPROVED** (Phase 0 Baseline)

## Context
When architecting an autonomous multi-agent software office, the primary execution host must be determined. Options considered were:
1. Pure Cloud Execution (Hosting all agents, databases, and workspaces in AWS/GCP/DigitalOcean).
2. Remote VPS Execution (Hosting execution on the Hostinger VPS).
3. Local Office Computer Workstation (On-premise machine).

The lead developer works daily on an on-premise workstation using Antigravity IDE, with local access to gigabytes of proprietary codebases, local development databases, Docker runtimes, and local network devices.

## Decision
We decide that the **Local Office Computer Workstation** shall serve as the **Primary Execution Host** for all AI agents, MetaGPT orchestration, OpenCode sandboxes, Ollama inference, Neo4j, PostgreSQL, and Redis.

## Rationale
1. **Repository Access & Zero Latency:** Cloned repositories, heavy build tools, unit test suites, and Docker containers execute locally without slow cloud file syncing or expensive egress bandwidth.
2. **Cost Efficiency:** Running continuous agent workers, local LLMs, and multi-database instances on cloud compute would incur continuous high monthly cloud bills. The local workstation provides free CPU, RAM, and NVMe compute.
3. **Data Sovereignty & Security:** Proprietary source code remains inside the physical office premises.
4. **Hardware Feasibility:** Standard workstation hardware (multicore CPU, 32GB RAM, fast NVMe SSD) is sufficient when workloads are managed with resource-aware concurrency queues.

## Consequences
- **Positive:** Maximum local performance, zero cloud compute hosting costs, data privacy, instant access to local test runners.
- **Negative:** The office computer must remain powered on with an active internet connection for off-hours remote tasks. Power outages or sleep states suspend execution (mitigated by UPS and Windows sleep-prevention daemon).
