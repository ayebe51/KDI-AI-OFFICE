// ==========================================================
// services/api/src/runtime/execution/task.validator.ts
// Task Output Validation Engine across Canonical Task Types
// ==========================================================

import type { CanonicalTask, TaskResult } from '@kdi/types';

export class TaskValidator {
  /**
   * Validate that the generated TaskResult satisfies the semantic requirements of its TaskType
   */
  public static validate(task: CanonicalTask, result: TaskResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!result.summary || result.summary.trim().length === 0) {
      errors.push('Task result summary cannot be empty');
    }

    if (result.status === 'FAILED') {
      return { valid: false, errors: result.errors || ['Execution reported failure status'] };
    }

    switch (task.taskType) {
      case 'ANALYSIS':
        if (result.summary.length < 30) {
          errors.push('Analysis output is too brief (minimum 30 characters required)');
        }
        break;

      case 'PLANNING':
        if (!result.summary.toLowerCase().includes('step') && !result.summary.toLowerCase().includes('plan') && !result.outputs?.steps) {
          errors.push('Planning task result must contain step-by-step decomposition or planning artifact');
        }
        break;

      case 'DOCUMENTATION':
        if (result.summary.length < 50) {
          errors.push('Documentation task output must provide sufficient explanatory text');
        }
        break;

      case 'CLASSIFICATION':
        if (!result.outputs?.category && !result.summary.includes(':')) {
          errors.push('Classification task must yield an identified category or tag');
        }
        break;

      case 'CODING':
      case 'TESTING':
      case 'RESEARCH':
      case 'SECURITY':
      case 'REVIEW':
      default:
        // Basic non-empty verification for generic tasks in Phase 3
        if (result.summary.length < 10) {
          errors.push(`Output for task type ${task.taskType} is insufficiently detailed`);
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
