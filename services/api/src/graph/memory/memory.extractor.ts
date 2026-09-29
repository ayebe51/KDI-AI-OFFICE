// ==========================================================
// services/api/src/graph/memory/memory.extractor.ts
// Deterministic & Rule-based Knowledge Extraction from Engineering Results
// ==========================================================

import { Injectable } from '@nestjs/common';
import type {
  EngineeringResult,
  EngineeringSession,
  EngineeringExecutionContext,
  GraphMemoryItem,
  MemoryConfidence,
} from '@kdi/types';
import { StructuredLogger } from '@kdi/shared';
import { MemoryService } from './memory.service.js';

@Injectable()
export class MemoryExtractor {
  private readonly logger = new StructuredLogger('MemoryExtractor');

  constructor(private readonly memoryService: MemoryService) {}

  /**
   * Extract high-value candidate memories from an engineering execution result.
   */
  public async extractFromExecution(
    session: EngineeringSession,
    result: EngineeringResult,
    context: EngineeringExecutionContext
  ): Promise<GraphMemoryItem[]> {
    const extractedMemories: GraphMemoryItem[] = [];
    const now = new Date().toISOString();
    const projectId = context.projectId || 'PRJ-KDI';

    // 1. Extract Bug Fix / Surgical Resolution Memory if tests passed and files were changed
    if (result.status === 'VERIFIED' && result.filesChanged && result.filesChanged.length > 0) {
      const confidence: MemoryConfidence = result.testsPassed && result.testsPassed.length > 0 ? 'VERIFIED' : 'SUPPORTED';
      const bugMemory = await this.memoryService.saveMemory({
        scope: 'PROJECT',
        title: `Resolution for Task ${session.taskId}: ${result.summary.slice(0, 80)}`,
        content: `Files modified: ${result.filesChanged.join(', ')}. Verification: ${result.diffSummary || 'Code modified and verified with tests'}. Passed tests: ${(result.testsPassed || []).join(', ')}.`,
        retention: 'PROJECT',
        confidence,
        visibility: 'INTERNAL',
        lifecycle: 'ACTIVE',
        provenance: {
          sourceType: 'execution_result',
          sourceId: session.executionId,
          sourceTimestamp: now,
          createdBy: session.agentId,
          lastVerifiedAt: now,
        },
        tags: ['engineering', 'bug-fix', 'resolution'],
        projectId,
        taskId: session.taskId,
        agentId: session.agentId,
      });
      extractedMemories.push(bugMemory);
    }

    // 2. Extract Security Findings Memory if any security issues were detected
    if (result.securityFindings && result.securityFindings.length > 0) {
      const secMemory = await this.memoryService.saveMemory({
        scope: 'PROJECT',
        title: `Security Assessment in Task ${session.taskId}`,
        content: `Security findings identified during execution: ${result.securityFindings.join('; ')}`,
        retention: 'ORGANIZATIONAL',
        confidence: 'VERIFIED',
        visibility: 'CONFIDENTIAL',
        lifecycle: 'ACTIVE',
        provenance: {
          sourceType: 'security_scan',
          sourceId: session.executionId,
          sourceTimestamp: now,
          createdBy: session.agentId,
          lastVerifiedAt: now,
        },
        tags: ['security', 'vulnerability', 'audit'],
        projectId,
        taskId: session.taskId,
        agentId: session.agentId,
      });
      extractedMemories.push(secMemory);
    }

    // 3. Extract Failure Pattern if execution failed verification
    if (result.status === 'FAILED_VERIFICATION' && result.testsFailed && result.testsFailed.length > 0) {
      const failMemory = await this.memoryService.saveMemory({
        scope: 'PROJECT',
        title: `Verification Failure in Task ${session.taskId}`,
        content: `Failed tests: ${result.testsFailed.join(', ')}. Blockers: ${(result.blockers || []).join('; ')}. Summary: ${result.summary}`,
        retention: 'PROJECT',
        confidence: 'SUPPORTED',
        visibility: 'INTERNAL',
        lifecycle: 'ACTIVE',
        provenance: {
          sourceType: 'test_failure',
          sourceId: session.executionId,
          sourceTimestamp: now,
          createdBy: session.agentId,
          lastVerifiedAt: now,
        },
        tags: ['failure-pattern', 'regression', 'test-failure'],
        projectId,
        taskId: session.taskId,
        agentId: session.agentId,
      });
      extractedMemories.push(failMemory);
    }

    this.logger.info(
      'extractFromExecution',
      `Extracted ${extractedMemories.length} memories from execution ${session.executionId}`
    );
    return extractedMemories;
  }
}
