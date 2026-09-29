# LLM Provider Architecture & Abstraction: KDI AI Office

## 1. Overview & Architectural Philosophy
The **KDI AI Office** strictly prohibits hard-coding model names, endpoints, or vendor-specific payload shapes into agent personas or skills. All language model interactions pass through the **Unified LLM Provider Abstraction Layer**.

This architecture decouples the agent reasoning prompts from specific cloud APIs, enabling hot-swapping, multi-provider routing, dynamic load balancing, cost tracking, and offline fallback.

---

## 2. Supported Inference Providers

```text
┌─────────────────────────────────────────────────────────────────┐
│               Unified LLM Provider Interface                     │
│    generate(), stream(), count_tokens(), calculate_cost()       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┬────────────────────────┐
        ▼                       ▼                       ▼                        ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐        ┌───────────────┐
│ Google Gemini │       │     Groq      │       │  OpenRouter   │        │ Local Ollama  │
│ - 1.5 Pro     │       │ - Llama 3.3   │       │ - Claude 3.5  │        │ - Qwen2.5     │
│ - 1.5 Flash   │       │ - Mixtral     │       │ - DeepSeek R1 │        │ - Llama 3.2   │
│ Large Context │       │ Ultra Low-Lat │       │ Specialist AI │        │ Offline/Priv  │
└───────────────┘       └───────────────┘       └───────────────┘        └───────────────┘
```

1. **Google Gemini (Cloud Tier 1):**
   - *Strengths:* Massive context window (up to 2,000,000 tokens), superb multi-file architectural reasoning, structured JSON schema generation, built-in function calling.
   - *Role:* High-level task decomposition, architecture design, and complex multi-file refactoring.
2. **Groq LPU (Cloud Tier 2):**
   - *Strengths:* Ultra-low latency (> 250 tokens/sec), excellent performance on Llama-3.3 70B models, economical pricing.
   - *Role:* Fast interactive agent chats, unit test authoring, code documentation, and rapid code review iterations.
3. **OpenRouter (Cloud Tier 3 / Specialist):**
   - *Strengths:* Access to Anthropic Claude 3.5 Sonnet and DeepSeek R1 via a single unified API.
   - *Role:* Surgical code refactoring, complex bug reproduction, and second-opinion architectural validation.
4. **Local Ollama (Local Sovereign / Fallback):**
   - *Strengths:* Zero cloud egress, 100% private, zero token costs, operates during network outages.
   - *Role:* Confidential data processing, lightweight syntax tasks, and emergency fallback.

---

## 3. Canonical Provider Model Schema

Every model integrated into the system is registered in `docs/data/postgresql-schema.md` and configuration files using the following schema:

```json
{
  "provider": "gemini",
  "model_id": "gemini-1.5-pro",
  "display_name": "Google Gemini 1.5 Pro",
  "capabilities": {
    "tool_support": true,
    "function_calling": true,
    "streaming": true,
    "json_mode": true,
    "vision": true
  },
  "scores": {
    "reasoning": 9.5,
    "coding": 9.3,
    "speed": 6.5
  },
  "context_limit": 2097152,
  "max_output_tokens": 8192,
  "pricing": {
    "input_cost_per_million": 1.25,
    "output_cost_per_million": 5.00
  },
  "quota": {
    "rpm_limit": 360,
    "tpm_limit": 2000000
  },
  "enabled": true
}
```

---

## 4. Normalized Request & Response Contract

Regardless of the underlying provider, agent workers dispatch requests using a normalized envelope:

```typescript
export interface NormalizedLLMRequest {
  taskId: string;
  agentId: string;
  systemPrompt: string;
  messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCallId?: string;
  }>;
  tools?: Array<ToolDefinition>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  privacyLevel: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL";
}

export interface NormalizedLLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  provider: string;
  model: string;
  latencyMs: number;
}
```
