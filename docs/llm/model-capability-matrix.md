# Model Capability Matrix: KDI AI Office

## 1. Overview
This matrix serves as the configuration reference for the **KDI Dynamic AI Router**. It quantifies the relative reasoning, coding, latency, context windows, and financial cost metrics across supported cloud and local inference models.

---

## 2. Comparative Model Capability Matrix

| Provider | Model Identifier | Max Context | Max Output | Tool Calling | JSON Mode | Reasoning (1-10) | Coding (1-10) | Avg Speed (t/s) | Input $/M | Output $/M | Best Suited Roles |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Google** | `gemini-1.5-pro` | 2,000,000 | 8,192 | ✅ Native | ✅ Strict | 9.5 | 9.3 | 45 | $1.25 | $5.00 | System Architect, AI Manager, Code Reviewer |
| **Google** | `gemini-1.5-flash` | 1,000,000 | 8,192 | ✅ Native | ✅ Strict | 8.2 | 8.4 | 140 | $0.075 | $0.30 | Technical Writer, Business Analyst, PM |
| **Groq** | `llama-3.3-70b-versatile` | 128,000 | 32,768 | ✅ Native | ✅ Strict | 8.9 | 8.8 | 280 | $0.59 | $0.79 | QA Engineer, Backend Engineer, Rapid Test Runner |
| **Groq** | `mixtral-8x7b-32768` | 32,768 | 4,096 | ✅ Native | ⚠️ Basic | 7.6 | 7.5 | 450 | $0.24 | $0.24 | Fast Log Analysis, Text Extraction |
| **OpenRouter**| `anthropic/claude-3.5-sonnet` | 200,000 | 8,192 | ✅ Native | ✅ Strict | 9.8 | 9.8 | 65 | $3.00 | $15.00 | Software Engineer (Complex Bugfix), Architect |
| **OpenRouter**| `deepseek/deepseek-r1` | 64,000 | 8,192 | ⚠️ Prompt | ⚠️ Basic | 9.6 | 9.2 | 35 | $0.55 | $2.19 | Researcher, Algorithmic Planning |
| **Ollama (Local)**| `qwen2.5-coder:7b-instruct-q4_K_M` | 32,768 | 4,096 | ✅ Tool tag | ✅ Regex | 7.9 | 8.2 | 12 (CPU) | **$0.00** | **$0.00** | Local Confidential Coding, Offline Fallback |
| **Ollama (Local)**| `llama3.2:3b-instruct-q4_K_M` | 16,384 | 2,048 | ⚠️ Prompt | ⚠️ Regex | 6.8 | 6.5 | 24 (CPU) | **$0.00** | **$0.00** | Ultra-Fast Local Extraction, Offline Assistant |
| **Ollama (Local)**| `deepseek-r1:7b` | 32,768 | 4,096 | ❌ None | ⚠️ Basic | 8.3 | 7.6 | 10 (CPU) | **$0.00** | **$0.00** | Local Deep Reasoning, Logic Verification |

---

## 3. Capability Dimension Descriptions

### 3.1 Reasoning & Architecture Score (1 - 10)
Measures the model's ability to maintain coherent mental models of large software systems, identify indirect side-effects, respect architectural constraints, and construct valid DAG plans without circular dependencies.

### 3.2 Coding & AST Accuracy Score (1 - 10)
Measures the model's ability to emit exact, syntactically valid code diffs, maintain correct variable scopes, properly handle edge cases (null pointers, async promises, race conditions), and write passing test suites.

### 3.3 Latency & Throughput (Tokens per Second)
- **Groq LPU:** Unrivaled leader in real-time token generation (>250 t/s), ideal for streaming live progress to the 3D dashboard.
- **Cloud Frontier (Gemini/Claude):** Balanced throughput (40 - 70 t/s) with exceptional depth of thought.
- **Local CPU Ollama:** Moderate throughput (10 - 25 t/s), completely independent of internet connection quality or API quotas.

---

## 4. Cost Management & Spend Ceiling
To prevent unexpected credit exhaustion:
1. **Daily Soft Cap:** $5.00 USD/day. When reached, non-critical background tasks automatically route to Groq Llama-3.3 or Local Ollama.
2. **Daily Hard Cap:** $10.00 USD/day. When reached, all cloud inference is suspended, and the system transitions to 100% Local Ollama mode until midnight UTC.
3. **Tracking Mechanism:** Every API call's token count is recorded in the PostgreSQL `provider_usage` table with the exact cost calculated from this matrix.
