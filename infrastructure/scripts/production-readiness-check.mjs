// ==========================================================
// production-readiness-check.mjs - Configuration & Environment Validator
// Validates structural completeness of production & staging configs
// ==========================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

console.log('==========================================================');
console.log(' KDI AI OFFICE - PRODUCTION READINESS CHECKER');
console.log('==========================================================');

const candidatePaths = [
  process.env.TARGET_ENV_FILE,
  path.resolve(rootDir, '.env.production'),
  path.resolve(rootDir, 'infrastructure/env/.env.production.example'),
  path.resolve(rootDir, '.env.example'),
].filter(Boolean);

let envPath = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    envPath = p;
    break;
  }
}

if (!envPath) {
  console.error(`[-] ERROR: Target configuration file not found in candidates: ${candidatePaths.join(', ')}`);
  process.exit(1);
}

console.log(`[+] Validating configuration blueprint: ${path.relative(rootDir, envPath)}`);


const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');
const envMap = new Map();

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const equalsIdx = trimmed.indexOf('=');
  if (equalsIdx > 0) {
    const key = trimmed.substring(0, equalsIdx).trim();
    const value = trimmed.substring(equalsIdx + 1).trim();
    envMap.set(key, value);
  }
}

const REQUIRED_CONFIGS = [
  { key: 'APP_ENV', expected: ['production', 'staging', 'development'] },
  { key: 'PORT', validator: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0 },
  { key: 'API_URL', validator: (v) => v.startsWith('http://') || v.startsWith('https://') },
  { key: 'WS_URL', validator: (v) => v.startsWith('ws://') || v.startsWith('wss://') },
  { key: 'CORS_ORIGINS', validator: (v) => v.length > 0 },
  { key: 'JWT_SECRET', validator: (v) => v.length >= 24 },
  { key: 'POSTGRES_HOST', validator: (v) => v.length > 0 },
  { key: 'POSTGRES_PORT', validator: (v) => !isNaN(parseInt(v, 10)) },
  { key: 'POSTGRES_DB', validator: (v) => v.length > 0 },
  { key: 'POSTGRES_USER', validator: (v) => v.length > 0 },
  { key: 'POSTGRES_PASSWORD', validator: (v) => v.length > 0 },
  { key: 'POSTGRES_URL', validator: (v) => v.startsWith('postgresql://') },
  { key: 'REDIS_HOST', validator: (v) => v.length > 0 },
  { key: 'REDIS_PORT', validator: (v) => !isNaN(parseInt(v, 10)) },
  { key: 'REDIS_PASSWORD', validator: (v) => v.length > 0 },
  { key: 'REDIS_URL', validator: (v) => v.startsWith('redis://') },
  { key: 'NEO4J_URI', validator: (v) => v.startsWith('bolt://') || v.startsWith('neo4j://') },
  { key: 'NEO4J_USER', validator: (v) => v.length > 0 },
  { key: 'NEO4J_PASSWORD', validator: (v) => v.length > 0 },
  { key: 'OLLAMA_BASE_URL', validator: (v) => v.startsWith('http://') },
  { key: 'WORKER_MAX_CONCURRENCY', validator: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0 },
  { key: 'HOST_CPU_LIMIT_PERCENT', validator: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) <= 100 },
];

let failureCount = 0;

for (const rule of REQUIRED_CONFIGS) {
  if (!envMap.has(rule.key)) {
    console.error(`[-] MISSING CONFIGURATION KEY: ${rule.key}`);
    failureCount++;
    continue;
  }

  const val = envMap.get(rule.key);

  if (rule.expected && !rule.expected.includes(val)) {
    console.error(`[-] INVALID VALUE for ${rule.key}: got "${val}", expected one of [${rule.expected.join(', ')}]`);
    failureCount++;
    continue;
  }

  if (rule.validator && !rule.validator(val)) {
    console.error(`[-] VALIDATION FAILED for ${rule.key}: value "${val}" violates structural criteria.`);
    failureCount++;
    continue;
  }

  console.log(`[PASS] ${rule.key.padEnd(26)} -> Validated`);
}

console.log('----------------------------------------------------------');
if (failureCount === 0) {
  console.log('[SUCCESS] All 22 production environment blueprint variables validated successfully!');
  console.log('[SUCCESS] Production configuration contract: VERIFIED READY');
  process.exit(0);
} else {
  console.error(`[FAILURE] Production readiness check failed with ${failureCount} errors.`);
  process.exit(1);
}
