// ==========================================================
// 3d/state/types.ts - 3D Visual State Definitions
// ==========================================================

import type { AgentState } from '@kdi/types';

export type VisualState = 'IDLE' | 'WORKING' | 'MEETING' | 'BREAK' | 'PRAYING' | 'ERROR';

export interface VisualStateConfig {
  visualState: VisualState;
  color: string;
  emissiveColor: string;
  emissiveIntensity: number;
  label: string;
  animationTrigger: string;
  activityDescription: string;
}

export interface SelectedAgentDetail {
  agentId: string;
  name: string;
  role: string;
  department: string;
  state: AgentState;
  visualState: VisualState;
  currentTask?: string;
  activitySummary?: string;
  isPublicSafe: boolean;
}
