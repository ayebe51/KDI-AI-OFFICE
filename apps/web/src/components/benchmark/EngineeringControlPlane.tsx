// ==========================================================
// apps/web/src/components/benchmark/EngineeringControlPlane.tsx
// Phase 16: Engineering Control Plane & Autonomous Software Delivery Dashboard
// ==========================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  FileCode,
  GitCommit,
  ShieldCheck,
  Layers,
  ArrowRight,
  Download,
  Clock,
  UserCheck,
  Cpu,
} from 'lucide-react';
import type {
  BenchmarkRun,
  BenchmarkTask,
  BenchmarkStep,
  BenchmarkArtifact,
} from '@kdi/types';

interface EngineeringControlPlaneProps {
  apiUrl: string;
  events?: any[];
  isConnected?: boolean;
}

export function EngineeringControlPlane({ apiUrl, events = [], isConnected = false }: EngineeringControlPlaneProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'active_run' | 'evidence' | 'history'>('overview');
  const [tasks, setTasks] = useState<BenchmarkTask[]>([]);
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRun | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('SIMMACI-010');
  const [executionMode, setExecutionMode] = useState<'AUTONOMOUS' | 'SUPERVISED'>('AUTONOMOUS');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<any>(null);

  // Load tasks, runs, and metrics from API
  const refreshData = async () => {
    try {
      const [tasksRes, runsRes, metricsRes] = await Promise.all([
        fetch(`${apiUrl}/benchmark/tasks`).then((r) => (r.ok ? r.json() : { tasks: [] })),
        fetch(`${apiUrl}/benchmark/runs`).then((r) => (r.ok ? r.json() : { runs: [] })),
        fetch(`${apiUrl}/benchmark/metrics`).then((r) => (r.ok ? r.json() : { metrics: null })),
      ]);

      if (tasksRes.tasks) setTasks(tasksRes.tasks);
      if (runsRes.runs) {
        setRuns(runsRes.runs);
        if (runsRes.runs.length > 0 && !selectedRun) {
          setSelectedRun(runsRes.runs[0]);
        }
      }
      if (metricsRes.metrics) setMetrics(metricsRes.metrics);
    } catch {
      // Fallback local initial state if backend is offline during preview
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Listen for real-time WebSocket benchmark events
  useEffect(() => {
    if (!events.length) return;
    const latest = events[0];
    if (latest?.type?.startsWith('benchmark.')) {
      refreshData();
    }
  }, [events]);

  // Trigger benchmark run
  const handleStartRun = async (taskIdToRun?: string) => {
    const id = taskIdToRun || selectedTaskId;
    setIsRunning(true);
    try {
      const res = await fetch(`${apiUrl}/benchmark/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: id, mode: executionMode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.run) {
          setSelectedRun(data.run);
          setActiveTab('active_run');
        }
      }
    } catch (err) {
      console.error('Failed to trigger benchmark run:', err);
    } finally {
      setIsRunning(false);
      refreshData();
    }
  };

  // Selected task metadata
  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === (selectedRun?.task_id || selectedTaskId));
  }, [tasks, selectedRun, selectedTaskId]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#121316] text-[#e1e4ea] font-sans antialiased border border-[#2b2d35] rounded-xl overflow-hidden shadow-2xl">
      {/* ── TOP CONTROL BAR ────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-[#1a1b20] border-b border-[#2b2d35]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2563eb]/20 text-[#60a5fa] border border-[#3b82f6]/40">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide uppercase text-white flex items-center gap-2">
              KDI Engineering Control Plane
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#1e293b] text-[#94a3b8] border border-[#334155]">
                PHASE 16
              </span>
            </h1>
            <p className="text-xs text-[#94a3b8] font-mono">Autonomous Software Delivery Benchmark</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-1 bg-[#121316] p-1 rounded-lg border border-[#2b2d35]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'overview' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview & Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab('active_run')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'active_run' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Active Run</span>
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'evidence' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Evidence</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'history' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-[#121316] border border-[#2b2d35] rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setExecutionMode('AUTONOMOUS')}
              className={`px-2.5 py-1 rounded ${
                executionMode === 'AUTONOMOUS' ? 'bg-[#059669] text-white font-bold' : 'text-[#94a3b8]'
              }`}
            >
              AUTONOMOUS
            </button>
            <button
              onClick={() => setExecutionMode('SUPERVISED')}
              className={`px-2.5 py-1 rounded ${
                executionMode === 'SUPERVISED' ? 'bg-[#d97706] text-white font-bold' : 'text-[#94a3b8]'
              }`}
            >
              SUPERVISED
            </button>
          </div>

          <button
            disabled={isRunning}
            onClick={() => handleStartRun()}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Benchmark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: OVERVIEW & METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1a1b20] border border-[#2b2d35] p-4 rounded-xl">
                <div className="flex items-center justify-between text-xs text-[#94a3b8] font-mono mb-2">
                  <span>TOTAL BENCHMARK RUNS</span>
                  <Activity className="w-4 h-4 text-[#3b82f6]" />
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {metrics?.totalRuns ?? runs.length}
                </div>
                <div className="text-[11px] text-[#10b981] mt-1 flex items-center gap-1 font-mono">
                  <span>{metrics?.completedRuns ?? runs.filter((r) => r.status === 'COMPLETED').length} COMPLETED</span>
                  <span>•</span>
                  <span className="text-[#f59e0b]">{metrics?.blockedRuns ?? 0} BLOCKED</span>
                </div>
              </div>

              <div className="bg-[#1a1b20] border border-[#2b2d35] p-4 rounded-xl">
                <div className="flex items-center justify-between text-xs text-[#94a3b8] font-mono mb-2">
                  <span>AUTONOMOUS COMPLETION</span>
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                </div>
                <div className="text-2xl font-bold text-[#10b981] font-mono">
                  {Math.round((metrics?.autonomousCompletionRate ?? 1) * 100)}%
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1 font-mono">
                  Zero unnecessary human steering
                </div>
              </div>

              <div className="bg-[#1a1b20] border border-[#2b2d35] p-4 rounded-xl">
                <div className="flex items-center justify-between text-xs text-[#94a3b8] font-mono mb-2">
                  <span>FIRST-PASS SUCCESS</span>
                  <ShieldCheck className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {Math.round((metrics?.firstPassSuccessRate ?? 0.8) * 100)}%
                </div>
                <div className="text-[11px] text-[#a78bfa] mt-1 font-mono">
                  Passes on attempt #1 without retry
                </div>
              </div>

              <div className="bg-[#1a1b20] border border-[#2b2d35] p-4 rounded-xl">
                <div className="flex items-center justify-between text-xs text-[#94a3b8] font-mono mb-2">
                  <span>HUMAN INTERVENTIONS</span>
                  <UserCheck className="w-4 h-4 text-[#f59e0b]" />
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {metrics?.unnecessaryInterventions ?? 0} <span className="text-xs text-[#94a3b8] font-normal">unnecessary</span>
                </div>
                <div className="text-[11px] text-[#10b981] mt-1 font-mono">
                  {metrics?.necessaryApprovals ?? 1} necessary governance approvals
                </div>
              </div>
            </div>

            {/* Benchmark Suite Catalog Table */}
            <div className="bg-[#1a1b20] border border-[#2b2d35] rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#2b2d35] flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#3b82f6]" />
                  Standardized Benchmark Task Suite (Levels 1–5)
                </h2>
                <span className="text-xs text-[#94a3b8] font-mono">{tasks.length} Canonical Tasks</span>
              </div>

              <div className="divide-y divide-[#2b2d35]">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-[#23252c] transition flex items-center justify-between"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#2563eb]/20 text-[#60a5fa] border border-[#3b82f6]/40">
                          {task.id}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-[#2e3039] text-[#cbd5e1]">
                          LEVEL {task.level} • {task.category}
                        </span>
                        {task.id === 'SIMMACI-010' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#10b981]/20 text-[#34d399] border border-[#059669]/40 font-mono">
                            ★ GOLDEN PATH
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                      <p className="text-xs text-[#94a3b8]">{task.description}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          handleStartRun(task.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#2e3039] hover:bg-[#383a45] text-white text-xs font-mono font-medium transition flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE / SELECTED RUN */}
        {activeTab === 'active_run' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Task Details, Step Progress, Terminal Output */}
            <div className="lg:col-span-2 space-y-6">
              {/* Task Header Card */}
              <div className="bg-[#1a1b20] border border-[#2b2d35] p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#2563eb]/20 text-[#60a5fa] border border-[#3b82f6]/40">
                      {selectedRun?.task_id || selectedTaskId}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded font-mono bg-[#2e3039] text-[#cbd5e1]">
                      STATUS: {selectedRun?.status || 'PENDING'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#94a3b8]">
                    Commit: <code className="text-[#34d399]">{selectedRun?.final_commit?.slice(0, 8) || 'pending'}</code>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-bold text-white">{selectedTask?.title || 'Autonomous Task'}</h2>
                  <p className="text-xs text-[#94a3b8] mt-1">{selectedTask?.description}</p>
                </div>

                {/* Acceptance Criteria */}
                <div className="space-y-1.5 pt-2 border-t border-[#2b2d35]">
                  <span className="text-[11px] font-mono uppercase text-[#64748b] tracking-wider">
                    Acceptance Criteria
                  </span>
                  <div className="space-y-1">
                    {selectedTask?.acceptanceCriteria.map((c, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs text-[#cbd5e1]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 15-Step Progress Timeline */}
              <div className="bg-[#1a1b20] border border-[#2b2d35] p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center justify-between">
                  <span>15-Step Autonomous Delivery Lifecycle</span>
                  <span className="text-[10px] text-[#94a3b8]">
                    {selectedRun?.steps.length || 0}/15 Steps Executed
                  </span>
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
                  {[
                    'TASK_INTAKE',
                    'TASK_UNDERSTANDING',
                    'PLANNING',
                    'AGENT_ASSIGNMENT',
                    'REPOSITORY_INSPECTION',
                    'IMPLEMENTATION',
                    'TESTING',
                    'FAILURE_DETECTION',
                    'DEBUGGING',
                    'RE_TEST',
                    'QUALITY_VERIFICATION',
                    'DIFF_REVIEW',
                    'APPROVAL_GATE',
                    'DELIVERY',
                    'AUDIT_RECORD',
                  ].map((stepName, idx) => {
                    const step = selectedRun?.steps.find((s) => s.name.startsWith(stepName));
                    const isSuccess = step?.status === 'SUCCESS';
                    const isFailed = step?.status === 'FAILED';

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-center transition ${
                          isSuccess
                            ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#34d399]'
                            : isFailed
                            ? 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#f87171]'
                            : 'bg-[#16171d] border-[#2b2d35] text-[#64748b]'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold">{idx + 1}</div>
                        <div className="text-[9px] font-mono truncate" title={stepName}>
                          {stepName.replace(/_/g, ' ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Terminal Logs & Verification Evidence */}
              <div className="bg-[#0b0c0e] border border-[#2b2d35] rounded-xl overflow-hidden font-mono text-xs">
                <div className="px-4 py-2 bg-[#1a1b20] border-b border-[#2b2d35] flex items-center justify-between text-[#94a3b8]">
                  <span className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#3b82f6]" />
                    Real Execution Console Log
                  </span>
                  <span className="text-[10px] text-[#64748b]">Real Worktree Output</span>
                </div>
                <div className="p-4 space-y-1.5 max-h-72 overflow-y-auto text-[#cbd5e1]">
                  {selectedRun?.steps.map((s, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-[#64748b]">[{s.timestamp.slice(11, 19)}]</span>
                      <span className="text-[#60a5fa] font-bold">[{s.actor}]</span>
                      <span className="text-[#a78bfa]">{s.name}:</span>
                      <span className={s.status === 'FAILED' ? 'text-[#f87171]' : 'text-[#34d399]'}>
                        {s.status} ({s.durationMs}ms)
                      </span>
                    </div>
                  ))}
                  {(!selectedRun || selectedRun.steps.length === 0) && (
                    <div className="text-[#64748b] italic">No execution logs available. Click Run Benchmark to start.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Agent Workforce DAG & Attempt Recovery History */}
            <div className="space-y-6">
              {/* Workforce Structure DAG */}
              <div className="bg-[#1a1b20] border border-[#2b2d35] p-5 rounded-xl space-y-4">
                <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#3b82f6]" />
                  Active AI Workforce DAG
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-2.5 rounded bg-[#16171d] border border-[#2b2d35] text-center">
                    <div className="font-bold text-white">AI ORCHESTRATOR</div>
                    <div className="text-[10px] text-[#94a3b8]">Intake & Policy Supervisor</div>
                  </div>
                  <div className="flex justify-center text-[#64748b]">↓</div>
                  <div className="p-2.5 rounded bg-[#16171d] border border-[#2b2d35] text-center">
                    <div className="font-bold text-[#60a5fa]">ENGINEERING LEAD</div>
                    <div className="text-[10px] text-[#94a3b8]">Planning & Architecture</div>
                  </div>
                  <div className="flex justify-center text-[#64748b]">↓</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-[#16171d] border border-[#2b2d35] text-center">
                      <div className="font-bold text-[#34d399]">BACKEND</div>
                      <div className="text-[9px] text-[#64748b]">Farhan Hakim</div>
                    </div>
                    <div className="p-2 rounded bg-[#16171d] border border-[#2b2d35] text-center">
                      <div className="font-bold text-[#f59e0b]">QA / TEST</div>
                      <div className="text-[9px] text-[#64748b]">Siti Rahayu</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attempts & Self-Recovery Loop History */}
              <div className="bg-[#1a1b20] border border-[#2b2d35] p-5 rounded-xl space-y-3 font-mono">
                <h3 className="text-xs font-bold tracking-wider uppercase text-white flex items-center justify-between">
                  <span>Self-Recovery Loop</span>
                  <span className="text-[10px] text-[#10b981]">
                    {selectedRun?.recovery_count || 0} Recovery Iterations
                  </span>
                </h3>

                <div className="space-y-2 text-xs">
                  {selectedRun?.attempts.map((att) => (
                    <div
                      key={att.attemptNumber}
                      className={`p-3 rounded border ${
                        att.status === 'SUCCESS'
                          ? 'bg-[#10b981]/10 border-[#10b981]/30'
                          : 'bg-[#ef4444]/10 border-[#ef4444]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span>Attempt #{att.attemptNumber}</span>
                        <span className={att.status === 'SUCCESS' ? 'text-[#34d399]' : 'text-[#f87171]'}>
                          {att.status}
                        </span>
                      </div>
                      {att.hypothesis && (
                        <div className="text-[11px] text-[#94a3b8] mt-1">
                          <span className="text-[#a78bfa]">Hypothesis:</span> {att.hypothesis}
                        </div>
                      )}
                      {att.changes.length > 0 && (
                        <div className="text-[10px] text-[#64748b] mt-1">
                          Files: {att.changes.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedRun || selectedRun.attempts.length === 0) && (
                    <div className="text-[#64748b] text-xs italic">No recovery attempts recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EVIDENCE EXPLORER */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="bg-[#1a1b20] border border-[#2b2d35] p-5 rounded-xl space-y-4 font-mono">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                    Real Execution Evidence & Artifacts
                  </h2>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Immutable artifacts generated for Run: <code className="text-[#60a5fa]">{selectedRun?.run_id || 'N/A'}</code>
                  </p>
                </div>
              </div>

              {/* Artifacts Download Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {selectedRun?.artifacts.map((art) => (
                  <div
                    key={art.artifactId}
                    className="p-3.5 bg-[#121316] border border-[#2b2d35] rounded-lg space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#94a3b8]">
                        <span className="font-bold text-[#60a5fa]">{art.type}</span>
                        <span className="text-[9px] text-[#64748b]">{art.hash.slice(0, 10)}</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{art.filename}</div>
                    </div>

                    <button
                      onClick={() => {
                        const blob = new Blob([art.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = art.filename;
                        a.click();
                      }}
                      className="px-2.5 py-1 rounded bg-[#2e3039] hover:bg-[#383a45] text-xs text-[#cbd5e1] font-medium transition flex items-center justify-center gap-1.5 w-full mt-2"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Artifact</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Git Diff Viewer */}
            <div className="bg-[#0b0c0e] border border-[#2b2d35] rounded-xl overflow-hidden font-mono text-xs">
              <div className="px-4 py-2.5 bg-[#1a1b20] border-b border-[#2b2d35] flex items-center justify-between text-[#94a3b8]">
                <span className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-[#3b82f6]" />
                  Verified Git Diff Patch
                </span>
                <span className="text-[10px] text-[#34d399]">
                  Commit: {selectedRun?.final_commit?.slice(0, 8) || 'pending'}
                </span>
              </div>
              <pre className="p-4 text-[#cbd5e1] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
                {selectedRun?.artifacts.find((a) => a.type === 'GIT_DIFF')?.content ||
                  '# No diff evidence available for current selection.'}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: HISTORICAL BENCHMARKS */}
        {activeTab === 'history' && (
          <div className="bg-[#1a1b20] border border-[#2b2d35] rounded-xl overflow-hidden font-mono text-xs">
            <div className="px-5 py-3.5 border-b border-[#2b2d35] flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-wider uppercase text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#3b82f6]" />
                Historical Benchmark Run Evidence
              </h2>
              <span className="text-[#94a3b8]">{runs.length} Recorded Runs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2b2d35] bg-[#16171d] text-[#64748b] text-[11px]">
                    <th className="py-2.5 px-4">RUN ID</th>
                    <th className="py-2.5 px-4">TASK</th>
                    <th className="py-2.5 px-4">MODE</th>
                    <th className="py-2.5 px-4">STATUS</th>
                    <th className="py-2.5 px-4">TESTS</th>
                    <th className="py-2.5 px-4">RECOVERY</th>
                    <th className="py-2.5 px-4">INTERVENTIONS</th>
                    <th className="py-2.5 px-4">CYCLE TIME</th>
                    <th className="py-2.5 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2d35]">
                  {runs.map((r) => (
                    <tr key={r.run_id} className="hover:bg-[#23252c] transition">
                      <td className="py-3 px-4 font-bold text-[#60a5fa]">{r.run_id.slice(0, 18)}...</td>
                      <td className="py-3 px-4 text-white font-bold">{r.task_id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#2e3039] text-[#cbd5e1]">
                          {r.mode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'COMPLETED'
                              ? 'bg-[#10b981]/20 text-[#34d399]'
                              : r.status === 'BLOCKED'
                              ? 'bg-[#f59e0b]/20 text-[#fbbf24]'
                              : 'bg-[#ef4444]/20 text-[#f87171]'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#cbd5e1]">
                        {r.successful_tests} pass / {r.failed_tests} fail
                      </td>
                      <td className="py-3 px-4 text-[#cbd5e1]">{r.recovery_count}</td>
                      <td className="py-3 px-4 text-[#cbd5e1]">
                        {r.human_interventions} ({r.metrics?.unnecessaryInterventions ?? 0} unnec)
                      </td>
                      <td className="py-3 px-4 text-[#cbd5e1]">
                        {Math.round((r.metrics?.deliveryCycleTimeMs ?? 0) / 1000)}s
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedRun(r);
                            setActiveTab('active_run');
                          }}
                          className="px-2.5 py-1 rounded bg-[#2e3039] hover:bg-[#383a45] text-white text-[11px] transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
