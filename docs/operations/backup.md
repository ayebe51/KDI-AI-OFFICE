# Automated Backup Strategy & Data Preservation: KDI AI Office

## 1. Overview & Objectives
The **Backup Strategy** for **KDI AI Office** guarantees that all relational data, knowledge graphs, configurations, and working git repositories can be restored completely following host hardware failure, disk corruption, or accidental deletions.

- **Recovery Point Objective (RPO):** <= 24 hours for daily snapshots; <= 1 hour for Git commits.
- **Recovery Time Objective (RTO):** <= 30 minutes on a fresh workstation install.

---

## 2. Backup Scope & Schedules

| Asset | Storage Engine | Backup Tool / Mechanism | Frequency | Destination | Retention |
|---|---|---|---|---|---|
| **Relational DB** | PostgreSQL 16 | `pg_dump -Fc` (Custom compressed) | Daily at 02:00 | `./backups/postgres/` | 14 days |
| **Knowledge Graph** | Neo4j 5 | `neo4j-admin database dump` | Daily at 02:30 | `./backups/neo4j/` | 14 days |
| **In-Memory Cache** | Redis 7 | RDB Snapshot (`BGSAVE`) | Every 6 hours | `./backups/redis/` | 2 days |
| **System Settings** | Postgres Vault | Encrypted SQL export | Daily at 03:00 | `./backups/secrets/` | 30 days |
| **Code Workspaces** | Git Worktrees | Local Git repository commits | Continuous | Local & GitHub | Permanent |
| **Configurations** | Config Files | Tar archive of `/config` & compose | Weekly / On-change | `./backups/config/` | 30 days |

---

## 3. Automated Backup Script (`scripts/daily-backup.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="D:/apss-source/KDI AI OFFICE/backups/$BACKUP_DATE"
mkdir -p "$BACKUP_DIR"

echo "=== Starting KDI AI Office Daily Backup ($BACKUP_DATE) ==="

# 1. PostgreSQL Backup
echo "Dumping PostgreSQL database..."
docker exec kdi-postgres pg_dump -U kdi_user -d kdi_office -Fc -f "/var/lib/postgresql/data/dump_$BACKUP_DATE.dump"
mv "data/postgres/dump_$BACKUP_DATE.dump" "$BACKUP_DIR/postgres.dump"

# 2. Neo4j Graph Backup
echo "Dumping Neo4j database..."
docker exec kdi-neo4j neo4j-admin database dump neo4j --to-path=/var/lib/neo4j/import
mv "data/neo4j/import/neo4j.dump" "$BACKUP_DIR/neo4j.dump"

# 3. Redis Snapshot
echo "Triggering Redis BGSAVE..."
docker exec kdi-redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE

# 4. Encrypt Backup Archive
echo "Compressing and encrypting backup archive..."
tar -czf - -C "$BACKUP_DIR" . | openssl enc -aes-256-cbc -salt -pbkdf2 -out "$BACKUP_DIR.enc" -pass pass:"${BACKUP_ENCRYPTION_KEY}"
rm -rf "$BACKUP_DIR"

echo "=== Backup completed: $BACKUP_DIR.enc ==="
```

---

## 4. Verification & Integrity Checks
1. **Automated Checksum:** Every backup archive generates a `.sha256` checksum file immediately following creation.
2. **Weekly Restore Drill:** A scheduled cron job spins up an isolated Docker Compose test environment, restores the latest backup, runs health check queries, and tears it down, verifying backup integrity.
