# Restore & Verification Procedure — KDI AI Office

## 1. Automated Clean-Room Verification
To guarantee that backup archives are valid recovery material, the `RestoreTestService` executes an automated drill on every generated backup:
1. Validates the SHA-256 integrity checksum.
2. Decrypts the AES-256-GCM envelope in an isolated sandbox.
3. Parses database tables and validates record schemas.
4. Asserts presence and integrity across 10 core entities:
   - `projects`
   - `tasks`
   - `executions`
   - `agents`
   - `workforce`
   - `portfolio`
   - `decisions`
   - `memoryReferences`
   - `costSnapshots`
   - `automationDefinitions`
5. Executes synthetic SQL test queries and asserts matching row counts.
6. Publishes a typed `RestoreVerificationReport`.

## 2. Emergency Manual Restore
In the event of database corruption or hardware replacement:
```bash
# Execute vault restoration script
node infrastructure/scripts/restore-from-vault.mjs --backup=D:\kdi-offsite-vault\latest.enc.json
```
