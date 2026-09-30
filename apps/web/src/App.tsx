import React, { useState, useEffect, useRef } from 'react';
import { Box, Activity, Terminal, Shield, LogOut, Wifi, WifiOff, Cpu, Layers, Share2, Scale } from 'lucide-react';
import { OfficeCanvas } from './components/OfficeCanvas';
import { PlayCanvasApp, type SelectedAgentDetail } from './3d/index.js';
import { Dashboard } from './components/Dashboard';
import { SystemHealth } from './components/SystemHealth';
import { CommandCenter } from './components/CommandCenter';
import { LLMPlayground } from './components/LLMPlayground';
import { AgentRuntimeConsole } from './components/AgentRuntimeConsole';
import { EngineeringConsole } from './components/EngineeringConsole';
import { GraphMemoryConsole } from './components/GraphMemoryConsole';
import { Login } from './components/Login';
import { PortfolioGalleryView } from './components/portfolio/index.js';
import { WorkforceValuationDashboard } from './components/workforce/index';
import type { AgentState, WSEventEnvelope, AgentStatusChangedPayload } from '@kdi/types';

export function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kdi_token'));
  const [username, setUsername] = useState<string>(() => localStorage.getItem('kdi_user') || 'Operator');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'workforce' | '3d' | 'dashboard' | 'runtime' | 'engineering' | 'graph' | 'llm' | 'health' | 'command'>('portfolio');


  // Backend-driven demo agent state
  const [demoAgentState, setDemoAgentState] = useState<AgentState>('IDLE');
  const [demoAgentActivity, setDemoAgentActivity] = useState<string>('Standing by at engineering desk');
  const [activeModalAgent, setActiveModalAgent] = useState<SelectedAgentDetail | null>(null);

  // WebSocket telemetry feed
  const [wsConnected, setWsConnected] = useState(false);
  const [eventLog, setEventLog] = useState<WSEventEnvelope<unknown>[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/v1/events';

  // WebSocket lifecycle management
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    const connectWS = () => {
      try {
        const socket = new WebSocket(WS_URL);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
          console.log('[WS] Connected to KDI AI Office Telemetry Server');
        };

        socket.onmessage = (event) => {
          try {
            const envelope: WSEventEnvelope<unknown> = JSON.parse(event.data);
            setEventLog((prev) => [envelope, ...prev.slice(0, 49)]); // Keep last 50

            // If agent status event received, update 3D state immediately!
            if (envelope.type === 'agent.status.changed') {
              const payload = envelope.data as AgentStatusChangedPayload;
              if (payload.role === 'SOFTWARE_ENGINEER' || payload.agentId === 'AGT-ENG-001') {
                setDemoAgentState(payload.currentState);
                if (payload.activitySummary) {
                  setDemoAgentActivity(payload.activitySummary);
                }
              }
            }
          } catch (e) {
            console.error('[WS] Error parsing incoming frame:', e);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWS, 4000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWS, 4000);
      }
    };

    connectWS();
    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [WS_URL]);

  const handleLogin = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem('kdi_token', newToken);
    localStorage.setItem('kdi_user', newUsername);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('kdi_token');
    localStorage.removeItem('kdi_user');
  };

  // Trigger state toggle via backend API
  const handleToggleAgentState = async () => {
    try {
      const res = await fetch(`${API_URL}/agents/demo/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setDemoAgentState(data.agent.currentState);
        setDemoAgentActivity(data.agent.currentActivity);
      }
    } catch (err) {
      // Local development simulation fallback if API container is offline
      const nextState: AgentState = demoAgentState === 'IDLE' ? 'WORKING' : 'IDLE';
      setDemoAgentState(nextState);
      setDemoAgentActivity(
        nextState === 'WORKING'
          ? 'Writing AST code patch for module PickupService.ts:L48'
          : 'Standing by at engineering desk'
      );
      setEventLog((prev) => [
        {
          eventId: `evt_local_${Date.now()}`,
          type: 'agent.status.changed',
          timestamp: new Date().toISOString(),
          channel: 'office:events',
          data: {
            agentId: 'AGT-ENG-001',
            role: 'SOFTWARE_ENGINEER',
            previousState: demoAgentState,
            currentState: nextState,
            roomId: 'RM-05',
          },
        },
        ...prev,
      ]);
    }
  };

  if (!token) {
    return <Login onLogin={handleLogin} apiUrl={API_URL} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-heading font-bold shadow-md shadow-amber-500/20">
              KDI
            </div>
            <div>
              <h1 className="text-base font-heading font-bold tracking-tight text-slate-100 leading-tight">
                KDI AI OFFICE
              </h1>
              <span className="text-[10px] text-slate-400 block tracking-wider uppercase">
                Living Virtual Office • Digital Twin
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'portfolio'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Public Portfolio</span>
            </button>

            <button
              onClick={() => setActiveTab('workforce')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'workforce'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Workforce & Valuation</span>
            </button>

            <button
              onClick={() => setActiveTab('3d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === '3d'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Digital Twin</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Operations & Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('runtime')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'runtime'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Agent Runtime</span>
            </button>

            <button
              onClick={() => setActiveTab('engineering')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'engineering'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Engineering (Phase 4)</span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'graph'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Graph Memory (Phase 5)</span>
            </button>

            <button
              onClick={() => setActiveTab('llm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'llm'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Playground</span>
            </button>

            <button
              onClick={() => setActiveTab('health')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'health'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Infrastructure Health</span>
            </button>

            <button
              onClick={() => setActiveTab('command')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                activeTab === 'command'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>
          </nav>
        </div>

        {/* Right Status Badges & User Controls */}
        <div className="flex items-center space-x-4">
          {/* Realtime Stream Badge */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border bg-slate-900/60 border-slate-800">
            {wsConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Live Telemetry</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Connecting...</span>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{username}</span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'portfolio' && (
          <PortfolioGalleryView
            apiUrl={API_URL}
            onNavigateTo3D={() => setActiveTab('3d')}
          />
        )}

        {activeTab === '3d' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-heading font-semibold text-slate-100">
                  Engineering Floor • 3D Digital Twin Proof
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Zone RM-05 (Engineering Floor). Live avatar reacts dynamically to backend state changes.
                </p>
              </div>

              {/* Quick State Toggle in 3D View */}
              <button
                onClick={handleToggleAgentState}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-heading font-bold shadow-md transition"
              >
                Trigger State: {demoAgentState === 'IDLE' ? 'Switch to WORKING' : 'Switch to IDLE'}
              </button>
            </div>

            {/* 3D Scene Viewport: PlayCanvas React Technical Spike */}
            <div className="h-[620px] w-full">
              <PlayCanvasApp
                demoAgentState={demoAgentState}
                demoAgentActivity={demoAgentActivity}
                onOpenAgentDetail={(agent) => setActiveModalAgent(agent)}
              />
            </div>

            {/* Agent Detail Modal (Triggered by React Overlay Action) */}
            {activeModalAgent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-lg glass-panel rounded-2xl p-6 border border-amber-500/40 bg-slate-900 shadow-2xl space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-heading font-bold text-slate-100">
                        {activeModalAgent.name}
                      </h3>
                      <p className="text-xs text-amber-400 font-mono">
                        {activeModalAgent.agentId} • {activeModalAgent.role}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveModalAgent(null)}
                      className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Department:</span>
                      <span className="text-slate-200 font-medium">{activeModalAgent.department}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Current Backend State:</span>
                      <span className="font-mono text-emerald-400 font-semibold">{activeModalAgent.state}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">3D Visual State:</span>
                      <span className="font-mono text-amber-400 font-semibold">{activeModalAgent.visualState}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block mb-1 font-medium">Activity Telemetry:</span>
                      <p className="text-slate-300 leading-relaxed">
                        {activeModalAgent.activitySummary}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center space-x-2">
                      <span>🛡️</span>
                      <span>Zero-Trust Privacy: Credentials, source diffs, and private logs are isolated.</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveModalAgent(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'workforce' && (
          <WorkforceValuationDashboard apiUrl={API_URL} />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            apiUrl={API_URL}
            agentState={demoAgentState}
            agentActivity={demoAgentActivity}
            onToggleState={handleToggleAgentState}
            events={eventLog}
            isConnected={wsConnected}
          />
        )}

        {activeTab === 'runtime' && (
          <AgentRuntimeConsole apiUrl={API_URL} events={eventLog} isConnected={wsConnected} />
        )}

        {activeTab === 'engineering' && (
          <EngineeringConsole apiUrl={API_URL} events={eventLog} isConnected={wsConnected} />
        )}

        {activeTab === 'graph' && (
          <GraphMemoryConsole token={token} apiUrl={API_URL} />
        )}

        {activeTab === 'llm' && <LLMPlayground apiUrl={API_URL} />}

        {activeTab === 'health' && <SystemHealth apiUrl={API_URL} />}

        {activeTab === 'command' && <CommandCenter apiUrl={API_URL} events={eventLog} />}
      </main>
    </div>
  );
}
