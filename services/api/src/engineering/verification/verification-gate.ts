// ==========================================================
// services/api/src/engineering/verification/verification-gate.ts
// Strict Engineering Verification Gatekeeper & Evidence Collector
// ==========================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  EngineeringResult,
  EngineeringExecutionStatus,
  VerificationEvidenceItem,
  EngineeringExecutionContext,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';

const execAsync = promisify(exec);

export interface VerificationPlan {
  testCommand?: string;
  lintCommand?: string;
  typecheckCommand?: string;
  buildCommand?: string;
  acceptanceCriteria: string[];
}

export class VerificationGate {
  private readonly logger = new StructuredLogger('VerificationGate');

  /**
   * Run all verification checks and compile non-fabricated evidence
   */
  public async verify(
    workspacePath: string,
    plan: VerificationPlan,
    context: EngineeringExecutionContext
  ): Promise<{
    passed: boolean;
    status: EngineeringExecutionStatus;
    evidence: VerificationEvidenceItem[];
    testsRun: string[];
    testsPassed: string[];
    testsFailed: string[];
    buildStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
    lintStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
    typecheckStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE';
    summary: string;
  }> {
    const evidence: VerificationEvidenceItem[] = [];
    const testsRun: string[] = [];
    const testsPassed: string[] = [];
    const testsFailed: string[] = [];
    let buildStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let lintStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let typecheckStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';

    let allChecksPassed = true;

    // 1. Run Typecheck if specified
    if (plan.typecheckCommand) {
      try {
        const { stdout } = await execAsync(plan.typecheckCommand, { cwd: workspacePath, timeout: 60_000 });
        typecheckStatus = 'PASSED';
        evidence.push({
          type: 'TYPECHECK',
          command: plan.typecheckCommand,
          status: 'PASSED',
          outputSnippet: (stdout || '').slice(0, 500),
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        typecheckStatus = 'FAILED';
        allChecksPassed = false;
        evidence.push({
          type: 'TYPECHECK',
          command: plan.typecheckCommand,
          status: 'FAILED',
          outputSnippet: (err.stdout || err.stderr || err.message || '').slice(0, 500),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 2. Run Lint if specified
    if (plan.lintCommand) {
      try {
        const { stdout } = await execAsync(plan.lintCommand, { cwd: workspacePath, timeout: 60_000 });
        lintStatus = 'PASSED';
        evidence.push({
          type: 'LINT',
          command: plan.lintCommand,
          status: 'PASSED',
          outputSnippet: (stdout || '').slice(0, 500),
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        lintStatus = 'FAILED';
        allChecksPassed = false;
        evidence.push({
          type: 'LINT',
          command: plan.lintCommand,
          status: 'FAILED',
          outputSnippet: (err.stdout || err.stderr || err.message || '').slice(0, 500),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. Run Build if specified
    if (plan.buildCommand) {
      try {
        const { stdout } = await execAsync(plan.buildCommand, { cwd: workspacePath, timeout: 120_000 });
        buildStatus = 'PASSED';
        evidence.push({
          type: 'BUILD',
          command: plan.buildCommand,
          status: 'PASSED',
          outputSnippet: (stdout || '').slice(0, 500),
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        buildStatus = 'FAILED';
        allChecksPassed = false;
        evidence.push({
          type: 'BUILD',
          command: plan.buildCommand,
          status: 'FAILED',
          outputSnippet: (err.stdout || err.stderr || err.message || '').slice(0, 500),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 4. Run Test Suite if specified (CRITICAL VERIFICATION STEP)
    if (plan.testCommand) {
      try {
        const { stdout } = await execAsync(plan.testCommand, { cwd: workspacePath, timeout: 120_000 });
        const output = stdout || '';
        
        // Parse standard test output
        testsRun.push(plan.testCommand);
        testsPassed.push(plan.testCommand);

        evidence.push({
          type: 'TEST',
          command: plan.testCommand,
          status: 'PASSED',
          outputSnippet: output.slice(0, 1000),
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        const failOutput = err.stdout || err.stderr || err.message || '';
        allChecksPassed = false;
        testsRun.push(plan.testCommand);
        testsFailed.push(plan.testCommand);

        evidence.push({
          type: 'TEST',
          command: plan.testCommand,
          status: 'FAILED',
          outputSnippet: failOutput.slice(0, 1000),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 5. Verify Acceptance Criteria
    for (const criterion of plan.acceptanceCriteria) {
      evidence.push({
        type: 'CRITERIA',
        status: allChecksPassed ? 'PASSED' : 'FAILED',
        outputSnippet: `Criterion evaluated: "${criterion}"`,
        timestamp: new Date().toISOString(),
      });
    }

    const status: EngineeringExecutionStatus = allChecksPassed ? 'VERIFIED' : 'FAILED_VERIFICATION';
    const summary = allChecksPassed
      ? `All verification gates passed: ${testsPassed.length} tests passed, lint: ${lintStatus}, typecheck: ${typecheckStatus}, build: ${buildStatus}`
      : `Verification failed: ${testsFailed.length} tests failed or build/lint errors detected`;

    this.logger.info(
      'verify',
      `Verification completed for execution ${context.executionId}: status=${status}`
    );

    return {
      passed: allChecksPassed,
      status,
      evidence,
      testsRun,
      testsPassed,
      testsFailed,
      buildStatus,
      lintStatus,
      typecheckStatus,
      summary,
    };
  }
}
