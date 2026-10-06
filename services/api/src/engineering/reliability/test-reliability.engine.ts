// ==========================================================
// services/api/src/engineering/reliability/test-reliability.engine.ts
// Phase 19: Test Reliability, Flake Detection & Pre-Execution Discovery (§6–§11)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  FlakeDetectionResult,
  TargetedTestPlan,
  TestAssertionAudit,
} from './reliability.types.js';

@Injectable()
export class TestReliabilityEngine {
  private readonly logger = new StructuredLogger('TestReliabilityEngine');

  /**
   * Pre-execution Test Discovery (§11):
   * Inspects repository, detects framework & relevant test files before coding.
   */
  public discoverTargetedTestPlan(
    workspacePath: string,
    taskKeywords: string[] = []
  ): TargetedTestPlan {
    let testFramework: TargetedTestPlan['testFramework'] = 'node:test';
    let testCommand = 'node --test';
    const matchedTestFiles: string[] = [];
    const targetSymbols: string[] = [];

    const pkgPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const scripts = pkg.scripts || {};
        const devDeps = pkg.devDependencies || {};
        const deps = pkg.dependencies || {};

        if (devDeps.vitest || deps.vitest) {
          testFramework = 'vitest';
          testCommand = 'npx vitest run';
        } else if (devDeps.jest || deps.jest) {
          testFramework = 'jest';
          testCommand = 'npx jest';
        } else if (scripts.test && scripts.test.includes('--test')) {
          testFramework = 'node:test';
          testCommand = scripts.test;
        } else if (scripts.test) {
          testCommand = 'npm test';
        }
      } catch (err: any) {
        this.logger.debug('discoverTargetedTestPlan', `package.json parse note: ${err.message}`);
      }
    }

    // Scan test directory for matching test files (§11)
    const testDirs = ['test', 'tests', '__tests__', 'src'];
    for (const d of testDirs) {
      const fullDir = path.join(workspacePath, d);
      if (fs.existsSync(fullDir)) {
        this.scanTestFiles(fullDir, matchedTestFiles, taskKeywords);
      }
    }

    // Default fallback if no specific test matched
    if (matchedTestFiles.length === 0) {
      const defaultTestDir = path.join(workspacePath, 'test');
      if (fs.existsSync(defaultTestDir)) {
        this.scanTestFiles(defaultTestDir, matchedTestFiles);
      }
    }

    // Isolated environment variables (§10)
    const isolatedEnv = this.createIsolatedEnv();

    const plan: TargetedTestPlan = {
      testFramework,
      testCommand,
      matchedTestFiles,
      targetSymbols,
      isolatedEnv,
      expectedAssertionsCount: Math.max(1, matchedTestFiles.length * 3),
    };

    this.logger.info(
      'discoverTargetedTestPlan',
      `Discovered test plan: [${plan.testFramework}] command="${plan.testCommand}", ${matchedTestFiles.length} matched test files`
    );

    return plan;
  }

  private scanTestFiles(dir: string, results: string[], keywords: string[] = []): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
        const fullPath = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          this.scanTestFiles(fullPath, results, keywords);
        } else if (
          ent.isFile() &&
          (ent.name.endsWith('.test.js') ||
            ent.name.endsWith('.test.ts') ||
            ent.name.endsWith('.spec.js') ||
            ent.name.endsWith('.spec.ts'))
        ) {
          if (keywords.length === 0) {
            results.push(fullPath);
          } else {
            const matchesKeyword = keywords.some((kw) =>
              ent.name.toLowerCase().includes(kw.toLowerCase())
            );
            if (matchesKeyword || results.length < 5) {
              results.push(fullPath);
            }
          }
        }
      }
    } catch {}
  }

  /**
   * Deterministic Test Environment Isolation (§10):
   * Sets up isolated environment variables without cross-task contamination.
   */
  public createIsolatedEnv(customPort = 49152): Record<string, string> {
    const randomPort = customPort + Math.floor(Math.random() * 1000);
    return {
      NODE_ENV: 'test',
      CI: 'true',
      PORT: randomPort.toString(),
      KDI_ISOLATED_TEST: 'true',
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    };
  }

  /**
   * Test Flake Detection (§9):
   * Runs test runner callback repeatedly (e.g. 3 runs) to detect inconsistent outcomes.
   */
  public async detectFlakiness(
    testRunner: (runIndex: number) => Promise<{ passed: boolean; output: string }>,
    iterations = 3
  ): Promise<FlakeDetectionResult> {
    let passedRuns = 0;
    let failedRuns = 0;
    const outputs: string[] = [];
    const inconsistentAssertions: string[] = [];

    for (let i = 1; i <= iterations; i++) {
      try {
        const res = await testRunner(i);
        if (res.passed) {
          passedRuns++;
        } else {
          failedRuns++;
          outputs.push(res.output);
        }
      } catch (err: any) {
        failedRuns++;
        outputs.push(err.message || 'Execution error');
      }
    }

    const isFlaky = passedRuns > 0 && failedRuns > 0;
    if (isFlaky) {
      inconsistentAssertions.push('Inconsistent pass/fail outcome between repeated test executions');
    }

    const diagnostics = isFlaky
      ? `FLAKY_TEST: Detected inconsistent outcomes (${passedRuns} passed, ${failedRuns} failed out of ${iterations} runs).`
      : passedRuns === iterations
      ? `DETERMINISTIC_PASS: All ${iterations} test executions passed consistently.`
      : `DETERMINISTIC_FAIL: All ${iterations} test executions failed consistently.`;

    this.logger.info(
      'detectFlakiness',
      `Flake check result: ${isFlaky ? 'FLAKY' : 'DETERMINISTIC'} (${passedRuns}/${iterations} passed)`
    );

    return {
      isFlaky,
      totalRuns: iterations,
      passedRuns,
      failedRuns,
      inconsistentAssertions,
      diagnostics,
    };
  }

  /**
   * Test Assertion Hardening Auditor (§8):
   * Inspects test code content to verify behavior-driven assertions.
   */
  public auditAssertionQuality(testFilePath: string, content?: string): TestAssertionAudit {
    const fileContent = content || (fs.existsSync(testFilePath) ? fs.readFileSync(testFilePath, 'utf8') : '');
    const lines = fileContent.split('\n');

    let totalAssertions = 0;
    let hardenedAssertions = 0;
    let weakAssertions = 0;
    const weakDetails: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for weak assertions (§8)
      if (
        line.includes('.toBeDefined()') ||
        line.includes('.toBeTruthy()') ||
        line.match(/assert\.ok\s*\(/)
      ) {
        totalAssertions++;
        weakAssertions++;
        weakDetails.push(`Line ${i + 1}: Weak assertion found: "${line}" (should test specific value)`);
      } else if (
        line.includes('assert.strictEqual(') ||
        line.includes('assert.deepStrictEqual(') ||
        line.includes('.toBe(') ||
        line.includes('.toEqual(') ||
        line.includes('assert.match(')
      ) {
        totalAssertions++;
        hardenedAssertions++;
      }
    }

    const isHardened = weakAssertions === 0 || hardenedAssertions >= weakAssertions * 2;

    return {
      file: testFilePath,
      totalAssertions,
      hardenedAssertions,
      weakAssertions,
      weakAssertionDetails: weakDetails,
      isHardened,
    };
  }
}
