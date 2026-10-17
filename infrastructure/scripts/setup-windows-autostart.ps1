# ==========================================================
# KDI AI Office — Windows User Autostart Setup (Phase 30.11)
# ==========================================================

[CmdletBinding()]
param(
  [switch]$Remove,
  [switch]$Check
)

$ErrorActionPreference = "Stop"

$startupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$shortcutPath = Join-Path $startupFolder "KDI-AI-Office-Autostart.lnk"
$scriptToRun = "D:\apss-source\KDI AI OFFICE\infrastructure\scripts\kdi-start.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- WINDOWS AUTOSTART CONFIGURATION " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Check) {
  if (Test-Path $shortcutPath) {
    Write-Host "[*] Status: Autostart shortcut is ENABLED." -ForegroundColor Green
    Write-Host "    Location: $shortcutPath" -ForegroundColor Gray
  } else {
    Write-Host "[*] Status: Autostart shortcut is NOT configured." -ForegroundColor Yellow
  }
  exit 0
}

if ($Remove) {
  if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "[+] Removed Windows autostart shortcut." -ForegroundColor Green
  } else {
    Write-Host "[*] Autostart shortcut was not found." -ForegroundColor Gray
  }
  exit 0
}

# Create Windows user startup shortcut
Write-Host "[+] Installing user-level autostart shortcut..." -ForegroundColor Yellow
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptToRun`" -Quiet"
$shortcut.WorkingDirectory = "D:\apss-source\KDI AI OFFICE"
$shortcut.Description = "Auto-starts KDI AI Office local Docker services upon operator login"
$shortcut.Save()

Write-Host "[+] Autostart shortcut successfully installed at:" -ForegroundColor Green
Write-Host "    $shortcutPath" -ForegroundColor White
Write-Host ""
Write-Host "OPERATIONAL ARCHITECTURE & LIMITATIONS NOTE:" -ForegroundColor Yellow
Write-Host "  1. Scope: Purely in current Windows user session ($env:USERNAME). No administrator elevation required." -ForegroundColor Gray
Write-Host "  2. Lifecycle: Upon Windows user login, the script quietly launches WSL2 and runs 'docker compose up -d'." -ForegroundColor Gray
Write-Host "  3. WSL Daemon: In WSL Ubuntu 24.04, docker.service is enabled via systemd, ensuring automatic container start." -ForegroundColor Gray
Write-Host "  4. Limitation: WSL2 requires the operator user account to log in to Windows before starting the WSL VM." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
