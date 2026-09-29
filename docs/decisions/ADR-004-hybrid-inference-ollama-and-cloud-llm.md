# ADR-004: Hybrid Inference: Cloud LLM for High-Order Reasoning & Local Ollama for Sovereignty and Fallback

## Status
**APPROVED** (Phase 0 Baseline)

## Context
Relying 100% on Cloud LLMs introduces privacy risks for proprietary codebases, vulnerability to external network outages, and token expense creep. Conversely, relying 100% on local CPU models severely limits complex architectural reasoning, multi-file refactoring, and deep plan generation.

## Decision
We adopt a **Hybrid Tiered Inference Architecture**:
1. **Cloud LLMs (Google Gemini 1.5 Pro/Flash, Groq LPU, OpenRouter):** Primary high-capability tier for system architecture, task decomposition, complex bugfixing, and code reviews.
2. **Local Ollama (Qwen2.5-Coder 7B, Llama 3.2 3B, DeepSeek R1 7B):** Sovereign, confidential, and automated fallback tier running locally on the office workstation CPU/GPU.

## Rationale
- Maximizes intellectual horsepower when planning complex features while maintaining an unbreakable safety net when cloud quotas are exhausted or internet connectivity drops.
- Enables confidential code processing where enterprise privacy policies prohibit external cloud egress.

## Consequences
- **Positive:** High availability, robust data sovereignty, optimized financial spend.
- **Negative:** Requires local storage for model weights (~15GB) and managing provider API contracts.
