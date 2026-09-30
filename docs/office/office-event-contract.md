# Office Event Contract

## 1. Normalized Event Envelope (`WSEventEnvelope<T>`)

```typescript
export interface WSEventEnvelope<T = unknown> {
  eventId: string;
  type: string;
  timestamp: string;
  channel: 'office:public' | 'portfolio:public' | 'office:events' | 'workforce:finance';
  data: T;
}
```

## 2. Agent Office Event Contract (`AgentOfficeEvent`)

```typescript
export interface AgentOfficeEvent {
  eventId: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  departmentId: string;
  projectId?: string;
  taskId?: string;
  executionId?: string;
  runtimeState: string;
  activityState: OfficeActivityState;
  previousActivity?: OfficeActivityState;
  currentLocation: string;
  targetLocation?: string;
  activityStartedAt: string;
  metadata: Record<string, unknown>;
  visibility: 'PUBLIC' | 'INTERNAL';
  entityVersion: number;
}
```

### Example Event Payload:
```json
{
  "eventId": "evt_1790732480_eng001",
  "type": "office.agent.activity_changed",
  "timestamp": "2026-09-30T01:41:20.000Z",
  "channel": "office:events",
  "data": {
    "eventId": "evt_1790732480_eng001",
    "timestamp": "2026-09-30T01:41:20.000Z",
    "agentId": "AGT-ENG-001",
    "agentName": "Farhan (AI Software Engineer)",
    "departmentId": "Engineering",
    "projectId": "prj_02J9X8OFFICE",
    "taskId": "tsk_bug_402",
    "runtimeState": "RUNNING",
    "activityState": "CODING",
    "previousActivity": "THINKING",
    "currentLocation": "RM-ENGINEERING",
    "targetLocation": null,
    "activityStartedAt": "2026-09-30T01:41:20.000Z",
    "metadata": {
      "position": [0, 0, 0.4],
      "activitySummary": "Applying surgical Tree-sitter AST patch in PickupService.ts"
    },
    "visibility": "PUBLIC",
    "entityVersion": 12
  }
}
```

## 3. Security Boundary & Non-Leak Rules
- **NEVER SEND:** Passwords, API tokens, SSH keys, private vault secrets, raw model prompts, or unredacted confidential code diffs.
- **PUBLIC SANITIZATION:** Public mode masks exact cost, execution token counts, and internal room identities.
