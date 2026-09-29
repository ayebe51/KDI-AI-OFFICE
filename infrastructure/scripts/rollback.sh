#!/bin/bash
# ==========================================================
# rollback.sh - Emergency Rollback to Prior Healthy State
# ==========================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=========================================================="
echo " INITIATING KDI AI OFFICE EMERGENCY ROLLBACK"
echo "=========================================================="

cd "${ROOT_DIR}"

echo "[!] Stopping current degraded containers..."
docker compose -f infrastructure/compose/docker-compose.prod.yml down --remove-orphans

echo "[!] Checking out previous stable git release/tag..."
git checkout HEAD~1

echo "[+] Rebuilding and launching previous stable release..."
docker compose -f infrastructure/compose/docker-compose.prod.yml --env-file .env.production up -d --build

sleep 15
bash infrastructure/scripts/health-check.sh

echo "[+] Rollback complete and verified healthy."
