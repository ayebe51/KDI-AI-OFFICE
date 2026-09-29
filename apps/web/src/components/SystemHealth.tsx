import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { AggregateHealthResponse } from '@kdi/types';

interface SystemHealthProps {
  apiUrl: string;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ apiUrl }) => {
  const [health, setHealth] = useState<AggregateHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${apiUrl}/health`);
      const data = await res.json();
      setHealth(data);
      setLastCheck(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(`Cannot connect to API at ${apiUrl}: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const renderBadge = (status?: 'UP' | 'DOWN' | 'DEGRADED') => {
    if (status === 'UP') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ONLINE
        </span>
      );
    }
    if (status === 'DEGRADED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> DEGRADED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5 mr-1" /> OFFLINE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Status Card */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-heading font-semibold text-slate-100">Subsystem Health & Infrastructure</h2>
            {health && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                health.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                health.status === 'DEGRADED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {health.status}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Last probe executed: {lastCheck.toLocaleTimeString()} • Environment: {health?.environment || 'development'}
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium flex items-center space-x-2 transition border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Probes</span>
        </button>
      </div>

      {fetchError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-semibold">Backend API Offline / Connection Notice</div>
            <div className="text-xs text-amber-400/80 mt-1">{fetchError}</div>
            <div className="text-xs text-slate-400 mt-2">Ensure the NestJS API is running locally: <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-200">npm run dev:api</code></div>
          </div>
        </div>
      )}

      {/* Grid of Subsystems */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PostgreSQL Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              {renderBadge(health?.subsystems.postgres.status)}
            </div>
            <h3 className="text-lg font-heading font-semibold text-slate-200 mt-4">PostgreSQL 16</h3>
            <p className="text-xs text-slate-400 mt-1">Operational Source of Truth (23 Relational Tables)</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
            <span>Latency</span>
            <span className="font-mono text-slate-200">{health?.subsystems.postgres.latencyMs ?? 0} ms</span>
          </div>
        </div>

        {/* Redis Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                <Activity className="w-6 h-6" />
              </div>
              {renderBadge(health?.subsystems.redis.status)}
            </div>
            <h3 className="text-lg font-heading font-semibold text-slate-200 mt-4">Redis 7</h3>
            <p className="text-xs text-slate-400 mt-1">Queues, Ephemeral State & Context Serialization</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
            <span>Latency</span>
            <span className="font-mono text-slate-200">{health?.subsystems.redis.latencyMs ?? 0} ms</span>
          </div>
        </div>

        {/* Neo4j Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                <Server className="w-6 h-6" />
              </div>
              {renderBadge(health?.subsystems.neo4j.status)}
            </div>
            <h3 className="text-lg font-heading font-semibold text-slate-200 mt-4">Neo4j 5</h3>
            <p className="text-xs text-slate-400 mt-1">Topological Knowledge Graph & GraphRAG (26 Nodes)</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
            <span>Latency</span>
            <span className="font-mono text-slate-200">{health?.subsystems.neo4j.latencyMs ?? 0} ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
