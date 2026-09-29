// ==========================================================
// apps/web/src/components/LLMPlayground.tsx
// Phase 2: Interactive LLM Playground with Dynamic Routing & Telemetry
// ==========================================================

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  Shield,
  ShieldAlert,
  Zap,
  Play,
  Compass,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Coins,
  Clock,
  Layers,
  Server,
  ArrowRight,
} from 'lucide-react';
import type {
  ModelMetadata,
  ProviderHealthStatus,
  RoutingDecision,
  LLMResponse,
  PrivacyClass,
  LLMProviderType,
} from '@kdi/types';

interface LLMPlaygroundProps {
  apiUrl: string;
}

export function LLMPlayground({ apiUrl }: LLMPlaygroundProps) {
  // Input Configuration
  const [taskType, setTaskType] = useState<string>('CHAT');
  const [privacyClass, setPrivacyClass] = useState<PrivacyClass>('INTERNAL');
  const [preferredProvider, setPreferredProvider] = useState<string>('');
  const [preferredModel, setPreferredModel] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(2048);
  const [stream, setStream] = useState<boolean>(false);

  // Prompt Editors
  const [systemInstruction, setSystemInstruction] = useState<string>(
    'You are a senior software architect on the KDI AI Office engineering team. Provide concise, production-ready, verified code and architectural rationale.'
  );
  const [context, setContext] = useState<string>('');
  const [userPrompt, setUserPrompt] = useState<string>(
    'Review the memory consumption of an in-memory caching ring buffer and propose a zero-allocation optimization.'
  );

  // Data & State
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [providerHealth, setProviderHealth] = useState<ProviderHealthStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [simulatedDecision, setSimulatedDecision] = useState<RoutingDecision | null>(null);
  const [executionResult, setExecutionResult] = useState<LLMResponse | null>(null);

  // Load Models & Health
  const fetchData = async () => {
    try {
      const [modelsRes, healthRes] = await Promise.all([
        fetch(`${apiUrl}/llm/models`),
        fetch(`${apiUrl}/llm/providers/health`),
      ]);

      if (modelsRes.ok) {
        const mData = await modelsRes.json();
        setModels(mData.data || []);
      }
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setProviderHealth(hData.data || []);
      }
    } catch (err: any) {
      console.warn('Failed to load LLM metadata:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  // Presets
  const applyPreset = (preset: 'arch' | 'coding' | 'test' | 'confidential') => {
    if (preset === 'arch') {
      setTaskType('ARCHITECTURE');
      setPrivacyClass('INTERNAL');
      setSystemInstruction('You are a Principal Software Architect. Focus on high-level topology, CAP theorem trade-offs, and invariants.');
      setUserPrompt('Design an event-driven fallback and circuit-breaker mechanism for 4 heterogeneous LLM providers.');
    } else if (preset === 'coding') {
      setTaskType('CODING');
      setPrivacyClass('INTERNAL');
      setSystemInstruction('You are a Senior Systems Programmer. Write surgical, memory-safe TypeScript code without fluff.');
      setUserPrompt('Write an in-memory token bucket rate limiter supporting sliding 60-second windows and per-provider quotas.');
    } else if (preset === 'test') {
      setTaskType('TESTING');
      setPrivacyClass('INTERNAL');
      setSystemInstruction('You are a QA Automation Specialist. Write comprehensive node:test assertions covering boundary states.');
      setUserPrompt('Write unit tests for an exponential backoff retry loop with jitter.');
    } else if (preset === 'confidential') {
      setTaskType('CODING');
      setPrivacyClass('CONFIDENTIAL');
      setSystemInstruction('CONFIDENTIAL ENVIRONMENT. Sovereign local workstation execution only.');
      setUserPrompt('Analyze this confidential corporate salary database schema for PII compliance.');
    }
  };

  // Simulate Route
  const handleSimulateRoute = async () => {
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/llm/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          privacyClass,
          messages: [{ role: 'user', content: userPrompt }],
          systemInstruction,
          context,
          preferredProvider: preferredProvider || undefined,
          preferredModel: preferredModel || undefined,
          temperature,
          maxOutputTokens,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setSimulatedDecision(data.decision);
    } catch (err: any) {
      setError(`Simulation Error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Execute Prompt via Router
  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setExecutionResult(null);

    try {
      const res = await fetch(`${apiUrl}/llm/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          privacyClass,
          messages: [{ role: 'user', content: userPrompt }],
          systemInstruction,
          context,
          preferredProvider: preferredProvider || undefined,
          preferredModel: preferredModel || undefined,
          temperature,
          maxOutputTokens,
          stream,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const data: LLMResponse = await res.json();
      setExecutionResult(data);
      // Refresh health stats after call
      fetchData();
    } catch (err: any) {
      setError(`Execution Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredModels = preferredProvider
    ? models.filter((m) => m.provider === preferredProvider)
    : models;

  return (
    <div className="space-y-6">
      {/* Top Banner / Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-heading font-semibold text-slate-100">
              AI Intelligence Layer • LLM Playground
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic AI Router with strict privacy isolation, automatic provider failover, and exact token cost estimation.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mr-1">Presets:</span>
          <button
            onClick={() => applyPreset('arch')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            🏛️ Architecture
          </button>
          <button
            onClick={() => applyPreset('coding')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            💻 Coding
          </button>
          <button
            onClick={() => applyPreset('test')}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            🧪 Fast Test
          </button>
          <button
            onClick={() => applyPreset('confidential')}
            className="px-2.5 py-1 text-xs bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 rounded-lg border border-rose-800/60 transition"
          >
            🔒 Confidential
          </button>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['ollama', 'gemini', 'groq', 'openrouter'] as LLMProviderType[]).map((p) => {
          const h = providerHealth.find((x) => x.provider === p);
          const isLocal = p === 'ollama';
          const isUp = h?.state === 'AVAILABLE';
          const isRateLimited = h?.state === 'RATE_LIMITED';
          const isAuthError = h?.state === 'AUTH_ERROR';

          return (
            <div
              key={p}
              className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold capitalize text-slate-200">
                  {isLocal ? '🖥️ Ollama (Local)' : p === 'gemini' ? '✨ Gemini' : p === 'groq' ? '⚡ Groq' : '🌐 OpenRouter'}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isUp ? 'bg-emerald-400' : isRateLimited ? 'bg-amber-400' : isAuthError ? 'bg-rose-400' : 'bg-slate-600'
                  }`}
                  title={h?.state || 'UNKNOWN'}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{h?.latencyMs ? `${h.latencyMs}ms` : 'Idle'}</span>
                <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {h?.state || 'READY'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Controls (Left) and Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Configuration & Editors */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Routing Controls</span>
            </h3>

            {/* Task Type & Privacy Class */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Task Domain
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="CHAT">Standard Conversation (Chat)</option>
                  <option value="ARCHITECTURE">System Architecture / ADR</option>
                  <option value="DECOMPOSITION">Task Decomposition</option>
                  <option value="CODING">Surgical Code Editing</option>
                  <option value="DEBUGGING">AST Debugging & Analysis</option>
                  <option value="TESTING">Unit Test Authoring</option>
                  <option value="FAST_CLASSIFICATION">Fast Classification / Intent</option>
                  <option value="DOCS">Technical Documentation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Privacy Classification
                </label>
                <select
                  value={privacyClass}
                  onChange={(e) => setPrivacyClass(e.target.value as PrivacyClass)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="PUBLIC">PUBLIC (Any Cloud / Local)</option>
                  <option value="INTERNAL">INTERNAL (Secure Cloud Allowed)</option>
                  <option value="SENSITIVE">SENSITIVE (Restricted Cloud / Local)</option>
                  <option value="PRIVATE">PRIVATE (Local Preferred)</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL (Local-Only Sovereign)</option>
                </select>
              </div>
            </div>

            {/* Privacy Warning Banner */}
            {privacyClass === 'CONFIDENTIAL' && (
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>
                  <strong>Strict Sovereign Isolation:</strong> All cloud providers are blocked by policy. Requests execute strictly on local workstation Ollama.
                </span>
              </div>
            )}

            {/* Provider Override & Model Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Preferred Provider (Optional)
                </label>
                <select
                  value={preferredProvider}
                  onChange={(e) => {
                    setPreferredProvider(e.target.value);
                    setPreferredModel('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Auto (Router Selects Optimal)</option>
                  <option value="ollama">Ollama (Local Workstation)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="groq">Groq LPU</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Preferred Model (Optional)
                </label>
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Auto Model</option>
                  {filteredModels.map((m) => (
                    <option key={`${m.provider}:${m.modelId}`} value={m.modelId}>
                      {m.displayName} ({m.billingMode === 'FREE' ? 'FREE' : `$${m.pricing.inputCostPerMillion}/M`})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hyperparameters */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Temperature</span>
                  <span className="font-mono text-slate-200">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Max Tokens</span>
                  <span className="font-mono text-slate-200">{maxOutputTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={maxOutputTokens}
                  onChange={(e) => setMaxOutputTokens(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Prompt Textareas */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                System Instruction
              </label>
              <textarea
                rows={2}
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none font-mono"
                placeholder="System instructions..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Context / Repository Snippets (Optional)
              </label>
              <textarea
                rows={2}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none font-mono"
                placeholder="Relevant AST code, swagger contracts, or workspace files..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                User Prompt
              </label>
              <textarea
                rows={4}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none font-mono"
                placeholder="Enter prompt..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleSimulateRoute}
                disabled={simulating || loading}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center space-x-2 transition"
              >
                <Compass className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                <span>{simulating ? 'Simulating...' : 'Simulate Route'}</span>
              </button>

              <button
                onClick={handleExecute}
                disabled={loading || simulating}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 text-xs font-semibold shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 transition"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-pulse' : ''}`} />
                <span>{loading ? 'Routing & Executing...' : 'Execute Prompt'}</span>
              </button>
            </div>

            {error && (
              <div className="flex items-start space-x-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Simulated Decision & Execution Output */}
        <div className="lg:col-span-6 space-y-4">
          {/* Simulated Decision Card (if present) */}
          {simulatedDecision && (
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center space-x-1.5">
                  <Compass className="w-4 h-4" />
                  <span>Router Simulation</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Est. Cost: ${simulatedDecision.estimatedCostUsd.toFixed(6)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Primary:</span>
                  <span className="font-semibold text-emerald-400 uppercase font-mono">
                    {simulatedDecision.selectedProvider}
                  </span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-200 font-mono">{simulatedDecision.selectedModel}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  <strong>Reason:</strong> {simulatedDecision.routingReason}
                </div>
                {simulatedDecision.fallbackChain.length > 0 && (
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    <span className="text-slate-500">Fallback Chain: </span>
                    {simulatedDecision.fallbackChain.map((f, i) => (
                      <span key={i} className="inline-flex items-center space-x-1 font-mono text-slate-300 mr-2">
                        <span>{f.provider}/{f.model}</span>
                        {i < simulatedDecision.fallbackChain.length - 1 && (
                          <ArrowRight className="w-2.5 h-2.5 text-slate-600 inline" />
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Execution Telemetry Card */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Execution Response & Telemetry</span>
              </h3>
              {executionResult && (
                <button
                  onClick={() => copyToClipboard(executionResult.content)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                  title="Copy response content"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Metrics Bar */}
            {executionResult ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-b border-slate-800 text-[11px]">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-slate-500 flex items-center space-x-1">
                    <Server className="w-3 h-3" />
                    <span>Provider</span>
                  </div>
                  <div className="font-semibold text-slate-200 uppercase font-mono truncate">
                    {executionResult.provider}
                  </div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-slate-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Latency</span>
                  </div>
                  <div className="font-semibold text-slate-200 font-mono">
                    {executionResult.latencyMs} ms
                  </div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-slate-500 flex items-center space-x-1">
                    <Layers className="w-3 h-3" />
                    <span>Tokens</span>
                  </div>
                  <div className="font-semibold text-slate-200 font-mono">
                    {executionResult.usage.totalTokens}
                    <span className="text-[9px] text-slate-500 ml-1">
                      ({executionResult.usage.inputTokens} in / {executionResult.usage.outputTokens} out)
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-slate-500 flex items-center space-x-1">
                    <Coins className="w-3 h-3" />
                    <span>Cost</span>
                  </div>
                  <div className="font-semibold text-emerald-400 font-mono">
                    ${executionResult.usage.estimatedCostUsd.toFixed(6)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-3 text-xs text-slate-500 text-center border-b border-slate-800">
                Awaiting execution... Select parameters and click Execute Prompt.
              </div>
            )}

            {/* Fallback & Routing Notice (if fallback triggered) */}
            {executionResult && (
              <div className="py-2 text-[11px] text-slate-400 flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Model: </span>
                  <span className="font-mono text-slate-300">{executionResult.model}</span>
                </div>
                <div>
                  {executionResult.fallbackUsed ? (
                    <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-semibold">
                      ⚡ Fallback Cascade Used
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-semibold">
                      ✓ Direct Route Succeeded
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Content Output Box */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap mt-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-500 space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Evaluating routes and awaiting inference...</span>
                </div>
              ) : executionResult ? (
                executionResult.content
              ) : (
                <span className="text-slate-600 italic">No output generated yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
