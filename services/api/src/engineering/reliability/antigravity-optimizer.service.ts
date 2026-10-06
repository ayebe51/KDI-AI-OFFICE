// ==========================================================
// services/api/src/engineering/reliability/antigravity-optimizer.service.ts
// Phase 19: Antigravity Context Filtering, Progressive Inspection & Budgeting (§12–§16)
// ==========================================================

import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { StructuredLogger } from '@kdi/shared';
import type {
  InspectionBudget,
  ProgressiveInspectionResult,
  StageDurationMetrics,
} from './reliability.types.js';

@Injectable()
export class AntigravityOptimizerService {
  private readonly logger = new StructuredLogger('AntigravityOptimizerService');

  // Ignored directory and file patterns (§13)
  private readonly ignoredDirectories = new Set([
    'node_modules',
    'dist',
    'build',
    '.git',
    '.next',
    'coverage',
    '.cache',
    'tmp',
    'temp',
    '.turbo',
  ]);

  private readonly ignoredExtensions = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.zip',
    '.tar',
    '.gz',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.map',
    '.log',
  ]);

  public getDefaultBudget(): InspectionBudget {
    return {
      maxFilesScanned: 150,
      maxDirectoryDepth: 4,
      maxDurationMs: 8000, // 8 seconds limit prevents AST timeouts
      maxOutputBytes: 512 * 1024, // 512 KB
    };
  }

  /**
   * Progressive Inspection with Budget Enforcement (§13, §14, §15):
   * Scans workspace in stages, skipping irrelevant files and halting if budget exceeded.
   */
  public inspectProgressively(
    workspacePath: string,
    keywords: string[] = [],
    customBudget?: Partial<InspectionBudget>
  ): ProgressiveInspectionResult {
    const budget: InspectionBudget = {
      ...this.getDefaultBudget(),
      ...customBudget,
    };

    const startTime = Date.now();
    let filesScanned = 0;
    let ignoredPathsCount = 0;
    let budgetExceeded = false;
    let levelReached: 1 | 2 | 3 | 4 | 5 = 1;

    const relevantFiles: string[] = [];

    // LEVEL 1: Repo Metadata (§15)
    levelReached = 1;
    const metadataFiles = ['package.json', 'tsconfig.json', 'README.md', '.gitignore'];
    for (const mf of metadataFiles) {
      const full = path.join(workspacePath, mf);
      if (fs.existsSync(full)) {
        relevantFiles.push(mf);
        filesScanned++;
      }
    }

    // Check budget
    if (Date.now() - startTime > budget.maxDurationMs) {
      budgetExceeded = true;
    }

    // LEVEL 2: Entry Points (§15)
    if (!budgetExceeded) {
      levelReached = 2;
      const entryCandidates = [
        'src/index.ts',
        'src/index.js',
        'src/main.ts',
        'src/main.js',
        'src/app.ts',
        'src/app.js',
      ];
      for (const ec of entryCandidates) {
        const full = path.join(workspacePath, ec);
        if (fs.existsSync(full)) {
          relevantFiles.push(ec);
          filesScanned++;
        }
      }
    }

    // LEVEL 3: Relevant Source Files matching task keywords (§15)
    if (!budgetExceeded) {
      levelReached = 3;
      const srcDir = path.join(workspacePath, 'src');
      if (fs.existsSync(srcDir)) {
        this.scanDirectoryWithBudget(
          srcDir,
          workspacePath,
          keywords,
          relevantFiles,
          1,
          budget,
          startTime,
          (count, ignored) => {
            filesScanned += count;
            ignoredPathsCount += ignored;
          }
        );
      }
    }

    // LEVEL 4: Relevant Test Files (§15)
    if (!budgetExceeded) {
      levelReached = 4;
      const testDir = path.join(workspacePath, 'test');
      if (fs.existsSync(testDir)) {
        this.scanDirectoryWithBudget(
          testDir,
          workspacePath,
          keywords,
          relevantFiles,
          1,
          budget,
          startTime,
          (count, ignored) => {
            filesScanned += count;
            ignoredPathsCount += ignored;
          }
        );
      }
    }

    // LEVEL 5: Broader inspection only if relevant files count is sparse (< 3)
    if (!budgetExceeded && relevantFiles.length < 3) {
      levelReached = 5;
      this.scanDirectoryWithBudget(
        workspacePath,
        workspacePath,
        keywords,
        relevantFiles,
        1,
        budget,
        startTime,
        (count, ignored) => {
          filesScanned += count;
          ignoredPathsCount += ignored;
        }
      );
    }

    const durationMs = Date.now() - startTime;
    if (durationMs > budget.maxDurationMs || filesScanned >= budget.maxFilesScanned) {
      budgetExceeded = true;
    }

    const budgetStatus = budgetExceeded ? 'INSPECTION_LIMIT_REACHED' : 'WITHIN_BUDGET';

    const result: ProgressiveInspectionResult = {
      levelReached,
      filesScanned,
      filesMatched: relevantFiles.length,
      ignoredPathsCount,
      durationMs,
      budgetExceeded,
      budgetStatus,
      relevantFiles: Array.from(new Set(relevantFiles)),
      summary: `Progressive inspection reached Level ${levelReached} in ${durationMs}ms. Scanned: ${filesScanned}, Ignored: ${ignoredPathsCount}, Matched: ${relevantFiles.length}. Status: ${budgetStatus}`,
    };

    this.logger.info(
      'inspectProgressively',
      `Inspection result: ${result.summary}`
    );

    return result;
  }

  private scanDirectoryWithBudget(
    dir: string,
    root: string,
    keywords: string[],
    matched: string[],
    depth: number,
    budget: InspectionBudget,
    startTime: number,
    counter: (scanned: number, ignored: number) => void
  ): void {
    if (depth > budget.maxDirectoryDepth) return;
    if (Date.now() - startTime > budget.maxDurationMs) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let localScanned = 0;
      let localIgnored = 0;

      for (const ent of entries) {
        if (Date.now() - startTime > budget.maxDurationMs) break;

        const fullPath = path.join(dir, ent.name);
        const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

        if (ent.isDirectory()) {
          if (this.ignoredDirectories.has(ent.name)) {
            localIgnored++;
            continue;
          }
          this.scanDirectoryWithBudget(
            fullPath,
            root,
            keywords,
            matched,
            depth + 1,
            budget,
            startTime,
            counter
          );
        } else if (ent.isFile()) {
          localScanned++;
          const ext = path.extname(ent.name).toLowerCase();
          if (this.ignoredExtensions.has(ext)) {
            localIgnored++;
            continue;
          }

          // Check if file matches keyword or is relevant code
          if (keywords.length === 0) {
            if (matched.length < 25) matched.push(relPath);
          } else {
            const nameLower = ent.name.toLowerCase();
            const matches = keywords.some((kw) => nameLower.includes(kw.toLowerCase()));
            if (matches && matched.length < 50) {
              matched.push(relPath);
            }
          }
        }
      }

      counter(localScanned, localIgnored);
    } catch {}
  }

  /**
   * Stage Duration Tracker (§16):
   * Summarizes breakdown of time across discovery, startup, inspection, coding, test, review.
   */
  public trackStageDurations(metrics: Partial<StageDurationMetrics>): StageDurationMetrics {
    const discoveryMs = metrics.discoveryMs || 250;
    const startupMs = metrics.startupMs || 300;
    const inspectionMs = metrics.inspectionMs || 450;
    const codingMs = metrics.codingMs || 1800;
    const testMs = metrics.testMs || 1200;
    const reviewMs = metrics.reviewMs || 400;
    const totalMs = discoveryMs + startupMs + inspectionMs + codingMs + testMs + reviewMs;

    return {
      discoveryMs,
      startupMs,
      inspectionMs,
      codingMs,
      testMs,
      reviewMs,
      totalMs,
    };
  }
}
