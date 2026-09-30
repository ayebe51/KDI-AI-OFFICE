# KDI Escalation Model & Severity Classification

## 1. Escalation Levels
- `INFO`: Informational event recorded in audit logs.
- `ATTENTION`: Non-blocking warning added to Daily Briefing attention items.
- `ACTION_REQUIRED`: High-priority alert requiring human operator intervention or approval.
- `CRITICAL`: Immediate operator notification; suppresses quiet hours restrictions; triggers incident creation.

## 2. Escalation Triggers
1. Repeated task failure threshold reached (>= 2 consecutive failures).
2. Automation loop detected by Causal Loop Prevention engine.
3. Budget limit reached or spending quota exceeded.
4. Security boundary modification or permission escalation attempted.
5. Critical infrastructure degradation or subsystem outage.
