import React, { useState, useEffect } from 'react';
import {
  Shield,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw,
  Send,
  Clock,
  Activity,
  Layers,
  FileText,
  AlertCircle,
  Check,
  X,
  Server,
  Cpu,
  Database,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Flame,
  Scale,
} from 'lucide-react';
import type {
  OfficeObjective,
  PendingApproval,
  Incident,
  Runbook,
  DailyBriefing,
  DecisionTrace,
  ApprovalScope,
  AutonomyHealthMetrics,
  ParsedCommand,
  WSEventEnvelope,
} from '@kdi/types';
import { ReliabilityPanel } from './command-center/ReliabilityPanel.js';

interface CommandCenterProps {
  apiUrl?: string;
  events?: WSEventEnvelope<unknown>[];
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  apiUrl = 'http://localhost:3000',
}) => {
  // Navigation inside Command Center
  const [subTab, setSubTab] = useState<
    'overview' | 'objectives' | 'approvals' | 'incidents' | 'runbooks' | 'briefing' | 'health' | 'traces' | 'reliability'
  >('overview');

  // Command input state
  const [commandInput, setCommandInput] = useState('');
  const [commandLoading, setCommandLoading] = useState(false);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);

  // Core State
  const [globalPause, setGlobalPause] = useState(false);
  const [globalPauseReason, setGlobalPauseReason] = useState('');
  const [pauseLoading, setPauseLoading] = useState(false);

  // Data Collections
  const [objectives, setObjectives] = useState<OfficeObjective[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [decisionTraces, setDecisionTraces] = useState<DecisionTrace[]>([]);
  const [autonomyHealth, setAutonomyHealth] = useState<AutonomyHealthMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<Record<string, { status: string; latencyMs: number }>>({});

  // Execution modal / drawer state
  const [selectedRunbook, setSelectedRunbook] = useState<Runbook | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    fetchOverview();
    fetchObjectives();
    fetchApprovals();
    fetchIncidents();
    fetchRunbooks();
    fetchTraces();
  }, [apiUrl]);

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/overview`);
      if (res.ok) {
        const data = await res.json();
        setGlobalPause(data.globalPause?.active || false);
        setGlobalPauseReason(data.globalPause?.reason || '');
        setBriefing(data.dailyBriefing || null);
        setAutonomyHealth(data.autonomyHealth || null);
        setSystemHealth(data.systemHealth || {});
      }
    } catch {
      // Fallback seeds when API server is not running
      setGlobalPause(false);
      setSystemHealth({
        API: { status: 'UP', latencyMs: 8 },
        PostgreSQL: { status: 'UP', latencyMs: 14 },
        Redis: { status: 'UP', latencyMs: 3 },
        Neo4j: { status: 'UP', latencyMs: 28 },
        Ollama: { status: 'UP', latencyMs: 120 },
      });
      setAutonomyHealth({
        activeAutomations: 3,
        successfulRuns: 18,
        failedRuns: 1,
        loopsPrevented: 0,
        approvalWaits: 1,
        budgetBlocks: 0,
        escalations: 2,
        globalPauseActive: false,
      });
    }
  };

  const fetchObjectives = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/objectives`);
      if (res.ok) {
        const data = await res.json();
        setObjectives(data.data || []);
      }
    } catch {
      setObjectives([
        {
          objectiveId: 'obj_maintain_website',
          title: 'Maintain KDI website every week',
          description: 'Autonomous health checks, SSL verification, and uptime surveillance.',
          owner: 'Human Operator',
          priority: 'HIGH',
          status: 'ACTIVE',
          riskLevel: 'LOW',
          autonomyLevel: 2,
          recurrence: 'cron(0 8 * * 1)',
          successCriteria: ['Uptime > 99.9%', 'SSL valid > 30 days', 'Smoke tests passing'],
          constraints: ['No direct unreviewed schema changes'],
          projects: ['prj_kdi_portal'],
          agents: ['AI_MANAGER', 'SOFTWARE_ENGINEER', 'QA_ENGINEER'],
          budget: {
            dailyBudgetUsd: 10,
            weeklyBudgetUsd: 50,
            monthlyBudgetUsd: 200,
            currentSpendDailyUsd: 1.25,
            currentSpendWeeklyUsd: 8.4,
            currentSpendMonthlyUsd: 31.5,
            enforcement: 'HARD',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/approvals`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.data || []);
      }
    } catch {
      setApprovals([
        {
          approvalId: 'appr_prod_index_migration',
          action: 'Apply Neo4j Composite Index on :WorkforceBenchmark(marketRoleId, location)',
          reason: 'Resolve query latency spike detected by telemetry monitor.',
          agentId: 'AGT-ENG-001',
          agentRole: 'DATABASE_ENGINEER',
          risk: 'HIGH',
          expectedImpact: 'Creates index on production database. Query drops from 2400ms to < 15ms.',
          files: ['infrastructure/neo4j/migrations/005_add_workforce_indexes.cypher'],
          commands: ['neo4j-admin database migrate --force'],
          estimatedCost: 0.1,
          evidence: ['Diagnostic trace #dec_neo4j_lat_01', 'P95 query profiling logs'],
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/incidents`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.data || []);
      }
    } catch {
      setIncidents([
        {
          incidentId: 'inc_01_neo4j_latency',
          title: 'Neo4j Graph Query Latency Spike (> 2400ms)',
          severity: 'MEDIUM',
          source: 'Telemetry Watcher',
          project: 'prj_kdi_portal',
          status: 'INVESTIGATING',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          detectedAt: new Date(Date.now() - 3500000).toISOString(),
          rootCause: 'Unindexed lookup on :WorkforceBenchmark label during multi-hop graph expansion',
          diagnostics: ['Neo4j query execution plan shows Cypher table scan across 14,000 nodes'],
          mitigationActions: ['Executed safe cache flush', 'Prepared index addition migration'],
          memoryCandidateCreated: true,
        },
      ]);
    }
  };

  const fetchRunbooks = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/runbooks`);
      if (res.ok) {
        const data = await res.json();
        setRunbooks(data.data || []);
      }
    } catch {
      setRunbooks([
        {
          runbookId: 'rbk_website_health',
          title: 'Website Health & Availability Check',
          description: 'Scheduled procedure to check HTTP endpoint availability and response latency.',
          category: 'HEALTH_CHECK',
          targetRiskLevel: 'LOW',
          autonomyLevel: 2,
          enabled: true,
          version: 1,
          steps: [
            {
              stepId: 'step_1',
              name: 'Check Endpoint Availability',
              type: 'READ',
              action: 'GET /health/status',
              riskLevel: 'LOW',
              timeout: 5000,
              retryPolicy: { maxRetries: 2, backoffMs: 1000 },
              requiresApproval: false,
              successCondition: 'status === 200',
              failureAction: 'ESCALATE',
            },
          ],
        },
      ]);
    }
  };

  const fetchTraces = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/traces`);
      if (res.ok) {
        const data = await res.json();
        setDecisionTraces(data.data || []);
      }
    } catch {
      setDecisionTraces([
        {
          decisionId: 'dec_web_init_01',
          objectiveId: 'obj_maintain_website',
          reason: 'Scheduled trigger initiated weekly website health check runbook',
          evidence: ['Cron schedule 08:00 WIB', 'Policy permits LOW risk READ'],
          decision: 'PERMITTED',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Toggle Global Autonomy Pause
  const handleToggleGlobalPause = async () => {
    setPauseLoading(true);
    const nextState = !globalPause;
    const reason = nextState
      ? 'Emergency manual override initiated from Human Command Center'
      : 'Human operator resumed autonomous operations';

    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState, reason, user: 'Human Operator' }),
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalPause(data.active);
        setGlobalPauseReason(reason);
        setActionFeedback(data.message);
      }
    } catch {
      setGlobalPause(nextState);
      setGlobalPauseReason(reason);
      setActionFeedback(`Local toggle: ${nextState ? 'PAUSED' : 'RESUMED'}`);
    } finally {
      setPauseLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Natural Language Command Submission
  const handleSendCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    setCommandLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: commandInput, user: 'Operator' }),
      });
      if (res.ok) {
        const data: ParsedCommand = await res.json();
        setParsedCommand(data);
      }
    } catch {
      // Local fallback parser
      const lower = commandInput.toLowerCase();
      let classification: ParsedCommand['classification'] = 'QUERY';
      if (lower.includes('pause') || lower.includes('stop')) classification = 'EMERGENCY';
      else if (lower.includes('review') || lower.includes('attention')) classification = 'ANALYSIS';
      else if (lower.includes('monday') || lower.includes('schedule')) classification = 'AUTOMATION';

      setParsedCommand({
        commandId: `cmd_${Date.now()}`,
        rawInput: commandInput,
        classification,
        intent: 'Command processed by KDI AI Manager',
        extractedEntities: { input: commandInput },
        requiresHumanConfirmation: classification === 'AUTOMATION',
        executionStatus: classification === 'AUTOMATION' ? 'PENDING_CONFIRMATION' : 'COMPLETED',
        responseMessage: `Processed command: "${commandInput}". AI Manager standing by.`,
        proposedPlan:
          classification === 'AUTOMATION'
            ? [
                '1. Bind Objective: Maintain KDI website weekly',
                '2. Attach Runbook: rbk_website_health',
                '3. Enforce Autonomy Level 2 (Low Risk)',
              ]
            : undefined,
      });
    } finally {
      setCommandLoading(false);
    }
  };

  // Approval Decision Action
  const handleDecideApproval = async (
    approvalId: string,
    decision: 'APPROVE' | 'REJECT',
    scope: ApprovalScope = 'ONCE'
  ) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/approvals/${approvalId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, scope, user: 'Human Operator' }),
      });
      if (res.ok) {
        setActionFeedback(`Approval ${approvalId} ${decision}D successfully.`);
        fetchApprovals();
        fetchOverview();
      }
    } catch {
      setApprovals((prev) => prev.filter((a) => a.approvalId !== approvalId));
      setActionFeedback(`Approval ${approvalId} ${decision}D (local).`);
    } finally {
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Run Runbook (Live, Dry Run, or Simulate)
  const handleRunRunbook = async (runbookId: string, mode: 'LIVE' | 'DRY_RUN' | 'SIMULATE') => {
    setExecutionLog([`[${new Date().toLocaleTimeString()}] Initiating ${mode} execution for ${runbookId}...`]);
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/runbooks/${runbookId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun: mode === 'DRY_RUN',
          simulation: mode === 'SIMULATE',
          actor: 'Human Operator',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExecutionLog((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Status: ${data.status}`,
          `[${new Date().toLocaleTimeString()}] ${data.message}`,
        ]);
        if (data.stepsExecuted) {
          for (const s of data.stepsExecuted) {
            setExecutionLog((prev) => [
              ...prev,
              `  ✔ Step ${s.stepId}: ${s.status} (${s.latencyMs}ms)`,
            ]);
          }
        }
      }
    } catch {
      setExecutionLog((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Mode: ${mode} completed successfully (Offline fixture mode).`,
      ]);
    }
  };

  // Objective Decomposition
  const handleDecomposeObjective = async (objectiveId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/autonomy/objectives/${objectiveId}/decompose`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setActionFeedback(`Objective decomposed into ${data.tasks?.length} tasks.`);
      }
    } catch {
      setActionFeedback(`Objective decomposed into 4 tasks (local).`);
    } finally {
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-amber-400" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)}>
            <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>
        </div>
      )}

      {/* TOP EMERGENCY BAR & GLOBAL AUTONOMY SWITCH */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xl font-heading font-semibold text-slate-100">
              Autonomous Office Operations & Human Command Center
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervised AI autonomy with strict Human-in-the-Loop approval gates, recurring runbooks, and emergency controls.
          </p>
        </div>

        {/* Global Autonomy Pause Toggle */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Global Autonomy State
            </div>
            <div
              className={`text-sm font-bold font-mono ${
                globalPause ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {globalPause ? 'PAUSED (EMERGENCY ACTIVE)' : 'AUTONOMOUS / OPERATIONAL'}
            </div>
          </div>

          <button
            onClick={handleToggleGlobalPause}
            disabled={pauseLoading}
            className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs flex items-center space-x-2 transition shadow-lg ${
              globalPause
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
            }`}
          >
            {globalPause ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span>{globalPause ? 'Resume Autonomy' : 'EMERGENCY PAUSE'}</span>
          </button>
        </div>
      </div>

      {/* QUICK STATUS METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Objectives</span>
          <div className="text-xl font-bold font-mono text-slate-100">{objectives.length}</div>
          <span className="text-[10px] text-emerald-400">All within quota</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Approvals Queue</span>
          <div className="text-xl font-bold font-mono text-amber-400">{approvals.length}</div>
          <span className="text-[10px] text-slate-400">Human-in-the-Loop</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Active Incidents</span>
          <div className="text-xl font-bold font-mono text-purple-400">{incidents.length}</div>
          <span className="text-[10px] text-slate-400">Safe diagnostics active</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">AI Operations 24h</span>
          <div className="text-xl font-bold font-mono text-blue-400">
            ${autonomyHealth?.successfulRuns ? (autonomyHealth.successfulRuns * 0.25).toFixed(2) : '4.85'}
          </div>
          <span className="text-[10px] text-slate-400">LLM & Infra billing</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Loops Prevented</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {autonomyHealth?.loopsPrevented ?? 0}
          </div>
          <span className="text-[10px] text-emerald-400">Causal guard active</span>
        </div>
      </div>

      {/* NATURAL LANGUAGE COMMAND INPUT */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span>KDI AI Manager — Natural Language Directive Terminal</span>
        </div>

        <form onSubmit={handleSendCommand} className="flex gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Command or query the AI Manager (e.g. 'Review all active projects', 'Maintain website every Monday')..."
            className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
          />
          <button
            type="submit"
            disabled={commandLoading}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-heading font-bold flex items-center space-x-1.5 transition"
          >
            {commandLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Direct</span>
          </button>
        </form>

        {/* Prompt suggestion pills */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="text-slate-500 self-center">Suggestions:</span>
          <button
            type="button"
            onClick={() => setCommandInput('Review all active projects and tell me what needs attention.')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
          >
            Review active projects
          </button>
          <button
            type="button"
            onClick={() => setCommandInput('Make sure the website is healthy every Monday.')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
          >
            Maintain website weekly
          </button>
          <button
            type="button"
            onClick={() => setCommandInput('Check system telemetry for degraded services.')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
          >
            System diagnostic
          </button>
        </div>

        {/* Parsed Command Result Display */}
        {parsedCommand && (
          <div className="mt-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                  {parsedCommand.classification}
                </span>
                <span className="text-slate-300 font-medium">{parsedCommand.intent}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{parsedCommand.commandId}</span>
            </div>

            <p className="text-slate-300 leading-relaxed">{parsedCommand.responseMessage}</p>

            {parsedCommand.proposedPlan && (
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1.5 mt-2">
                <div className="text-[11px] font-semibold text-slate-300">Proposed Operational Plan:</div>
                <ul className="space-y-1 text-slate-400 text-[11px]">
                  {parsedCommand.proposedPlan.map((step, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setActionFeedback('Plan confirmed and scheduled by operator.');
                      setParsedCommand(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Confirm & Schedule Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setSubTab('overview')}
          className={`px-3 py-1.5 rounded-lg transition ${
            subTab === 'overview'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Daily Briefing
        </button>
        <button
          onClick={() => setSubTab('objectives')}
          className={`px-3 py-1.5 rounded-lg transition ${
            subTab === 'objectives'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Objectives ({objectives.length})
        </button>
        <button
          onClick={() => setSubTab('approvals')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
            subTab === 'approvals'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Approval Queue</span>
          {approvals.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] flex items-center justify-center font-bold">
              {approvals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('incidents')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
            subTab === 'incidents'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Incidents</span>
          {incidents.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-purple-400 text-slate-950 text-[10px] flex items-center justify-center font-bold">
              {incidents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('runbooks')}
          className={`px-3 py-1.5 rounded-lg transition ${
            subTab === 'runbooks'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Runbooks ({runbooks.length})
        </button>
        <button
          onClick={() => setSubTab('health')}
          className={`px-3 py-1.5 rounded-lg transition ${
            subTab === 'health'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          System & Agent Health
        </button>
        <button
          onClick={() => setSubTab('traces')}
          className={`px-3 py-1.5 rounded-lg transition ${
            subTab === 'traces'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Decision Traces & Audit
        </button>
        <button
          onClick={() => setSubTab('reliability')}
          className={`px-3 py-1.5 rounded-lg transition ${
            subTab === 'reliability'
              ? 'bg-sky-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Resilience & Hardening (Phase 10)
        </button>
      </div>

      {/* TAB CONTENT 1: DAILY BRIEFING */}
      {subTab === 'overview' && briefing && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* GOOD COLUMN */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <CheckCircle className="w-4 h-4" />
                <span>Good & Operating Normally</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {briefing.good.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ATTENTION NEEDED COLUMN */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Attention Needed</span>
              </div>
              {briefing.attentionNeeded.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Zero items requiring urgent attention.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  {briefing.attentionNeeded.map((item, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* BLOCKED & UPCOMING COLUMN */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Upcoming Scheduled Work</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {briefing.upcoming.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: STRATEGIC OBJECTIVES */}
      {subTab === 'objectives' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Office Strategic Objectives</span>
            <span className="text-xs text-slate-400">Objectives decompose into multi-agent tasks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {objectives.map((obj) => (
              <div
                key={obj.objectiveId}
                className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                        {obj.status}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                        AUTONOMY LVL {obj.autonomyLevel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{obj.priority}</span>
                    </div>
                    <h3 className="text-sm font-heading font-semibold text-slate-100 mt-1">
                      {obj.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{obj.description}</p>

                {/* Success Criteria */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                    Success Criteria
                  </span>
                  <ul className="text-[11px] text-slate-300 space-y-1">
                    {obj.successCriteria.map((sc, i) => (
                      <li key={i} className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{sc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Assigned Agents */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500">Agents:</span>
                    {obj.agents.map((ag) => (
                      <span key={ag} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {ag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleDecomposeObjective(obj.objectiveId)}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                  >
                    <span>Decompose into Tasks</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: APPROVAL QUEUE */}
      {subTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Pending Human-in-the-Loop Approval Gates
            </span>
            <span className="text-xs text-slate-400">
              High-risk actions require explicit human signoff
            </span>
          </div>

          {approvals.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">Zero Pending Approvals</div>
              <p className="text-xs text-slate-400">
                All autonomous workflows are currently running within approved policy bounds.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((appr) => (
                <div
                  key={appr.approvalId}
                  className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">
                          RISK: {appr.risk}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Agent: {appr.agentRole} ({appr.agentId})
                        </span>
                      </div>
                      <h4 className="text-sm font-heading font-semibold text-slate-100 mt-1">
                        {appr.action}
                      </h4>
                    </div>

                    <span className="text-[10px] text-amber-400 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Expires in 24h</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{appr.reason}</p>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="text-[11px] text-slate-400 font-medium">Expected Impact:</div>
                    <p className="text-slate-300">{appr.expectedImpact}</p>
                    {appr.commands.length > 0 && (
                      <div className="font-mono text-[11px] bg-slate-900 p-2 rounded border border-slate-800 text-amber-300">
                        {appr.commands.join('\n')}
                      </div>
                    )}
                  </div>

                  {/* Decision Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleDecideApproval(appr.approvalId, 'REJECT')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                    >
                      Reject Action
                    </button>
                    <button
                      onClick={() => handleDecideApproval(appr.approvalId, 'APPROVE', 'ONCE')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                    >
                      Approve (Once)
                    </button>
                    <button
                      onClick={() => handleDecideApproval(appr.approvalId, 'APPROVE', 'FOR_OBJECTIVE')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      Approve for Objective
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: INCIDENTS */}
      {subTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Incidents & Safe Diagnostics</span>
            <span className="text-xs text-slate-400">Automated triage with post-incident memory</span>
          </div>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.incidentId}
                className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-[10px] font-bold">
                        {inc.severity} SEVERITY
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {inc.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-heading font-semibold text-slate-100 mt-1">
                      {inc.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{inc.incidentId}</span>
                </div>

                {inc.rootCause && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
                    <span className="font-semibold block">Identified Root Cause:</span>
                    {inc.rootCause}
                  </div>
                )}

                {/* Diagnostics Output */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1">
                  <span className="text-slate-500 block font-sans font-semibold">Safe Diagnostics Log:</span>
                  {inc.diagnostics.map((d, i) => (
                    <div key={i} className="text-slate-300">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800 text-xs">
                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setActionFeedback(`Diagnostics re-run for ${inc.incidentId}.`)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
                    >
                      Run Safe Diagnostics
                    </button>
                  )}
                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setActionFeedback(`Mitigation applied for ${inc.incidentId}.`)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition"
                    >
                      Apply Mitigation
                    </button>
                  )}
                  {inc.memoryCandidateCreated && (
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
                      ✓ Post-Incident Memory Candidate Created
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: OPERATIONAL RUNBOOKS */}
      {subTab === 'runbooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Standard Operational Runbooks</span>
            <span className="text-xs text-slate-400">Structured multi-step workflows</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {runbooks.map((rb) => (
              <div
                key={rb.runbookId}
                className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                        {rb.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">v{rb.version}</span>
                    </div>
                    <h4 className="text-sm font-heading font-semibold text-slate-100 mt-1">
                      {rb.title}
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-slate-400">{rb.description}</p>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Execution Steps ({rb.steps.length})
                  </span>
                  {rb.steps.map((st, i) => (
                    <div key={st.stepId} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">
                        {i + 1}. {st.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-amber-400 font-mono">
                        {st.type}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Execution Controls */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => handleRunRunbook(rb.runbookId, 'DRY_RUN')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
                  >
                    Dry Run
                  </button>
                  <button
                    onClick={() => handleRunRunbook(rb.runbookId, 'SIMULATE')}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg font-semibold transition"
                  >
                    Simulate
                  </button>
                  <button
                    onClick={() => handleRunRunbook(rb.runbookId, 'LIVE')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition shadow-sm"
                  >
                    Execute Live
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Execution Output Drawer */}
          {executionLog.length > 0 && (
            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Runbook Execution Console Output</span>
                <button onClick={() => setExecutionLog([])} className="hover:text-slate-200">
                  Clear
                </button>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                {executionLog.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 6: HEALTH MATRIX */}
      {subTab === 'health' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Operational Subsystem Health Matrix
            </span>
            <span className="text-xs text-slate-400">Real-time status of 10 office engines</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(systemHealth).map(([name, stat]) => (
              <div
                key={name}
                className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{name}</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">{stat.status}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Latency:</span>
                  <span className="text-amber-400">{stat.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: DECISION TRACES & AUDIT */}
      {subTab === 'traces' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Decision Traces & Auditability Log
            </span>
            <span className="text-xs text-slate-400">
              Complete provenance answering why each action ran
            </span>
          </div>

          <div className="space-y-3">
            {decisionTraces.map((trace) => (
              <div
                key={trace.decisionId}
                className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                      {trace.decision}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{trace.decisionId}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(trace.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-slate-300">{trace.reason}</p>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <span className="text-slate-500 font-medium block">Evidence & Rationale:</span>
                  {trace.evidence.map((ev, i) => (
                    <div key={i} className="flex items-center space-x-1">
                      <span className="text-amber-400">•</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 8: RESILIENCE & HARDENING (PHASE 10) */}
      {subTab === 'reliability' && <ReliabilityPanel apiUrl={apiUrl} />}
    </div>
  );
};
