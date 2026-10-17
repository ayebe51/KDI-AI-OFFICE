# ==========================================================
# KDI AI Office — Local Service Restart Runner (Phase 30.11)
# ==========================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- RESTARTING LOCAL SERVICES " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$wslCmd = "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker compose -f compose.local.yaml --env-file .env.local restart"
wsl.exe -d Ubuntu -e bash -c $wslCmd

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to restart KDI local Docker services."
}

Write-Host "[+] Local services restarted successfully." -ForegroundColor Green
Write-Host "Checking status..." -ForegroundColor Gray
Start-Sleep -Seconds 3
& "$PSScriptRoot\kdi-status.ps1"
