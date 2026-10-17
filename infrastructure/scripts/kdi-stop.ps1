# ==========================================================
# KDI AI Office — Local Service Stop Runner (Phase 30.11)
# ==========================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- STOPPING LOCAL SERVICES (SAFE SHUTDOWN) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$wslCmd = "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker compose -f compose.local.yaml down"
wsl.exe -d Ubuntu -e bash -c $wslCmd

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to gracefully stop KDI local Docker services."
}

Write-Host "[+] Local containers stopped cleanly." -ForegroundColor Green
Write-Host "[*] Persistent data volumes (PostgreSQL, Neo4j, Redis) preserved." -ForegroundColor Gray
