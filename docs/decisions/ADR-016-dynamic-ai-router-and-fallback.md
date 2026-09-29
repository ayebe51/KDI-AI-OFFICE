# ADR-016: Dynamic AI Router, Privacy Isolation, and Resilient Fallback Engine

## Status
Accepted

## Date
2026-09-29

## Context
KDI AI Office relies on a hybrid inference layer combining a sovereign local model daemon (Ollama running on the office workstation) and cloud LLM providers (Google Gemini, Groq LPU, and OpenRouter). Without a canonical abstraction layer and dynamic routing engine:
1. Application logic would tightly couple to vendor SDKs.
2. Confidential and sensitive enterprise codebases might inadvertently leak to third-party cloud providers.
3. Vendor rate-limits (HTTP 429), quota exhaustions, and network transients would cause brittle pipeline crashes.
4. Token budgets and costs could spiral out of control without real-time tracking and non-fabricated cost reporting.

## Decision
1. **Canonical Provider Abstraction (`LLMProvider`)**:
   Implement a vendor-agnostic interface (`getProviderInfo`, `listModels`, `generate`, `healthCheck`, `getCapabilities`, `getUsage`). Application layers strictly consume canonical `LLMRequest` and `LLMResponse` structures.
2. **Provider Adapters**:
   Implement 4 official adapters:
   - `OllamaAdapter`: Sovereign local workstation inference via HTTP API, supporting CPU-friendly execution and local model discovery.
   - `GeminiAdapter`: Google Gemini official REST API, supporting multimodal context, structured outputs, and real token usage metadata.
   - `GroqAdapter`: Ultra-fast inference (<150ms latency) with native rate-limit header ingestion (`x-ratelimit-*`).
   - `OpenRouterAdapter`: Frontier multi-model routing with HTTP-Referer attribution and pricing ingestion.
3. **Multi-Dimensional Routing Policy (`LLMRouter`)**:
   Dynamic evaluation based on:
   - Task Domain (`ARCHITECTURE`, `CODING`, `TESTING`, `FAST_CLASSIFICATION`, `DOCS`).
   - Token context size (>100k tokens routed to large context models like Gemini).
   - Strict Privacy Classification (`PUBLIC`, `INTERNAL`, `SENSITIVE`, `PRIVATE`, `CONFIDENTIAL`).
4. **Data Sovereignty Policy**:
   If `privacyClass === 'CONFIDENTIAL'`, cloud inference is strictly blocked by policy. Requests execute exclusively on local workstation Ollama models. If local Ollama is offline or unavailable, the request is immediately rejected with `LLMException(PROVIDER_UNAVAILABLE)` rather than leaked to cloud providers.
5. **Resilient Fallback Engine (`FallbackEngine`)**:
   - Loop protection via `visitedProviders` tracking and `maxAttempts` (default 3, max 5).
   - Capability preservation: fallback models must satisfy required capabilities (`CODE`, `REASONING`, etc.).
   - Integrated `CircuitBreaker` (`CLOSED`, `OPEN`, `HALF_OPEN`) and `QuotaManager` sliding 60-second window cooldowns.
   - Real-time WebSocket telemetry broadcasting (`llm.fallback.triggered`).
6. **Zero-Fabrication Cost & Usage Accounting**:
   Exact token counting from provider responses. Pricing calculations derived from verified `ModelMetadata.pricing`. Models are strictly marked `$0.00` only when verified `local === true` or `billingMode === 'FREE'`. Free tier is never conflated with unlimited quota.
7. **Developer LLM Playground**:
   Interactive testing suite in `apps/web` with route simulation, direct execution through the router, fallback inspection, and live telemetry breakdown.

## Consequences
- **Positive:**
  - High availability: Provider outages or rate-limits seamlessly cascade to fallback models without user disruption.
  - Zero cloud leakage for confidential corporate assets.
  - Granular visibility into latency, tokens, and USD costs.
  - Decoupled application code ready for future multi-agent phases (Phase 3+).
- **Negative:**
  - Slight initial latency overhead (<5ms) during local routing evaluation.
  - Requires maintaining up-to-date model capability metadata in the catalog.
