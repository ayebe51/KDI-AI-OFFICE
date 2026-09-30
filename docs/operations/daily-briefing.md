# KDI Daily Briefing Model

## 1. Structure
The `DailyBriefing` is generated on demand or at scheduled intervals from actual backend state:

1. **GOOD**: Confirmed healthy subsystems, completed objectives, passing tests, valid SSL certs.
2. **ATTENTION NEEDED**: Active incidents, pending approvals, elevated latency, stale tasks.
3. **BLOCKED**: Actions awaiting human cryptographic signoff or missing prerequisites.
4. **UPCOMING**: Scheduled recurring jobs and sprint deadlines.
5. **COMPLETED**: Operations, diagnostic sweeps, and task completions in the last 24 hours.
6. **COST**: Cumulative LLM token inference cost (USD), cloud infrastructure usage, and simulated digital employee compensation (IDR).

## 2. Zero Artificial Urgency
The briefing engine does not manufacture alarmist notices. Status categories reflect deterministic signals pulled from PostgreSQL, Neo4j, and the telemetry gateway.
