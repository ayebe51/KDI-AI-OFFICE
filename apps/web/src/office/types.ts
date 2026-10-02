// ==========================================================
// KDI AI OFFICE — MUNDER DIFFLIN UI MIGRATION
// Canonical Types and Projections for Office UI
// ==========================================================

export type OfficeAgentStatus =
  | 'IDLE'
  | 'WORKING'
  | 'PLANNING'
  | 'CODING'
  | 'DEBUGGING'
  | 'TESTING'
  | 'REVIEWING'
  | 'MEETING'
  | 'WAITING'
  | 'WAITING_APPROVAL'
  | 'BLOCKED'
  | 'PRAYING'
  | 'COMPLETED';

export interface KdiAgentProjection {
  id: string; // e.g. 'AGT-ENG-001' or 'farhan'
  displayName: string; // e.g. 'Farhan'
  role: string; // e.g. 'Lead Autonomous Software Engineer'
  status: OfficeAgentStatus;
  department: string;
  room: string;
  characterKey: 'farhan' | 'rian' | 'ahmad' | 'nadia' | 'maya' | 'naya';
  currentTaskId?: string;
  currentTaskTitle?: string;
  currentProjectId?: string;
  activity?: string;
  officeLocation?: string;
  seatLocation: { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' };
  currentLocation?: { x: number; y: number };
  toolsInUse?: string[];
  lastActiveTimestamp?: string;
  workloadLevel?: 'NORMAL' | 'HIGH' | 'OVERLOADED';
  isOverloaded?: boolean;
  learningActivity?: 'EXPERIMENTING' | 'RETROSPECTIVE' | 'RESEARCH' | 'NORMAL';
  strategicActivity?: 'MILESTONE_ACTIVE' | 'REPLANNING' | 'STRATEGIC_REVIEW' | 'NORMAL';
  activeMilestoneId?: string;
}

export interface KdiTaskProjection {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'WAITING_APPROVAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedAgentId?: string;
  assignedAgentName?: string;
  workingBranch?: string;
  createdAt: string;
  updatedAt: string;
  objectiveId?: string;
  correlationId?: string;
}

export interface KdiApprovalProjection {
  id: string;
  action: string;
  reason: string;
  agentId: string;
  agentName: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedImpact: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  files?: string[];
  commands?: string[];
  proposedDiff?: string;
  createdAt: string;
}

export interface SubsystemStatus {
  name: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latencyMs: number;
  message?: string;
}

export interface KdiHealthProjection {
  overall: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  subsystems: {
    postgres: SubsystemStatus;
    redis: SubsystemStatus;
    neo4j: SubsystemStatus;
    nestApi: SubsystemStatus;
    ollama: SubsystemStatus;
    agentRuntime: SubsystemStatus;
    websocket: SubsystemStatus;
    telegramGateway: SubsystemStatus;
  };
}

export interface KdiNormalizedEvent<T = unknown> {
  eventId: string;
  eventType:
    | 'agent.status.changed'
    | 'agent.location.changed'
    | 'task.created'
    | 'task.updated'
    | 'task.assigned'
    | 'task.completed'
    | 'task.blocked'
    | 'execution.started'
    | 'execution.progress'
    | 'execution.completed'
    | 'approval.required'
    | 'approval.decided'
    | 'incident.created'
    | 'incident.updated'
    | 'system.health.changed'
    | 'telegram.command.received'
    | 'orchestrator.decision.created'
    | 'learning.improvement.proposed'
    | 'learning.experiment.active'
    | 'learning.improvement.validated';
  timestamp: string;
  correlationId?: string;
  data: T;
}

export interface OfficeUIPreferences {
  zoomLevel: number;
  cameraPosition: { x: number; y: number };
  soundVolume: number;
  themePreference: 'kdi-corporate' | 'dark';
  panelLayout: 'split' | 'docked' | 'overlay';
  selectedFloor: string;
  showThoughtBubbles: boolean;
  showToolBadges: boolean;
}
