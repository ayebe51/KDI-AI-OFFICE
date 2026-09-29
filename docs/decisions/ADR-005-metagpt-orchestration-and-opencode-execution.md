# ADR-005: Decoupled Multi-Agent Orchestration (MetaGPT) & Software Execution (OpenCode)

## Status
**APPROVED** (Phase 0 Baseline)

## Context
Many monolithic agent frameworks attempt to bundle persona definition, conversation routing, file system modifications, and shell tool calls into a single codebase. This creates tight coupling, erratic role drift, and inadequate sandboxing for real-world software development.

## Decision
We decouple **Multi-Agent Orchestration** from **Software Execution**:
- **MetaGPT:** Orchestration engine responsible for role Standard Operating Procedures (SOPs), task decomposition, inter-agent message pool coordination, and requirement-to-architecture handoffs.
- **OpenCode Engine:** Dedicated execution layer providing Git worktree sandboxing, Tree-sitter AST parsing, surgical string patching, and isolated test runner subprocess control.

## Rationale
- Specialization of concerns: MetaGPT excels at structured multi-agent coordination; OpenCode excels at deterministic, AST-aware software engineering.
- Security isolation: OpenCode executes tool operations inside strict sandbox boundaries with command whitelisting, completely isolated from MetaGPT's cognitive prompt loops.

## Consequences
- **Positive:** Modular architecture, clean separation of concerns, higher code patch accuracy, zero prompt pollution.
- **Negative:** Requires maintaining a gRPC/IPC bridge between the MetaGPT supervisor and the OpenCode execution service.
