// ==========================================================
// 3d/state/OfficeWorldStore.ts
// Central Authoritative 3D Living Office State Store & Real-time Client
// ==========================================================

import type {
  OfficeSnapshot,
  OfficeRoom,
  OfficeAgentDetail,
  OfficeProjectItem,
  OfficeMeeting,
  ServerNode,
  OfficePrayerSession,
  AgentOfficeEvent,
  WSEventEnvelope,
} from '@kdi/types';

export type OfficeConnectionStatus =
  | 'INITIALIZING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED';

export interface OfficeWorldState {
  rooms: Map<string, OfficeRoom>;
  agents: Map<string, OfficeAgentDetail>;
  projects: OfficeProjectItem[];
  meetings: OfficeMeeting[];
  serverNodes: ServerNode[];
  activePrayer: OfficePrayerSession | null;
  systemAlert: string | null;
  officeTime: string;
  connectionState: OfficeConnectionStatus;
  isInternalMode: boolean;
  is2DMode: boolean;
  selectedEntity: {
    type: 'AGENT' | 'PROJECT' | 'ROOM' | 'SERVER' | 'MEETING' | null;
    id: string | null;
    data: any | null;
  };
}

export type StoreListener = (state: OfficeWorldState) => void;

export class OfficeWorldStore {
  private static instance: OfficeWorldStore | null = null;

  private state: OfficeWorldState = {
    rooms: new Map(),
    agents: new Map(),
    projects: [],
    meetings: [],
    serverNodes: [],
    activePrayer: null,
    systemAlert: null,
    officeTime: new Date().toISOString(),
    connectionState: 'INITIALIZING',
    isInternalMode: true,
    is2DMode: false,
    selectedEntity: { type: null, id: null, data: null },
  };

  private listeners = new Set<StoreListener>();
  private ws: WebSocket | null = null;
  private reconnectTimer?: any;
  private reconnectAttempts = 0;
  private seenEventIds = new Set<string>();
  private readonly maxSeenEvents = 300;

  private apiUrl = '';
  private wsUrl = '';

  private constructor() {}

  public static getInstance(): OfficeWorldStore {
    if (!OfficeWorldStore.instance) {
      OfficeWorldStore.instance = new OfficeWorldStore();
    }
    return OfficeWorldStore.instance;
  }

  public init(apiUrl: string, wsUrl: string) {
    this.apiUrl = apiUrl;
    this.wsUrl = wsUrl;
    this.fetchAuthoritativeSnapshot().then(() => {
      this.connectWebSocket();
    });
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): OfficeWorldState {
    return this.state;
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[OfficeWorldStore] Listener error:', err);
      }
    }
  }

  /**
   * Fetch authoritative snapshot from backend REST API
   */
  public async fetchAuthoritativeSnapshot(): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/office/snapshot?internal=${this.state.isInternalMode}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Snapshot HTTP ${res.status}`);
      const snapshot: OfficeSnapshot = await res.json();
      this.applySnapshot(snapshot);
      return true;
    } catch (err) {
      console.warn('[OfficeWorldStore] Failed to fetch snapshot from backend:', err);
      return false;
    }
  }

  /**
   * Apply snapshot state authoritatively
   */
  public applySnapshot(snapshot: OfficeSnapshot) {
    const roomsMap = new Map<string, OfficeRoom>();
    for (const room of snapshot.rooms) {
      roomsMap.set(room.roomId, room);
    }

    const agentsMap = new Map<string, OfficeAgentDetail>();
    for (const agent of snapshot.agents) {
      agentsMap.set(agent.agentId, agent);
    }

    this.state = {
      ...this.state,
      rooms: roomsMap,
      agents: agentsMap,
      projects: snapshot.projects,
      meetings: snapshot.meetings,
      serverNodes: snapshot.serverNodes,
      activePrayer: snapshot.activePrayer || null,
      systemAlert: snapshot.systemAlert || null,
      officeTime: snapshot.officeTime,
    };

    this.notify();
  }

  /**
   * WebSocket stream management with exponential backoff & snapshot resync
   */
  public connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.updateConnectionState(
      this.reconnectAttempts === 0 ? 'CONNECTING' : 'RECONNECTING'
    );

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateConnectionState('CONNECTED');
        console.log('[OfficeWorldStore] Connected to live office WebSocket stream');
        // Authoritative resync on every reconnect
        this.fetchAuthoritativeSnapshot();
      };

      this.ws.onmessage = (event) => {
        try {
          const envelope: WSEventEnvelope<any> = JSON.parse(event.data);
          this.applyIncomingEvent(envelope);
        } catch (e) {
          console.error('[OfficeWorldStore] Error parsing WebSocket frame:', e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.updateConnectionState('RECONNECTING');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) this.ws.close();
      };
    } catch (err) {
      this.updateConnectionState('RECONNECTING');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    // Exponential backoff capped at 10 seconds
    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10_000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, backoffMs);
  }

  private updateConnectionState(status: OfficeConnectionStatus) {
    if (this.state.connectionState !== status) {
      this.state = { ...this.state, connectionState: status };
      this.notify();
    }
  }

  /**
   * Apply incremental WebSocket event with deduplication and out-of-order rejection
   */
  public applyIncomingEvent(envelope: WSEventEnvelope<any>): boolean {
    // 1. Deduplication Check
    if (envelope.eventId) {
      if (this.seenEventIds.has(envelope.eventId)) {
        // Discard duplicate event!
        return false;
      }
      this.seenEventIds.add(envelope.eventId);
      if (this.seenEventIds.size > this.maxSeenEvents) {
        const first = this.seenEventIds.values().next().value;
        if (first) this.seenEventIds.delete(first);
      }
    }

    const eventType = envelope.type;
    const data = envelope.data;

    // 2. Handle Office Events
    switch (eventType) {
      case 'office.agent.activity_changed':
      case 'office.agent.location_changed': {
        const agentEvent = data as AgentOfficeEvent;
        return this.applyAgentEvent(agentEvent);
      }

      case 'office.meeting.started':
      case 'office.meeting.updated': {
        const meeting = data as OfficeMeeting;
        const meetings = this.state.meetings.filter((m) => m.meetingId !== meeting.meetingId);
        meetings.unshift(meeting);
        this.state = { ...this.state, meetings };
        this.notify();
        return true;
      }

      case 'office.meeting.ended': {
        const meeting = data as OfficeMeeting;
        const meetings = this.state.meetings.filter((m) => m.meetingId !== meeting.meetingId);
        meetings.push(meeting);
        this.state = { ...this.state, meetings };
        this.notify();
        return true;
      }

      case 'office.prayer.started': {
        const session = data as OfficePrayerSession;
        this.state = { ...this.state, activePrayer: session };
        this.notify();
        return true;
      }

      case 'office.prayer.ended': {
        this.state = { ...this.state, activePrayer: null };
        this.notify();
        return true;
      }

      case 'office.server.updated': {
        const updatedNode = data as ServerNode;
        const serverNodes = this.state.serverNodes.map((n) =>
          n.serviceId === updatedNode.serviceId ? { ...n, ...updatedNode } : n
        );
        this.state = { ...this.state, serverNodes };
        this.notify();
        return true;
      }

      case 'office.system.alert': {
        this.state = { ...this.state, systemAlert: data.message || 'System Alert' };
        this.notify();
        return true;
      }

      case 'agent.status.changed': {
        // Fallback backward compatibility from Phase 3-5 event
        const agent = this.state.agents.get(data.agentId);
        if (agent) {
          agent.currentState = data.currentState;
          agent.activityState = data.currentState;
          if (data.activitySummary) agent.currentActivity = data.activitySummary;
          this.notify();
          return true;
        }
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * Apply Agent Office Event with strict out-of-order rejection
   */
  public applyAgentEvent(event: AgentOfficeEvent): boolean {
    const existing = this.state.agents.get(event.agentId);
    if (existing) {
      // Out-of-order check: Discard stale event with lower entityVersion!
      if (event.entityVersion < existing.entityVersion) {
        console.warn(
          `[OfficeWorldStore] Discarding stale out-of-order event for ${event.agentId}: event v${event.entityVersion} < current v${existing.entityVersion}`
        );
        return false;
      }

      existing.activityState = event.activityState;
      existing.runtimeStatus = event.runtimeState;
      existing.currentLocation = event.currentLocation;
      existing.targetLocation = event.targetLocation;
      existing.entityVersion = event.entityVersion;
      existing.lastUpdated = event.timestamp;
      if (event.taskId) existing.currentTaskId = event.taskId;
      if (event.projectId) existing.currentProjectId = event.projectId;
      if (event.metadata?.activitySummary) {
        existing.currentActivity = event.metadata.activitySummary as string;
      }
      if (event.metadata?.position) {
        existing.position = event.metadata.position as [number, number, number];
      }
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * Selection Controls
   */
  public selectEntity(
    type: 'AGENT' | 'PROJECT' | 'ROOM' | 'SERVER' | 'MEETING' | null,
    id: string | null,
    data: any | null = null
  ) {
    this.state = {
      ...this.state,
      selectedEntity: { type, id, data },
    };
    this.notify();
  }

  public clearSelection() {
    this.selectEntity(null, null, null);
  }

  /**
   * Toggle between Public and Internal mode
   */
  public setInternalMode(enabled: boolean) {
    if (this.state.isInternalMode !== enabled) {
      this.state = { ...this.state, isInternalMode: enabled };
      this.fetchAuthoritativeSnapshot();
    }
  }

  /**
   * Toggle between 3D PlayCanvas mode and 2D Office accessibility mode
   */
  public set2DMode(enabled: boolean) {
    this.state = { ...this.state, is2DMode: enabled };
    this.notify();
  }

  /**
   * Event Replay Engine for testing & reproducing recorded behaviors
   */
  public async replayEvents(
    events: AgentOfficeEvent[],
    speed = 1.0,
    onProgress?: (idx: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      this.applyAgentEvent(event);
      onProgress?.(i + 1, events.length);

      if (i < events.length - 1) {
        const currentTs = new Date(event.timestamp).getTime();
        const nextTs = new Date(events[i + 1].timestamp).getTime();
        const diffMs = Math.max(100, Math.min(nextTs - currentTs, 3000));
        await new Promise((res) => setTimeout(res, diffMs / speed));
      }
    }
  }
}
