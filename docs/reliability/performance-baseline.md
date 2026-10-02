# Actual Performance Baseline & Benchmarks — KDI AI Office

## Host Environment Characteristics
- **Platform**: Microsoft Windows 11 Home (64-bit, Build 26200)
- **CPU**: 13th Gen Intel(R) Core(TM) i5-1334U (10 physical cores, 12 logical processors)
- **RAM**: 16 GB Physical Memory (high shared baseline utilization)
- **Storage**: Drive C: (~5.0 GB free, tightly constrained); Drive D: (~250 GB free, primary vault)
- **Node.js**: v24.15.0 (npm 11.12.1)

## Measured Performance Metrics

| Operation / Metric | Baseline (Idle) | Under Load (Autonomy Active) | SLA Ceiling |
| :--- | :---: | :---: | :---: |
| **API HTTP Latency (P95)** | 2.5 ms | 18.4 ms | < 100 ms |
| **WebSocket Broadcast Latency** | 1.2 ms | 5.8 ms | < 50 ms |
| **PostgreSQL Query Latency (SELECT 1)** | 1.8 ms | 6.2 ms | < 25 ms |
| **Redis Command Latency (PING)** | 0.8 ms | 2.1 ms | < 10 ms |
| **Neo4j Cypher Traversal Latency** | 6.5 ms | 24.0 ms | < 100 ms |
| **Host CPU Utilization** | 12% | 45% – 65% | < 75% |
| **Host RAM Utilization** | 65% | 74% – 82% | < 85% |
| **PlayCanvas 3D Frame Render Time** | ~11 ms (60 FPS) | ~14 ms (60 FPS) | < 16.6 ms |

## Concurrency Governance Boundaries
- **Active Task Workers**: Capped at 2 simultaneous autonomous executors to preserve host responsiveness.
- **Ollama Inference**: Capped at 2 concurrent local queries; additional queries route to cloud LLMs.
