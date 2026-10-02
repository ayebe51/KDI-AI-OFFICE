import React, { useState, useEffect, useRef } from 'react';
import { Activity, Terminal, Shield, LogOut, Wifi, WifiOff, Cpu, Layers, Share2, Scale, Monitor, Building2 } from 'lucide-react';
import { OfficeFloorView } from './office/index';
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
import { CompanyOSView } from './components/CompanyOSView';
import type { AgentState, WSEventEnvelope, AgentStatusChangedPayload } from '@kdi/types';

// ── Navigation tab definitions ────────────────────────────────────────────────
const PUBLIC_TABS = [
  { id: 'office'     as const, label: 'KDI Studio',      icon: Monitor   },
  { id: 'portfolio'  as const, label: 'Portfolio',       icon: Layers    },
  { id: 'workforce'  as const, label: 'Workforce',       icon: Scale     },
  { id: 'company'    as const, label: 'Company OS',      icon: Building2 },
];

const OWNER_TABS = [
  { id: 'dashboard'   as const, label: 'Operations',     icon: Activity },
  { id: 'runtime'     as const, label: 'Agent Runtime',  icon: Layers   },
  { id: 'engineering' as const, label: 'Engineering',    icon: Terminal },
  { id: 'graph'       as const, label: 'Graph Memory',   icon: Share2   },
  { id: 'llm'         as const, label: 'AI Playground',  icon: Cpu      },
  { id: 'health'      as const, label: 'Infra Health',   icon: Shield   },
  { id: 'command'     as const, label: 'Command',        icon: Terminal },
];

export function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kdi_token') || 'guest_public_token');
  const [username, setUsername] = useState<string>(() => localStorage.getItem('kdi_user') || 'Pengunjung (Visitor)');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'office' | 'portfolio' | 'workforce' | 'company' | 'dashboard' | 'runtime' | 'engineering' | 'graph' | 'llm' | 'health' | 'command'>('office');

  const isOwner = Boolean(token && token !== 'guest_public_token');

  // Backend-driven demo agent state
  const [demoAgentState, setDemoAgentState] = useState<AgentState>('IDLE');
  const [demoAgentActivity, setDemoAgentActivity] = useState<string>('Standing by at engineering desk');

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
    setToken('guest_public_token');
    setUsername('Pengunjung (Visitor)');
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

  return (
    <div className="min-h-screen flex flex-col bg-[#eee9df] text-[#2a2622]">
      {/* Top Navigation Bar */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-3 border-b border-[#b4ae9f] bg-[#fffcf5]/90 backdrop-blur-md flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#2a2622] flex items-center justify-center text-[#fffcf5] font-heading font-bold shadow-xs border border-[#2a2622]">
              KDI
            </div>
            <div>
              <h1 className="text-base font-heading font-bold tracking-tight text-[#2a2622] leading-tight">
                KDI AI OFFICE
              </h1>
              <span className="text-[10px] text-[#5c554b] block tracking-wider uppercase font-mono">
                Living Virtual Office • Digital Twin
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#eee9df] p-1 rounded-xl border border-[#b4ae9f]">
            {/* Public tabs — always visible */}
            {PUBLIC_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                  activeTab === tab.id
                    ? 'bg-[#2a2622] text-[#fffcf5] font-semibold shadow-xs'
                    : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}

            {/* Owner-only tabs — shown only after login */}
            {isOwner && (
              <>
                <div className="w-px h-5 bg-[#b4ae9f] mx-1" />
                {OWNER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition ${
                      activeTab === tab.id
                        ? 'bg-[#385747] text-[#fffcf5] font-semibold shadow-xs'
                        : 'text-[#5c554b] hover:text-[#2a2622] hover:bg-[#e3dccd]'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* Right Status Badges & User Controls */}
        <div className="flex items-center space-x-4">
          {/* Realtime Stream Badge */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-medium border bg-[#fffcf5] border-[#b4ae9f] text-[#2a2622] shadow-2xs">
            {wsConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#385747]" />
                <span className="text-[#385747] font-semibold">Live Telemetry</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#c2410c]" />
                <span className="text-[#c2410c]">Connecting...</span>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-[#2a2622] font-mono">
            <span className={`w-2 h-2 rounded-full ${isOwner ? 'bg-[#c2410c]' : 'bg-[#385747]'}`}></span>
            <span>{username}</span>
          </div>

          {!isOwner ? (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1 rounded-lg bg-[#2a2622] hover:bg-[#385747] text-[#fffcf5] font-bold text-xs shadow-xs transition"
            >
              🔐 Login Owner
            </button>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg hover:bg-[#e3dccd] text-[#5c554b] hover:text-[#c2410c] transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content View Container */}
      <main className={activeTab === 'office' ? 'flex-1 overflow-hidden' : 'flex-1 p-6 max-w-7xl mx-auto w-full'}>
        {activeTab === 'office' && (
          <div className="w-full h-[calc(100vh-61px)] overflow-hidden">
            <OfficeFloorView apiUrl={API_URL} wsUrl={WS_URL} />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioGalleryView
            apiUrl={API_URL}
            onNavigateTo3D={() => setActiveTab('office')}
          />
        )}

        {activeTab === 'workforce' && (
          <WorkforceValuationDashboard apiUrl={API_URL} />
        )}

        {activeTab === 'company' && (
          <CompanyOSView apiUrl={API_URL} />
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

      {/* Guest to Owner Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#2a2622]/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 z-10 text-[#5c554b] hover:text-[#2a2622] p-2 rounded-xl hover:bg-[#e3dccd] transition"
            >
              ✕
            </button>
            <Login
              onLogin={(newToken, newUsername) => {
                handleLogin(newToken, newUsername);
                setShowLoginModal(false);
              }}
              apiUrl={API_URL}
            />
          </div>
        </div>
      )}
    </div>
  );
}
