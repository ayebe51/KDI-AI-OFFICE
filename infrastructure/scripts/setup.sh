#!/bin/bash
# ==========================================================
# setup.sh - Initial Host Setup for Office Computer / Staging
# ==========================================================
set -euo pipefail

echo "=========================================================="
echo " KDI AI OFFICE - Initial Host Provisioning Script"
echo "=========================================================="

# 1. Verify Docker Engine & Compose
if ! command -v docker &> /dev/null; then
    echo "[-] ERROR: Docker Engine is not installed on this host."
    echo "    Please install Docker Engine (v24.0+) before continuing."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "[-] ERROR: Docker Compose plugin is not installed."
    exit 1
fi

echo "[+] Docker Engine and Docker Compose detected."

# 2. Check for Production Environment File
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ ! -f "${ROOT_DIR}/.env.production" ]; then
    echo "[!] .env.production not found in root directory."
    echo "[+] Creating .env.production from template..."
    cp "${ROOT_DIR}/infrastructure/env/.env.production.example" "${ROOT_DIR}/.env.production"
    echo "[!] ATTENTION: You MUST configure real secure passwords in .env.production before running deploy.sh!"
else
    echo "[+] .env.production exists."
fi

# 3. Create Persistent Data Directories
mkdir -p "${ROOT_DIR}/data/postgres"
mkdir -p "${ROOT_DIR}/data/redis"
mkdir -p "${ROOT_DIR}/data/neo4j"
mkdir -p "${ROOT_DIR}/data/logs"
mkdir -p "${ROOT_DIR}/data/worktrees"

chmod -R 750 "${ROOT_DIR}/data"

echo "[+] Local data directories initialized with secure permissions."
echo "[+] Initial setup complete. Review .env.production and execute deploy.sh."
