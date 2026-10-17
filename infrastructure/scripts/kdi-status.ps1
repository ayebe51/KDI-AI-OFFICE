# ==========================================================
# KDI AI Office — Local Service Status & Health Inspector (Phase 30.11)
# ==========================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- LOCAL SERVICE STATUS & HEALTH " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Container Status
Write-Host "[+] Docker Containers:" -ForegroundColor Yellow
$wslCmd = "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker compose -f compose.local.yaml ps"
wsl.exe -d Ubuntu -e bash -c $wslCmd

Write-Host ""
Write-Host "[+] Endpoint Probes:" -ForegroundColor Yellow

# 2. Probe API Health
try {
  $apiHealth = Invoke-RestMethod -Uri "http://127.0.0.1:3000/health" -Method Get -TimeoutSec 3
  Write-Host "  * API Health (http://127.0.0.1:3000/health):" -ForegroundColor Green
  Write-Host "      Status: $($apiHealth.status)" -ForegroundColor Gray
  Write-Host "      Postgres: $($apiHealth.subsystems.postgres.status) ($($apiHealth.subsystems.postgres.latencyMs)ms)" -ForegroundColor Gray
  Write-Host "      Redis:    $($apiHealth.subsystems.redis.status) ($($apiHealth.subsystems.redis.latencyMs)ms)" -ForegroundColor Gray
  Write-Host "      Neo4j:    $($apiHealth.subsystems.neo4j.status) ($($apiHealth.subsystems.neo4j.latencyMs)ms)" -ForegroundColor Gray
} catch {
  Write-Host "  * API Health: UNREACHABLE ($($_.Exception.Message))" -ForegroundColor Red
}

# 3. Probe Web Dashboard
try {
  $webRes = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -Method Get -UseBasicParsing -TimeoutSec 3
  Write-Host "  * Web Dashboard (http://127.0.0.1:5173/): ONLINE (HTTP $($webRes.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "  * Web Dashboard: UNREACHABLE ($($_.Exception.Message))" -ForegroundColor Red
}

Write-Host "==========================================================" -ForegroundColor Cyan
