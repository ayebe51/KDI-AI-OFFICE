#!/bin/bash
# ==========================================================
# deploy.sh - Zero-Downtime Deployment on Office Computer
# ==========================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "=========================================================="
echo " Starting KDI AI Office Production Deployment..."
echo "=========================================================="

cd "${ROOT_DIR}"

if [ ! -f ".env.production" ]; then
    echo "[-] ERROR: .env.production file is missing!"
    exit 1
fi

# Run pre-flight configuration validation
node infrastructure/scripts/production-readiness-check.mjs

echo "[+] Building and starting Docker services..."
docker compose -f infrastructure/compose/docker-compose.prod.yml --env-file .env.production up -d --build

echo "[+] Awaiting container health initialization (30 seconds)..."
sleep 15

bash infrastructure/scripts/health-check.sh

echo "[+] Deployment successfully completed!"
