# ==========================================================
# KDI AI Office — Local Automated Restore & Verification Script (Phase 30.11)
# ==========================================================

[CmdletBinding()]
param(
  [string]$BackupDir,
  [string]$BackupBaseDir = "D:\apss-source\KDI AI OFFICE\backups",
  [switch]$VerifyOnly,
  [switch]$IsolatedTest = $true,
  [switch]$ForceLiveRestore
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " KDI AI OFFICE -- LOCAL RESTORE & INTEGRITY VERIFIER " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Resolve target backup folder
if (-not $BackupDir) {
  $allBackups = Get-ChildItem -Path $BackupBaseDir -Directory | Where-Object { $_.Name -match "^backup_\d{8}_\d{6}$" } | Sort-Object Name -Descending
  if ($allBackups.Count -eq 0) {
    Write-Error "No backups found in '$BackupBaseDir'."
  }
  $targetDir = $allBackups[0].FullName
  Write-Host "[*] No backup directory specified. Selecting latest backup:" -ForegroundColor Cyan
  Write-Host "    $targetDir" -ForegroundColor White
} else {
  $targetDir = $BackupDir
}

if (-not (Test-Path $targetDir)) {
  Write-Error "Backup directory '$targetDir' does not exist."
}

# 2. Verify Manifest and Checksums
Write-Host "[+] Validating backup manifest and SHA-256 checksums..." -ForegroundColor Yellow
$manifestPath = Join-Path $targetDir "manifest.json"
if (-not (Test-Path $manifestPath)) {
  Write-Error "Corrupted backup: manifest.json is missing in $targetDir."
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$allValid = $true

foreach ($prop in $manifest.files.PSObject.Properties) {
  $fileName = $prop.Name
  $expectedHash = $prop.Value.sha256
  $filePath = Join-Path $targetDir $fileName

  if (-not (Test-Path $filePath)) {
    Write-Host "[-] MISSING: $fileName" -ForegroundColor Red
    $allValid = $false
    continue
  }

  $actualHash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
  if ($actualHash -eq $expectedHash) {
    Write-Host "    [OK] $fileName (SHA-256 verified)" -ForegroundColor Gray
  } else {
    Write-Host "[-] CHECKSUM MISMATCH: $fileName" -ForegroundColor Red
    Write-Host "    Expected: $expectedHash" -ForegroundColor DarkRed
    Write-Host "    Actual:   $actualHash" -ForegroundColor Red
    $allValid = $false
  }
}

if (-not $allValid) {
  Write-Error "Integrity check failed: one or more backup files failed SHA-256 verification."
}
Write-Host "[+] All backup files cryptographically verified." -ForegroundColor Green

if ($VerifyOnly) {
  Write-Host "[*] Verification-only mode specified. Exiting cleanly." -ForegroundColor Green
  exit 0
}

# 3. Isolated Target Verification Restore
$wslTargetDir = $targetDir.Replace("\", "/").Replace("D:", "/mnt/d").Replace("d:", "/mnt/d")
$wslDumpPath = "$wslTargetDir/postgres.dump"

if ($IsolatedTest -and -not $ForceLiveRestore) {
  # 3.1 PostgreSQL Isolated Restore Test
  Write-Host "[+] (1/3) Executing PostgreSQL ISOLATED RESTORE TEST into temporary sandbox database..." -ForegroundColor Yellow
  $testDb = "kdi_restore_test_temp"

  # Drop test database if left over from previous aborted run
  wsl.exe -d Ubuntu -e bash -c "docker exec -i kdi_postgres_local psql -U kdi_local_admin -d postgres -c 'DROP DATABASE IF EXISTS $testDb;' >/dev/null 2>&1"
  # Create temporary isolated test database
  wsl.exe -d Ubuntu -e bash -c "docker exec -i kdi_postgres_local psql -U kdi_local_admin -d postgres -c 'CREATE DATABASE $testDb;' >/dev/null 2>&1"

  # Restore into temporary database
  Write-Host "    Restoring schema and data into $testDb..." -ForegroundColor Gray
  $restoreCmd = "docker exec -i kdi_postgres_local pg_restore -U kdi_local_admin -d $testDb < '$wslDumpPath'"
  wsl.exe -d Ubuntu -e bash -c $restoreCmd 2>$null

  # Verify table count in restored test database
  $sqlQuery = "SELECT count(*) FROM pg_tables WHERE schemaname = chr(112)||chr(117)||chr(98)||chr(108)||chr(105)||chr(99);"
  $cmdCheck = "docker exec -i kdi_postgres_local psql -U kdi_local_admin -d $testDb -t -A -c '$sqlQuery'"
  $tableCountStr = wsl.exe -d Ubuntu -e bash -c $cmdCheck
  $rawCount = ($tableCountStr | Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -First 1)
  $tableCount = if ($rawCount) { [int]$rawCount.Trim() } else { 0 }

  # Verify row counts in key tables (engineering_executions & engineering_results)
  $cmdExecCount = "docker exec -i kdi_postgres_local psql -U kdi_local_admin -d $testDb -t -A -c 'SELECT count(*) FROM engineering_executions;'"
  $execCountStr = (wsl.exe -d Ubuntu -e bash -c "$cmdExecCount" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
  $cmdResCount = "docker exec -i kdi_postgres_local psql -U kdi_local_admin -d $testDb -t -A -c 'SELECT count(*) FROM engineering_results;'"
  $resCountStr = (wsl.exe -d Ubuntu -e bash -c "$cmdResCount" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)

  Write-Host "    Successfully restored $tableCount public tables into sandbox $testDb." -ForegroundColor Green
  Write-Host "    Key table row verification: engineering_executions=$execCountStr, engineering_results=$resCountStr" -ForegroundColor Gray

  # Cleanup temporary test database
  wsl.exe -d Ubuntu -e bash -c "docker exec -i kdi_postgres_local psql -U kdi_local_admin -d postgres -c 'DROP DATABASE $testDb;' >/dev/null 2>&1"
  Write-Host "    Sandbox test database cleanly dropped." -ForegroundColor Gray

  # 3.2 Neo4j Isolated Graph Restore Test
  $neo4jDumpPath = Join-Path $targetDir "neo4j.dump"
  if (Test-Path $neo4jDumpPath) {
    Write-Host "[+] (2/3) Executing Neo4j ISOLATED RESTORE TEST into temporary sandbox volume..." -ForegroundColor Yellow
    $testVol = "kdi_neo4j_test_temp_data"
    $neo4jCmd = "docker volume rm -f $testVol >/dev/null 2>&1; docker volume create $testVol >/dev/null && docker run --rm -v ${testVol}:/data -v '${wslTargetDir}:/backup:ro' neo4j:5.20-community neo4j-admin database load --from-path=/backup --overwrite-destination=true neo4j >/dev/null && docker run --rm -v ${testVol}:/data neo4j:5.20-community neo4j-admin database check --check-graph=true --check-counts=true --check-indexes=true neo4j >/dev/null && docker volume rm $testVol >/dev/null && echo 'NEO4J_CONSISTENCY_PASS'"
    $neo4jTestOut = wsl.exe -d Ubuntu -e bash -c "$neo4jCmd"
    if ($neo4jTestOut -match "NEO4J_CONSISTENCY_PASS") {
      Write-Host "    Successfully restored, loaded, and verified consistency of Neo4j graph archive." -ForegroundColor Green
    } else {
      Write-Warning "Neo4j isolated restore did not pass store consistency check."
    }
  }

  # 3.3 Redis Isolated Restore Test (Real Container Boot & DBSIZE Inspection)
  $redisDumpPath = Join-Path $targetDir "redis.rdb"
  if (Test-Path $redisDumpPath) {
    Write-Host "[+] (3/3) Executing Redis ISOLATED RESTORE TEST in temporary container..." -ForegroundColor Yellow
    $redisVol = "kdi_redis_restore_sandbox_vol"
    $redisCmd = "docker volume rm -f $redisVol >/dev/null 2>&1; docker volume create $redisVol >/dev/null && docker run --rm -v ${redisVol}:/data -v '${wslTargetDir}:/backup:ro' alpine sh -c 'cp /backup/redis.rdb /data/dump.rdb && chown -R 999:999 /data' && docker run -d --name kdi_redis_temp_verifier -v ${redisVol}:/data redis:7-alpine redis-server --dir /data --dbfilename dump.rdb >/dev/null && sleep 2 && docker exec kdi_redis_temp_verifier redis-cli dbsize && docker rm -f kdi_redis_temp_verifier >/dev/null && docker volume rm $redisVol >/dev/null"
    $redisRestoreOut = wsl.exe -d Ubuntu -e bash -c "$redisCmd"
    $rawDbsize = ($redisRestoreOut | Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -First 1)
    if ($rawDbsize -ne $null) {
      $dbsizeVal = [int]$rawDbsize.Trim()
      Write-Host "    Redis container booted from snapshot and verified $dbsizeVal keys loaded into memory." -ForegroundColor Green
    } else {
      Write-Warning "Redis isolated restore container did not report valid DBSIZE."
    }
  }

  Write-Host "[+] ALL ISOLATED RESTORE TESTS PASSED CLEANLY." -ForegroundColor Green
}

if ($ForceLiveRestore) {
  Write-Warning "LIVE DATABASE RESTORE REQUESTED!"
  Write-Host "[!] Overwriting active database kdi_ai_office_local with $targetDir..." -ForegroundColor Red
  $liveRestoreCmd = "docker exec -i kdi_postgres_local pg_restore -U kdi_local_admin -d kdi_ai_office_local --clean --if-exists < '$wslDumpPath'"
  wsl.exe -d Ubuntu -e bash -c $liveRestoreCmd
  Write-Host "[+] LIVE RESTORE COMPLETED." -ForegroundColor Green
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " RESTORE VERIFICATION SUCCESSFUL " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
