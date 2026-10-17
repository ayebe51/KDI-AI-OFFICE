# ==========================================================
# KDI AI Office — Local Service Start Runner (Phase 30.11.1)
# ==========================================================

[CmdletBinding()]
param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$logDir = "D:\apss-source\KDI AI OFFICE\infrastructure\logs"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = Join-Path $logDir "startup.log"

function Write-StartupLog($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  if (-not $Quiet) {
    Write-Host $msg
  }
}

Write-StartupLog "=========================================================="
Write-StartupLog " KDI AI OFFICE -- STARTING LOCAL SELF-HOSTED SERVICES "
Write-StartupLog "=========================================================="

# 1. Probe and await WSL2 & Docker Engine availability (handles fresh boot scenario)
Write-StartupLog "[+] Verifying WSL2 and Docker Engine readiness..."
$dockerReady = $false
for ($attempt = 1; $attempt -le 10; $attempt++) {
  wsl.exe -d Ubuntu -e bash -c "docker info >/dev/null 2>&1"
  if ($LASTEXITCODE -eq 0) {
    $dockerReady = $true
    break
  }
  Write-StartupLog "    Waiting for Docker Engine in WSL to initialize (attempt $attempt/10)..."
  Start-Sleep -Seconds 2
}

if (-not $dockerReady) {
  Write-StartupLog "[!] ERROR: Docker Engine in WSL Ubuntu is not responding after 20s."
  Write-Error "Docker Engine in WSL is unavailable. Ensure WSL2 is installed and Docker service is active."
}

# 2. Check if all containers are already running to prevent duplicate work
$runningContainers = wsl.exe -d Ubuntu -e bash -c "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker compose -f compose.local.yaml ps --status running -q"
$runningCount = ($runningContainers | Where-Object { $_.Trim().Length -gt 0 }).Count

if ($runningCount -eq 5) {
  Write-StartupLog "[*] All 5 services are already running and active. Skipping redundant startup."
  Write-StartupLog "  * Web Dashboard:  http://127.0.0.1:5173/"
  Write-StartupLog "  * API Health:     http://127.0.0.1:3000/health"
  Write-StartupLog "  * Neo4j Browser:  http://127.0.0.1:7474/"
  exit 0
}

# 3. Launch stack via Docker Compose
Write-StartupLog "[+] Launching KDI local Docker Compose stack..."
$wslCmd = "cd '/mnt/d/apss-source/KDI AI OFFICE' && docker compose -f compose.local.yaml --env-file .env.local up -d"
$output = wsl.exe -d Ubuntu -e bash -c $wslCmd 2>&1

if ($LASTEXITCODE -ne 0) {
  Write-StartupLog "[!] ERROR: Failed to launch containers: $output"
  Write-Error "Failed to start KDI local Docker services: $output"
}

Write-StartupLog "[+] Local services launched successfully."
Write-StartupLog "  * Web Dashboard:  http://127.0.0.1:5173/"
Write-StartupLog "  * API Health:     http://127.0.0.1:3000/health"
Write-StartupLog "  * Neo4j Browser:  http://127.0.0.1:7474/"
Write-StartupLog "To monitor logs: npm run docker:logs"
