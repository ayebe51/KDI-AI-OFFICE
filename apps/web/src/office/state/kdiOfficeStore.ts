// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// Reactive Projection Store (Zustand)
// ==========================================================

import { create } from 'zustand';
import type {
  KdiAgentProjection,
  KdiTaskProjection,
  KdiApprovalProjection,
  KdiHealthProjection,
  OfficeUIPreferences,
} from '../types';
import { KdiOfficeAdapter, type KdiOfficeSnapshot } from '../adapters/KdiOfficeAdapter';
import { KdiHealthAdapter } from '../adapters/KdiHealthAdapter';
import { SecretSanitizer } from '../security/SecretSanitizer';

const PREFERENCES_STORAGE_KEY = 'kdi_office_ui_preferences_v1';

const DEFAULT_PREFERENCES: OfficeUIPreferences = {
  zoomLevel: 2.0,
  cameraPosition: { x: 0, y: 0 },
  soundVolume: 0.5,
  themePreference: 'kdi-corporate',
  panelLayout: 'split',
  selectedFloor: 'floor-1',
  showThoughtBubbles: true,
  showToolBadges: true,
};

function loadStoredPreferences(): OfficeUIPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: OfficeUIPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// Canonical KDI Workforce seeds when backend is disconnected
const SEED_EMPLOYEES = [
  {
    agentId: 'AGT-ENG-001',
    name: 'Farhan',
    role: 'Lead Autonomous Software Engineer',
    department: 'Autonomous Engineering',
    room: 'Engineering Pod A',
    currentState: 'CODING',
    currentActivity: 'Implementing authentication fix for SIMMACI',
    currentTaskId: 'TSK-ENG-001',
    currentTaskTitle: 'SIMMACI Auth Hardening',
    toolsInUse: ['Read', 'Edit', 'Bash'],
  },
  {
    agentId: 'AGT-MGR-001',
    name: 'Rian',
    role: '3D WebGL & Frontend Engineer',
    department: 'Frontend & Visual Experience',
    room: 'Design & Graphics Lab',
    currentState: 'PLANNING',
    currentActivity: 'Rendering Munder Difflin pixel-art office projection',
    toolsInUse: ['Web', 'Code'],
  },
  {
    agentId: 'AGT-ARCH-001',
    name: 'Ahmad',
    role: 'Principal Systems Architect',
    department: 'Systems Architecture',
    room: 'Architecture Suite',
    currentState: 'REVIEWING',
    currentActivity: 'Verifying GraphRAG provenance indexes in Neo4j',
    toolsInUse: ['Graph', 'Review'],
  },
  {
    agentId: 'AGT-QA-001',
    name: 'Nadia',
    role: 'QA Automation & Security Engineer',
    department: 'Security & Quality Assurance',
    room: 'Security Operations Lab',
    currentState: 'TESTING',
    currentActivity: 'Executing zero-regression security audit suite',
    toolsInUse: ['Test', 'Security'],
  },
  {
    agentId: 'AGT-PROD-001',
    name: 'Maya',
    role: 'Product & Workload Delivery Manager',
    department: 'Product & Workload Delivery',
    room: 'Delivery Center',
    currentState: 'PLANNING',
    currentActivity: 'Decomposing owner objective into atomic agent tasks',
    toolsInUse: ['Plan', 'Schedule'],
  },
  {
    agentId: 'AGT-SALES-001',
    name: 'Naya',
    role: 'Account Manager & Client Relations',
    department: 'Client Relations & Growth',
    room: 'Client Relations Lounge',
    currentState: 'IDLE',
    currentActivity: 'Monitoring inbound Telegram client inquiries',
    toolsInUse: ['Chat'],
  },
];

export interface OfficeState {
  snapshot: KdiOfficeSnapshot;
  selectedAgentId: string | null;
  selectedTaskId: string | null;
  activeTerminalAgentId: string | null;
  terminalLogs: Record<string, string[]>;
  wsConnected: boolean;
  preferences: OfficeUIPreferences;

  // Actions
  hydrateFromSnapshot: (
    employees?: any[],
    tasks?: any[],
    approvals?: any[],
    health?: any
  ) => void;
  applyWSEvent: (event: any) => void;
  selectAgent: (agentId: string | null) => void;
  selectTask: (taskId: string | null) => void;
  openTerminal: (agentId: string) => void;
  closeTerminal: () => void;
  appendTerminalLog: (agentId: string, logLine: string) => void;
  updatePreferences: (partial: Partial<OfficeUIPreferences>) => void;
  resolveApproval: (approvalId: string, decision: 'APPROVED' | 'REJECTED') => void;
  setWsConnected: (connected: boolean) => void;
}

const initialSnapshot = KdiOfficeAdapter.createInitialSnapshot(SEED_EMPLOYEES);

export const useKdiOfficeStore = create<OfficeState>((set, get) => ({
  snapshot: initialSnapshot,
  selectedAgentId: null,
  selectedTaskId: null,
  activeTerminalAgentId: null,
  terminalLogs: {
    'AGT-ENG-001': [
      '[FARHAN] Initializing SIMMACI auth validation suite...',
      '[FARHAN] Read /backend/config/database.php - connection verified.',
      '[FARHAN] Applying JWT Bearer token sanitization filter.',
      '[FARHAN] Executing unit tests: 125/125 passing.',
      '[FARHAN] Standing by for Telegram orchestrator dispatch.',
    ],
    'AGT-QA-001': [
      '[NADIA] Security test harness active.',
      '[NADIA] Scanning API routes for credential leaks: 0 leaks found.',
      '[NADIA] Autonomy Policy Level 2 active.',
    ],
  },
  wsConnected: false,
  preferences: loadStoredPreferences(),

  hydrateFromSnapshot: (employees, tasks, approvals, health) => {
    const rawEmps = employees && employees.length > 0 ? employees : SEED_EMPLOYEES;
    const nextSnapshot = KdiOfficeAdapter.createInitialSnapshot(
      rawEmps,
      tasks || [],
      approvals || [],
      health
    );
    set({ snapshot: nextSnapshot });
  },

  applyWSEvent: (event) => {
    const current = get().snapshot;
    const updated = KdiOfficeAdapter.applyEvent(current, event);
    set({ snapshot: updated });
  },

  selectAgent: (agentId) => {
    set({ selectedAgentId: agentId });
  },

  selectTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  openTerminal: (agentId) => {
    set({ activeTerminalAgentId: agentId });
  },

  closeTerminal: () => {
    set({ activeTerminalAgentId: null });
  },

  appendTerminalLog: (agentId, logLine) => {
    const sanitized = SecretSanitizer.sanitize(logLine);
    const existing = get().terminalLogs[agentId] || [];
    const updated = [...existing.slice(-200), sanitized]; // Keep last 200 lines
    set({
      terminalLogs: {
        ...get().terminalLogs,
        [agentId]: updated,
      },
    });
  },

  updatePreferences: (partial) => {
    const current = get().preferences;
    const updated = { ...current, ...partial };
    savePreferences(updated);
    set({ preferences: updated });
  },

  resolveApproval: (approvalId, decision) => {
    const current = get().snapshot;
    const updatedApprovals = current.approvals.map((a) =>
      a.id === approvalId ? { ...a, status: decision } : a
    );
    set({
      snapshot: {
        ...current,
        approvals: updatedApprovals,
      },
    });
  },

  setWsConnected: (connected) => {
    set({ wsConnected: connected });
  },
}));
