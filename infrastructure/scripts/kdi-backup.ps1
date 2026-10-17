# ==========================================================
# KDI AI Office — Local Automated Backup Script (Phase 30.11)
# ==========================================================

[CmdletBinding()]
param(
  [string]$BackupBaseDir = "D:\apss-source\KDI AI OFFICE\backups",
  [int]$RetentionCount = 7
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- LOCAL SELF-HOSTED BACKUP RUNNER " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Docker containers are running
$psCheck = wsl.exe -d Ubuntu -e bash -c "docker compose -f '/mnt/d/apss-source/KDI AI OFFICE/compose.local.yaml' ps --format '{{.Name}}'"
if ($LASTEXITCODE -ne 0 -or (($psCheck -join "`n") -notmatch "kdi_postgres_local")) {
  Write-Error "CRITICAL: KDI local containers are not running. Start them first with 'npm run docker:up'."
}

# 2. Prepare timestamped backup directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetDir = Join-Path $BackupBaseDir "backup_$timestamp"
if (-not (Test-Path $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# Convert Windows path to WSL mount path
$wslTargetDir = $targetDir.Replace("\", "/").Replace("D:", "/mnt/d").Replace("d:", "/mnt/d")

Write-Host "[+] Target backup directory: $targetDir" -ForegroundColor Green
Write-Host "    (WSL mount: $wslTargetDir)" -ForegroundColor DarkGray

# 3. PostgreSQL Backup (Custom Compressed Format)
Write-Host "[+] Exporting PostgreSQL (kdi_ai_office_local)..." -ForegroundColor Yellow
$pgDumpPath = Join-Path $targetDir "postgres.dump"
$cmdPg = "docker exec -i kdi_postgres_local pg_dump -U kdi_local_admin -d kdi_ai_office_local -F c > '$wslTargetDir/postgres.dump'"
wsl.exe -d Ubuntu -e bash -c $cmdPg

if (-not (Test-Path $pgDumpPath) -or (Get-Item $pgDumpPath).Length -eq 0) {
  Write-Error "PostgreSQL backup failed: file is missing or empty."
}
$pgSize = (Get-Item $pgDumpPath).Length
Write-Host "    PostgreSQL dump created successfully ($pgSize bytes)." -ForegroundColor Gray

# 4. Redis State Snapshot
Write-Host "[+] Triggering Redis BGSAVE and extracting RDB..." -ForegroundColor Yellow
$redisDumpPath = Join-Path $targetDir "redis.rdb"
$cmdRedis = "docker exec -i kdi_redis_local redis-cli -a kdi_redis_local_2026 bgsave >/dev/null 2>&1; sleep 2; docker cp kdi_redis_local:/data/dump.rdb '$wslTargetDir/redis.rdb' 2>/dev/null"
wsl.exe -d Ubuntu -e bash -c $cmdRedis

if (Test-Path $redisDumpPath) {
  $redisSize = (Get-Item $redisDumpPath).Length
  Write-Host "    Redis RDB snapshot extracted ($redisSize bytes)." -ForegroundColor Gray
} else {
  Write-Host "    Redis RDB snapshot skipped or unavailable." -ForegroundColor DarkGray
}

# 5. Neo4j Graph Database Dump & Summary
Write-Host "[+] Exporting Neo4j Graph Database (neo4j-admin dump & summary)..." -ForegroundColor Yellow
$neo4jDumpPath = Join-Path $targetDir "neo4j.dump"
$neo4jSummaryPath = Join-Path $targetDir "neo4j_summary.json"

# First capture live graph counts
$cypherQuery = "CALL { MATCH (n) RETURN count(n) AS nodes } CALL { MATCH ()-[r]->() RETURN count(r) AS relationships } RETURN { nodes: nodes, relationships: relationships } AS graph;"
$cmdSummary = "docker exec -i kdi_neo4j_local cypher-shell -u neo4j -p kdi_neo4j_local_2026 --format plain '$cypherQuery' > '$wslTargetDir/neo4j_summary.json' 2>/dev/null"
wsl.exe -d Ubuntu -e bash -c $cmdSummary

# Second perform official neo4j-admin database dump
$cmdDump = "docker stop kdi_neo4j_local >/dev/null 2>&1 && docker run --rm --volumes-from kdi_neo4j_local neo4j:5.20-community neo4j-admin database dump --to-stdout neo4j > '$wslTargetDir/neo4j.dump' 2>/dev/null && docker start kdi_neo4j_local >/dev/null 2>&1"
wsl.exe -d Ubuntu -e bash -c $cmdDump

if ((Test-Path $neo4jDumpPath) -and (Get-Item $neo4jDumpPath).Length -gt 0) {
  $neo4jSize = (Get-Item $neo4jDumpPath).Length
  Write-Host "    Neo4j database dump archive created ($neo4jSize bytes)." -ForegroundColor Gray
} else {
  Write-Warning "Neo4j binary dump could not be completed."
}

# 6. Generate Checksums and Manifest
Write-Host "[+] Generating SHA-256 verification hashes..." -ForegroundColor Yellow
$manifestFiles = @{}
Get-ChildItem -Path $targetDir -File | Where-Object { $_.Name -ne "manifest.json" } | ForEach-Object {
  $hashObj = Get-FileHash -Path $_.FullName -Algorithm SHA256
  $manifestFiles[$_.Name] = @{
    sizeBytes = $_.Length
    sha256 = $hashObj.Hash
  }
}

$manifest = @{
  timestamp = (Get-Date).ToString("o")
  backupId = "backup_$timestamp"
  environment = "local_self_hosted"
  files = $manifestFiles
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $targetDir "manifest.json")
Write-Host "    Manifest written: manifest.json" -ForegroundColor Gray

# 7. Retention Enforcement: Keep last $RetentionCount backups
Write-Host "[+] Enforcing retention policy (Keep last $RetentionCount)..." -ForegroundColor Yellow
$allBackups = Get-ChildItem -Path $BackupBaseDir -Directory | Where-Object { $_.Name -match "^backup_\d{8}_\d{6}$" } | Sort-Object Name
if ($allBackups.Count -gt $RetentionCount) {
  $toPruneCount = $allBackups.Count - $RetentionCount
  for ($i = 0; $i -lt $toPruneCount; $i++) {
    $dirToPrune = $allBackups[$i]
    Write-Host "    Pruning expired backup: $($dirToPrune.Name)" -ForegroundColor DarkGray
    Remove-Item -Path $dirToPrune.FullName -Recurse -Force
  }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " BACKUP COMPLETE: $targetDir" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
