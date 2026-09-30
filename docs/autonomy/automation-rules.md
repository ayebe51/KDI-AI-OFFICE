# KDI Automation Rules & Loop Prevention

## 1. Automation Rule Model
```typescript
export interface AutomationRule {
  ruleId: string;
  name: string;
  description: string;
  trigger: { type: TriggerType; config?: Record<string, any> };
  condition?: { field: string; operator: string; value: any };
  action: { type: RunbookActionType; target: string; params?: Record<string, any> };
  runbookId?: string;
  autonomyLevel: AutonomyLevel;
  riskLevel: RiskLevel;
  enabled: boolean;
  cooldown: number; // Seconds
  maxRuns: number;
  runsCount: number;
}
```

## 2. Loop Prevention & Guard Mechanisms
To prevent catastrophic runaway feedback loops:
1. **Cooldown Windows**: Enforces an unskippable minimum quiet period between rule firings (e.g. 300s or 3600s).
2. **Duplicate Trigger Suppression**: Fingerprints event payloads using sha256 signatures to reject rapid bursts within 60s windows.
3. **Causal Event Tracking**: Tracks entity causal chains (e.g. `service.failure` → `automation.edit` → `service.failure`). If 3 oscillating cycles occur within 60 seconds, the rule is automatically disabled and an `ACTION_REQUIRED` escalation is issued.
4. **Budget Guard Limiters**: Global limits cap cumulative executions, duration, token inference, and tool calls.
