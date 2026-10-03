// ==========================================================
// services/api/src/benchmark/engine/recovery-loop.engine.ts
// Self-Recovery Engine & Explicit Failure Taxonomy (Section 11 & 19)
// ==========================================================

import type {
  BenchmarkFailureCategory,
  BenchmarkAttempt,
} from '@kdi/types';
import type { RecoveryDecision } from '../types/benchmark.types.js';
import { StructuredLogger } from '@kdi/shared';

export interface FailureContext {
  attemptNumber: number;
  maxAttempts: number;
  stage: 'PLANNING' | 'EXECUTION' | 'TEST' | 'BUILD' | 'SECURITY';
  errorOutput: string;
  exitCode?: number;
  command?: string;
  consecutiveFailures?: number;
}

export class RecoveryLoopEngine {
  private readonly logger = new StructuredLogger('RecoveryLoopEngine');
  private readonly maxAttempts: number;
  private readonly circuitBreakerThreshold: number;

  constructor(maxAttempts: number = 3, circuitBreakerThreshold: number = 4) {
    this.maxAttempts = maxAttempts;
    this.circuitBreakerThreshold = circuitBreakerThreshold;
  }

  /**
   * Classify failure according to explicit Section 19 taxonomy
   */
  public classifyFailure(context: FailureContext): BenchmarkFailureCategory {
    const raw = (context.errorOutput || '').toLowerCase();
    const stage = context.stage;

    if (stage === 'PLANNING') {
      return 'PLANNING_FAILURE';
    }

    if (raw.includes('permission denied') || raw.includes('eacces') || raw.includes('unauthorized') || raw.includes('forbidden')) {
      return 'AUTHORIZATION_FAILURE';
    }

    if (raw.includes('enospc') || raw.includes('heap out of memory') || raw.includes('oom') || raw.includes('out of memory')) {
      return 'RESOURCE_FAILURE';
    }

    if (raw.includes('not a git repository') || raw.includes('corrupt git') || raw.includes('worktree error')) {
      return 'REPOSITORY_FAILURE';
    }

    if (raw.includes('command not found') || raw.includes('is not recognized') || raw.includes('spawn error')) {
      return 'TOOL_FAILURE';
    }

    if (raw.includes('syntaxerror') || raw.includes('referenceerror') || raw.includes('typeerror') || raw.includes('cannot find module')) {
      return 'CODE_FAILURE';
    }

    if (stage === 'TEST' || raw.includes('assertionerror') || raw.includes('fail') || raw.includes('tests failed')) {
      return 'TEST_FAILURE';
    }

    if (raw.includes('connection refused') || raw.includes('econnrefused') || raw.includes('network offline')) {
      return 'ENVIRONMENT_FAILURE';
    }

    return 'UNRECOVERABLE_FAILURE';
  }

  /**
   * Evaluate failure, formulate hypothesis, and produce recovery decision
   */
  public evaluateRecovery(context: FailureContext): RecoveryDecision {
    const failureCategory = this.classifyFailure(context);
    const consecutive = context.consecutiveFailures || 1;

    // Circuit Breaker check
    if (consecutive >= this.circuitBreakerThreshold || context.attemptNumber >= this.maxAttempts) {
      this.logger.warn(
        'evaluateRecovery',
        `Circuit breaker tripped or max attempts reached: attempt=${context.attemptNumber}/${this.maxAttempts}, consecutive=${consecutive}`
      );
      return {
        shouldRetry: false,
        attemptNumber: context.attemptNumber,
        hypothesis: `Exceeded maximum allowable retries (${this.maxAttempts}) or tripped circuit breaker. Manual intervention required.`,
        plannedAction: 'ESCALATE_TO_BLOCKED',
        failureCategory,
        isUnrecoverable: true,
      };
    }

    // Unrecoverable categories cannot be resolved by self-coding retries
    if (failureCategory === 'RESOURCE_FAILURE' || failureCategory === 'AUTHORIZATION_FAILURE') {
      return {
        shouldRetry: false,
        attemptNumber: context.attemptNumber,
        hypothesis: `System encountered ${failureCategory} which cannot be resolved autonomously without external resource provision.`,
        plannedAction: 'ESCALATE_TO_BLOCKED',
        failureCategory,
        isUnrecoverable: true,
      };
    }

    // Formulate actionable hypothesis based on failure signature
    let hypothesis = '';
    let plannedAction = '';
    const err = context.errorOutput;

    if (failureCategory === 'CODE_FAILURE') {
      if (err.includes('Cannot find module') || err.includes('ERR_MODULE_NOT_FOUND')) {
        hypothesis = 'Import path or missing export in module.';
        plannedAction = 'Verify relative module path, ensure .js extension in ESM, and export necessary symbols.';
      } else if (err.includes('is not a function')) {
        hypothesis = 'Method signature mismatch or undefined method called.';
        plannedAction = 'Inspect target object interface and align method signature.';
      } else {
        hypothesis = 'Syntax or runtime type defect in modified source.';
        plannedAction = 'Re-inspect modified AST/source, apply syntax fix, and re-test.';
      }
    } else if (failureCategory === 'TEST_FAILURE') {
      if (err.includes('strictEqual') || err.includes('ERR_ASSERTION')) {
        hypothesis = 'Assertion failed: expected value differs from implementation output.';
        plannedAction = 'Review test assertion expectations, adjust return values or filters to satisfy criteria.';
      } else {
        hypothesis = 'One or more test assertions failed in test suite.';
        plannedAction = 'Examine test stack trace, identify failing assertion, patch source code, and re-run suite.';
      }
    } else {
      hypothesis = `Transient or environment failure in stage ${context.stage}.`;
      plannedAction = 'Clean workspace artifacts and retry execution step.';
    }

    return {
      shouldRetry: true,
      attemptNumber: context.attemptNumber + 1,
      hypothesis,
      plannedAction,
      failureCategory,
      isUnrecoverable: false,
    };
  }

  /**
   * Helper to format a record for BenchmarkAttempt
   */
  public createAttemptRecord(
    attemptNumber: number,
    agent: string,
    startTime: number,
    status: 'SUCCESS' | 'FAILED' | 'RECOVERING',
    params: {
      hypothesis?: string;
      changes?: string[];
      testOutput?: string;
      failureReason?: string;
      failureCategory?: BenchmarkFailureCategory;
    }
  ): BenchmarkAttempt {
    return {
      attemptNumber,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      status,
      agent,
      hypothesis: params.hypothesis,
      changes: params.changes || [],
      testOutput: params.testOutput,
      failureReason: params.failureReason,
      failureCategory: params.failureCategory,
    };
  }
}
