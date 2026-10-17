# ==========================================================
# KDI AI Office — Windows Scheduled Backup Setup (Phase 30.11.1)
# ==========================================================

[CmdletBinding()]
param(
  [switch]$Remove,
  [switch]$Check,
  [string]$DailyTime = "23:00"
)

$ErrorActionPreference = "Stop"

$taskName = "KDI-AI-Office-Daily-Backup"
$scriptToRun = "D:\apss-source\KDI AI OFFICE\infrastructure\scripts\kdi-backup.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- WINDOWS SCHEDULED BACKUP SETUP " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Check) {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($task) {
    Write-Host "[*] Status: Scheduled backup task '$taskName' is REGISTERED." -ForegroundColor Green
    Write-Host "    State: $($task.State)" -ForegroundColor Gray
  } else {
    Write-Host "[*] Status: Scheduled backup task '$taskName' is NOT registered." -ForegroundColor Yellow
  }
  exit 0
}

if ($Remove) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "[+] Removed scheduled backup task '$taskName'." -ForegroundColor Green
  exit 0
}

# Create Scheduled Task in current user scope
Write-Host "[+] Registering Windows Scheduled Task for daily local backup..." -ForegroundColor Yellow

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptToRun`"" -WorkingDirectory "D:\apss-source\KDI AI OFFICE"
$trigger = New-ScheduledTaskTrigger -Daily -At $DailyTime
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Daily automated local backup of KDI AI Office databases (Postgres, Redis, Neo4j)" -Force | Out-Null

Write-Host "[+] Scheduled backup task '$taskName' successfully registered!" -ForegroundColor Green
Write-Host "    Scheduled Time: Daily at $DailyTime" -ForegroundColor Gray
Write-Host "    Script Target:  $scriptToRun" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
