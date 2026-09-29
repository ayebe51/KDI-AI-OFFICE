// ==========================================================
// apps/web/src/components/AgentRuntimeConsole.tsx
// Phase 3: Agent Runtime Console, Task Orchestration & Live Queue
// ==========================================================

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Cpu,
  UserCheck,
  ShieldAlert,
  Coins,
  Activity,
  Terminal,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type {
  CanonicalTask,
  AgentDefinition,
  RuntimeStatusSummary,
  ExecutionRecord,
  WSEventEnvelope,
} from '@kdi/types';

interface AgentRuntimeConsoleProps {
  apiUrl: string;
  events?: WSEventEnvelope<unknown>[];
  isConnected?: boolean;
}

export function AgentRuntimeConsole({ apiUrl, events = [], isConnected = false }: AgentRuntimeConsoleProps) {
  const [tasks, setTasks] = useState<CanonicalTask[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [statusSummary, setStatusSummary] = useState<RuntimeStatusSummary | null>(null);
  const [selectedTask, setSelectedTask] = useState<CanonicalTask | null>(null);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('ANALYSIS');
  const [newPriority, setNewPriority] = useState('NORMAL');
  const [newPrivacy, setNewPrivacy] = useState('INTERNAL');

  const fetchData = async () => {
    try {
      const [tasksRes, agentsRes, statusRes] = await Promise.all([
        fetch(`${apiUrl}/tasks`),
        fetch(`${apiUrl}/runtime/agents`),
        fetch(`${apiUrl}/runtime/status`),
      ]);

      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(tData.data || []);
      }
      if (agentsRes.ok) {
        const aData = await agentsRes.json();
        setAgents(aData.data || []);
      }
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatusSummary(sData);
      }
    } catch (err) {
      console.warn('Failed to load runtime telemetry:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const loadExecutions = async (taskId: string) => {
    try {
      const res = await fetch(`${apiUrl}/tasks/${taskId}/executions`);
      if (res.ok) {
        const data = await res.json();
        setExecutions(data.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch executions:', err);
    }
  };

  const handleSelectTask = (task: CanonicalTask) => {
    setSelectedTask(task);
    loadExecutions(task.taskId);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || newTitle,
          taskType: newType,
          priority: newPriority,
          privacyClass: newPrivacy,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewTitle('');
        setNewDesc('');
        setActionMessage(`Task ${data.task.taskId} submitted successfully!`);
        fetchData();
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDemo = async (type: 'summarize' | 'code' | 'arch' | 'confidential') => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${apiUrl}/runtime/demo-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`Demo task (${type}) dispatched: ${data.task.title}`);
        fetchData();
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = async (action: 'cancel' | 'pause' | 'resume' | 'retry' | 'approve' | 'reject', taskId: string) => {
    try {
      const res = await fetch(`${apiUrl}/tasks/${taskId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setActionMessage(`Action ${action.toUpperCase()} sent for task ${taskId}`);
        fetchData();
        if (selectedTask?.taskId === taskId) {
          loadExecutions(taskId);
        }
      }
    } catch (err: any) {
      setActionMessage(`Failed action: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-heading font-semibold text-slate-100">
              Agent Runtime & Task Orchestration Console
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic Task Engine, Agent State Machines, DAG Dependencies, and Concurrency Control.
          </p>
        </div>

        {/* Quick Demo Starters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mr-1">Demo Triggers:</span>
          <button
            onClick={() => handleTriggerDemo('summarize')}
            disabled={loading}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            📋 Analysis
          </button>
          <button
            onClick={() => handleTriggerDemo('code')}
            disabled={loading}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            💻 Code Task
          </button>
          <button
            onClick={() => handleTriggerDemo('arch')}
            disabled={loading}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            🏛️ Architecture
          </button>
          <button
            onClick={() => handleTriggerDemo('confidential')}
            disabled={loading}
            className="px-2.5 py-1 text-xs bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 rounded-lg border border-rose-800/60 transition"
          >
            🔒 Confidential
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-200 text-xs">Dismiss</button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Worker Slots</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {statusSummary ? `${statusSummary.activeTasks} / ${statusSummary.activeWorkers}` : '0 / 3'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Autonomous worker processes</div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Queue Depth</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {statusSummary?.queuedTasks ?? 0}
            <span className="text-xs text-rose-400 font-normal ml-2">
              ({statusSummary?.dlqTasks ?? 0} DLQ)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Weighted priority order</div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Digital Employees</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {statusSummary ? `${statusSummary.availableAgents} / ${statusSummary.totalAgents}` : '7 / 7'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Available for assignment</div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mb-1">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Host Resource Safeguard</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-100 flex items-center space-x-2">
            <span>CPU: {statusSummary?.systemResourcePressure.cpuUsagePercent ?? 0}%</span>
            <span className="text-slate-500">|</span>
            <span>RAM: {statusSummary?.systemResourcePressure.ramUsagePercent ?? 0}%</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {statusSummary?.systemResourcePressure.isThrottled ? (
              <span className="text-amber-400 font-semibold">Throttled (high pressure)</span>
            ) : (
              <span className="text-emerald-400">Normal operating parameters</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Create & Task Queue (Left), Detail & Executions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Task & Task Queue */}
        <div className="lg:col-span-7 space-y-4">
          {/* Create Task Form */}
          <form onSubmit={handleCreateTask} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Dispatch New Task</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="ANALYSIS">ANALYSIS</option>
                  <option value="PLANNING">PLANNING</option>
                  <option value="CODING">CODING</option>
                  <option value="TESTING">TESTING</option>
                  <option value="RESEARCH">RESEARCH</option>
                  <option value="DOCUMENTATION">DOCUMENTATION</option>
                  <option value="SECURITY">SECURITY</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="LOW">Priority: LOW</option>
                  <option value="NORMAL">Priority: NORMAL</option>
                  <option value="HIGH">Priority: HIGH</option>
                  <option value="URGENT">Priority: URGENT</option>
                </select>
              </div>

              <div>
                <select
                  value={newPrivacy}
                  onChange={(e) => setNewPrivacy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="INTERNAL">Privacy: INTERNAL</option>
                  <option value="CONFIDENTIAL">Privacy: CONFIDENTIAL (Local Only)</option>
                  <option value="PUBLIC">Privacy: PUBLIC</option>
                </select>
              </div>
            </div>

            <textarea
              rows={2}
              placeholder="Task instructions and description..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none font-mono"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !newTitle.trim()}
                className="py-1.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-semibold shadow-sm transition"
              >
                Submit to Queue
              </button>
            </div>
          </form>

          {/* Task Queue Table */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Task Queue & Lifecycle</span>
              </h3>
              <button
                onClick={fetchData}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                    <th className="pb-2 font-medium">Task</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Priority</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Assigned</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        No tasks in queue. Click a Demo Trigger or submit a task above.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => {
                      const isSelected = selectedTask?.taskId === task.taskId;
                      const isWaitingApproval = task.status === 'WAITING_APPROVAL';

                      return (
                        <tr
                          key={task.taskId}
                          onClick={() => handleSelectTask(task)}
                          className={`hover:bg-slate-800/40 cursor-pointer transition ${
                            isSelected ? 'bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="py-2.5 font-medium text-slate-200 truncate max-w-[180px]">
                            {task.title}
                          </td>
                          <td className="py-2.5 text-slate-400 font-mono text-[10px]">
                            {task.taskType}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                task.priority === 'URGENT'
                                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                                  : task.priority === 'HIGH'
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                                task.status === 'COMPLETED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : task.status === 'RUNNING'
                                  ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                                  : task.status === 'WAITING_APPROVAL'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : task.status === 'FAILED'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400 text-[11px] truncate max-w-[100px]">
                            {task.assignedAgent || 'Auto'}
                          </td>
                          <td className="py-2.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                            {isWaitingApproval && (
                              <button
                                onClick={() => handleTaskAction('approve', task.taskId)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-bold"
                              >
                                Approve
                              </button>
                            )}
                            {task.status === 'RUNNING' && (
                              <button
                                onClick={() => handleTaskAction('pause', task.taskId)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400"
                                title="Pause"
                              >
                                <Pause className="w-3 h-3" />
                              </button>
                            )}
                            {task.status === 'PAUSED' && (
                              <button
                                onClick={() => handleTaskAction('resume', task.taskId)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400"
                                title="Resume"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            )}
                            {task.status === 'FAILED' && (
                              <button
                                onClick={() => handleTaskAction('retry', task.taskId)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400"
                                title="Retry"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                            {!['COMPLETED', 'CANCELLED'].includes(task.status) && (
                              <button
                                onClick={() => handleTaskAction('cancel', task.taskId)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400"
                                title="Cancel"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Task Inspection & Live Executions */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active / Selected Task Details */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col min-h-[300px]">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Task Inspector</span>
              </span>
              {selectedTask && (
                <span className="font-mono text-[10px] text-slate-400">
                  {selectedTask.taskId}
                </span>
              )}
            </h3>

            {selectedTask ? (
              <div className="space-y-3 pt-3 flex-1 flex flex-col justify-between text-xs">
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">{selectedTask.title}</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{selectedTask.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500">Status: </span>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedTask.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Priority: </span>
                    <span className="font-mono text-slate-200">{selectedTask.priority}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Retries: </span>
                    <span className="font-mono text-slate-200">{selectedTask.retryCount} / {selectedTask.maxRetries}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned: </span>
                    <span className="font-mono text-slate-200">{selectedTask.assignedAgent || 'None'}</span>
                  </div>
                </div>

                {/* Result output if completed */}
                {selectedTask.result && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    <div className="text-[10px] text-emerald-400 font-bold mb-1">EXECUTION RESULT:</div>
                    {selectedTask.result.summary}
                  </div>
                )}

                {selectedTask.failureReason && (
                  <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                    <strong>Failure:</strong> {selectedTask.failureReason}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 italic">
                Select a task from the queue to view execution attempts and inspector details.
              </div>
            )}
          </div>

          {/* Execution History Card */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Execution Audit & Telemetry</span>
            </h3>

            {executions.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                No recorded executions for selected task yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {executions.map((exec) => (
                  <div key={exec.executionId} className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-300 font-semibold">Attempt #{exec.attempt}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        exec.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {exec.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>Agent: {exec.agentId}</span>
                      {exec.usage && (
                        <span>
                          {exec.usage.totalTokens} tokens (${exec.costUsd?.toFixed(6) ?? '0.00'})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
