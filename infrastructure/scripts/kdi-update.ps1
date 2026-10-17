# ==========================================================
# KDI AI Office — Local Build & Update Runner (Phase 30.11)
# ==========================================================

[CmdletBinding()]
param(
  [switch]$NoCache
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- LOCAL IMAGE REBUILD & UPDATE " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$cacheFlag = if ($NoCache) { "--no-cache" } else { "" }

Write-Host "[+] Rebuilding kdi-api:local-p30-10 in WSL..." -ForegroundColor Yellow
$buildApi = "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker build $cacheFlag -t kdi-api:local-p30-10 -f infrastructure/docker/Dockerfile.api ."
wsl.exe -d Ubuntu -e bash -c $buildApi

Write-Host "[+] Rebuilding kdi-web:local-p30-10 in WSL..." -ForegroundColor Yellow
$buildWeb = "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker build $cacheFlag -t kdi-web:local-p30-10 -f infrastructure/docker/Dockerfile.web ."
wsl.exe -d Ubuntu -e bash -c $buildWeb

Write-Host "[+] Recreating running containers with updated images..." -ForegroundColor Yellow
$upCmd = "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker compose -f compose.local.yaml --env-file .env.local up -d"
wsl.exe -d Ubuntu -e bash -c $upCmd

Write-Host "[+] Local update completed successfully." -ForegroundColor Green
& "$PSScriptRoot\kdi-status.ps1"
