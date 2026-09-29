// ==========================================================
// 3d/adapters/Agent3DStateAdapter.ts
// Maps raw backend states to normalized PlayCanvas visual states
// ==========================================================

import type { AgentState } from '@kdi/types';
import type { VisualState, VisualStateConfig } from '../state/types.js';

export class Agent3DStateAdapter {
  private static readonly STATE_MAP: Record<AgentState, VisualStateConfig> = {
    OFFLINE: {
      visualState: 'IDLE',
      color: '#475569',
      emissiveColor: '#0f172a',
      emissiveIntensity: 0.1,
      label: 'OFFLINE',
      animationTrigger: 'anim_offline',
      activityDescription: 'Agent process is offline / disconnected',
    },
    IDLE: {
      visualState: 'IDLE',
      color: '#3b82f6',
      emissiveColor: '#0284c7',
      emissiveIntensity: 0.35,
      label: 'IDLE',
      animationTrigger: 'anim_idle',
      activityDescription: 'Standing by at engineering workstation',
    },
    WORKING: {
      visualState: 'WORKING',
      color: '#10b981',
      emissiveColor: '#059669',
      emissiveIntensity: 0.9,
      label: 'WORKING',
      animationTrigger: 'anim_working',
      activityDescription: 'Executing active engineering task',
    },
    THINKING: {
      visualState: 'WORKING',
      color: '#8b5cf6',
      emissiveColor: '#7c3aed',
      emissiveIntensity: 0.8,
      label: 'THINKING',
      animationTrigger: 'anim_thinking',
      activityDescription: 'Analyzing codebase AST dependencies and prompt context',
    },
    PLANNING: {
      visualState: 'WORKING',
      color: '#06b6d4',
      emissiveColor: '#0891b2',
      emissiveIntensity: 0.8,
      label: 'PLANNING',
      animationTrigger: 'anim_planning',
      activityDescription: 'Decomposing task into atomic subtasks and patch plan',
    },
    CODING: {
      visualState: 'WORKING',
      color: '#10b981',
      emissiveColor: '#059669',
      emissiveIntensity: 0.95,
      label: 'CODING',
      animationTrigger: 'anim_coding',
      activityDescription: 'Applying surgical Tree-sitter AST patches in isolated worktree',
    },
    DEBUGGING: {
      visualState: 'WORKING',
      color: '#f59e0b',
      emissiveColor: '#d97706',
      emissiveIntensity: 0.85,
      label: 'DEBUGGING',
      animationTrigger: 'anim_debugging',
      activityDescription: 'Diagnosing traceback errors and test regressions',
    },
    TESTING: {
      visualState: 'WORKING',
      color: '#10b981',
      emissiveColor: '#059669',
      emissiveIntensity: 0.9,
      label: 'TESTING',
      animationTrigger: 'anim_testing',
      activityDescription: 'Running sandboxed automated unit and integration tests',
    },
    REVIEWING: {
      visualState: 'WORKING',
      color: '#a855f7',
      emissiveColor: '#9333ea',
      emissiveIntensity: 0.75,
      label: 'REVIEWING',
      animationTrigger: 'anim_reviewing',
      activityDescription: 'Conducting static code analysis and security verification',
    },
    MEETING: {
      visualState: 'MEETING',
      color: '#6366f1',
      emissiveColor: '#4f46e5',
      emissiveIntensity: 0.7,
      label: 'MEETING',
      animationTrigger: 'anim_meeting',
      activityDescription: 'Participating in collaborative team sync in Meeting Room',
    },
    BREAK: {
      visualState: 'BREAK',
      color: '#f97316',
      emissiveColor: '#ea580c',
      emissiveIntensity: 0.4,
      label: 'BREAK',
      animationTrigger: 'anim_break',
      activityDescription: 'Taking scheduled wellness recess in Break Area',
    },
    COFFEE: {
      visualState: 'BREAK',
      color: '#b45309',
      emissiveColor: '#92400e',
      emissiveIntensity: 0.5,
      label: 'COFFEE',
      animationTrigger: 'anim_coffee',
      activityDescription: 'Refreshing at Pantry coffee station (Context serialized)',
    },
    LUNCH: {
      visualState: 'BREAK',
      color: '#f59e0b',
      emissiveColor: '#d97706',
      emissiveIntensity: 0.4,
      label: 'LUNCH',
      animationTrigger: 'anim_lunch',
      activityDescription: 'Midday dining recess at Pantry',
    },
    PRAYING: {
      visualState: 'PRAYING',
      color: '#14b8a6',
      emissiveColor: '#0d9488',
      emissiveIntensity: 0.6,
      label: 'PRAYING',
      animationTrigger: 'anim_praying',
      activityDescription: 'Performing scheduled Salah in Musholla (Tasks non-blocking)',
    },
    READING: {
      visualState: 'IDLE',
      color: '#38bdf8',
      emissiveColor: '#0284c7',
      emissiveIntensity: 0.4,
      label: 'READING',
      animationTrigger: 'anim_reading',
      activityDescription: 'Consulting internal architectural documentation and ADRs',
    },
    TRAINING: {
      visualState: 'WORKING',
      color: '#8b5cf6',
      emissiveColor: '#6d28d9',
      emissiveIntensity: 0.7,
      label: 'TRAINING',
      animationTrigger: 'anim_training',
      activityDescription: 'Ingesting repository symbols into GraphRAG knowledge base',
    },
    MOVING: {
      visualState: 'WORKING',
      color: '#38bdf8',
      emissiveColor: '#0284c7',
      emissiveIntensity: 0.6,
      label: 'MOVING',
      animationTrigger: 'anim_moving',
      activityDescription: 'Navigating office corridors via NavMesh pathfinding',
    },
    WAITING_APPROVAL: {
      visualState: 'IDLE',
      color: '#f43f5e',
      emissiveColor: '#e11d48',
      emissiveIntensity: 0.8,
      label: 'WAITING APPROVAL',
      animationTrigger: 'anim_approval',
      activityDescription: 'Execution suspended awaiting human cryptographic approval',
    },
    ERROR: {
      visualState: 'ERROR',
      color: '#ef4444',
      emissiveColor: '#dc2626',
      emissiveIntensity: 1.0,
      label: 'ERROR',
      animationTrigger: 'anim_error',
      activityDescription: 'Encountered unhandled execution error or security exception',
    },
    COMPLETED: {
      visualState: 'IDLE',
      color: '#10b981',
      emissiveColor: '#059669',
      emissiveIntensity: 0.6,
      label: 'COMPLETED',
      animationTrigger: 'anim_completed',
      activityDescription: 'Task completed successfully; standing by for new assignments',
    },
  };

  public static toVisualConfig(backendState: AgentState): VisualStateConfig {
    return this.STATE_MAP[backendState] || this.STATE_MAP.IDLE;
  }

  public static toVisualState(backendState: AgentState): VisualState {
    return this.toVisualConfig(backendState).visualState;
  }
}
