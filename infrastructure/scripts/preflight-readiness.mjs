#!/usr/bin/env node
// ==========================================================
// infrastructure/scripts/preflight-readiness.mjs
// Phase 30.5: Repeatable Read-Only Operator Preflight Runner (§7)
// ==========================================================

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function run() {
  try {
    // Dynamic import from compiled services/api dist
    const modulePath = path.resolve(
      rootDir,
      'services/api/dist/engineering/phase30/operator-preflight.js'
    );

    const { OperatorPreflightService } = await import(pathToFileURL(modulePath).href);

    const service = new OperatorPreflightService();
    const result = await service.runPreflight({ phase: '30.9' });

    console.log(service.formatSummaryText(result));

    console.log(`[+] Machine-readable readiness state persisted to: docs/engineering/kdi-phase-30-9-readiness.json`);
    console.log(`[+] Historical readiness states preserved for Phase 30.5, 30.6, 30.7, and 30.8.`);
    process.exit(0);
  } catch (err) {
    console.error(`[-] Preflight execution failed: ${err.message}`);
    process.exit(1);
  }
}

run();
