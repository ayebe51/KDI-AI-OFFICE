# Operations Runbook — KDI AI Office

## 1. Routine Operational Procedures

### Starting and Stopping the Office
```bash
# Production start (detached)
docker compose -f infrastructure/compose/docker-compose.prod.yml up -d

# Graceful stop
curl -X POST http://127.0.0.1:3000/reliability/shutdown
```

### Performing Scheduled Health Sweeps
Execute weekly health check script:
```bash
bash infrastructure/scripts/health-check.sh
```

### Rotating Secrets
Update `.env.production`, run `npm run validate:prod`, and restart API:
```bash
docker compose -f infrastructure/compose/docker-compose.prod.yml restart api
```

### Triggering Manual Backups
```bash
curl -X POST http://127.0.0.1:3000/reliability/backups -H "Content-Type: application/json" -d '{"database":"POSTGRESQL","tier":"DAILY"}'
```
