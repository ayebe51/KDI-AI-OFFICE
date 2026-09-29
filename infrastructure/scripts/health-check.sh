#!/bin/bash
# ==========================================================
# health-check.sh - Probes API, Databases, and Services
# ==========================================================
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:3000}"

echo "=========================================================="
echo " Checking KDI AI Office Subsystem Health at ${API_URL}"
echo "=========================================================="

# 1. Main Aggregate Health Check
if curl -sf "${API_URL}/health" > /dev/null; then
    echo "[PASS] Aggregate System Health Endpoint (/health): OK"
else
    echo "[FAIL] Aggregate System Health Endpoint (/health): DOWN"
    exit 1
fi

# 2. PostgreSQL Health Probe
if curl -sf "${API_URL}/health/postgres" > /dev/null; then
    echo "[PASS] PostgreSQL Database (/health/postgres): OK"
else
    echo "[FAIL] PostgreSQL Database (/health/postgres): DOWN"
    exit 1
fi

# 3. Redis Health Probe
if curl -sf "${API_URL}/health/redis" > /dev/null; then
    echo "[PASS] Redis Queue & Cache (/health/redis): OK"
else
    echo "[FAIL] Redis Queue & Cache (/health/redis): DOWN"
    exit 1
fi

# 4. Neo4j Health Probe
if curl -sf "${API_URL}/health/neo4j" > /dev/null; then
    echo "[PASS] Neo4j Graph Memory (/health/neo4j): OK"
else
    echo "[FAIL] Neo4j Graph Memory (/health/neo4j): DOWN"
    exit 1
fi

echo "=========================================================="
echo " ALL SUBSYSTEM PROBES REPORT HEALTHY (100% PASS)"
echo "=========================================================="
