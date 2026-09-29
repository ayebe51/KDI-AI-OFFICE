// ==========================================================
// services/api/src/engineering/skills/engineering-skills.catalog.ts
// Reusable Antigravity Engineering Skills Catalog
// ==========================================================

import type { EngineeringSkillDefinition } from '@kdi/types';

export const REUSABLE_ENGINEERING_SKILLS: EngineeringSkillDefinition[] = [
  {
    skillId: 'code-analysis',
    name: 'Code Analysis & AST Inspection',
    description: 'Deep structural analysis of codebases, dependencies, and architectural patterns',
    purpose: 'Examine code structures, dependency graphs, and code quality before proposing modifications',
    whenToUse: 'When beginning an engineering task, reviewing unfamiliar repos, or assessing code health',
    workflow: [
      '1. Inspect directory layout and configuration files (package.json, tsconfig, etc.)',
      '2. Scan symbol references, classes, interfaces, and function signatures',
      '3. Map data flow and dependency relationships',
      '4. Identify potential complexity bottlenecks or architectural violations',
    ],
    constraints: [
      'Read-only operation; do not edit files during analysis',
      'Respect file access boundaries and ignore excluded directories (.git, node_modules)',
    ],
    validation: [
      'Ensure all identified symbols and imports exist in active code',
      'Confirm dependency versions match active lockfiles',
    ],
    outputFormat: 'Structured JSON or Markdown architectural summary with exact file and line references',
  },
  {
    skillId: 'bug-fixing',
    name: 'Surgical Bug Fixing & Patching',
    description: 'Diagnose and remediate software defects with minimal blast radius and regression tests',
    purpose: 'Fix root causes of bugs while preserving all existing intended functionality',
    whenToUse: 'When resolving bug reports, test failures, or runtime exceptions',
    workflow: [
      '1. Reproduce the bug using an automated test or deterministic reproduction script',
      '2. Trace stack traces and isolate root cause',
      '3. Formulate minimal surgical code modification',
      '4. Implement fix in isolated workspace',
      '5. Write a regression test verifying the bug is resolved',
      '6. Run the full test suite to guarantee zero regression',
    ],
    constraints: [
      'Do not rewrite unrelated modules or reformat untouched files',
      'Never claim a bug is fixed without a passing test',
    ],
    validation: [
      'Regression test fails before fix and passes after fix',
      'Entire existing test suite passes cleanly',
    ],
    outputFormat: 'Unified git diff accompanied by test execution evidence',
  },
  {
    skillId: 'feature-development',
    name: 'Feature Implementation',
    description: 'Implement new business logic, API endpoints, and UI components from specifications',
    purpose: 'Develop complete, production-grade features adhering to KDI architectural standards',
    whenToUse: 'When implementing user stories, new endpoints, services, or domain components',
    workflow: [
      '1. Review requirement specifications and acceptance criteria',
      '2. Design domain models, interfaces, and function signatures',
      '3. Implement business logic following established repository patterns',
      '4. Write comprehensive unit and integration tests',
      '5. Run linter, typechecker, and build commands',
    ],
    constraints: [
      'Strict adherence to TypeScript strict mode and linting rules',
      'Zero untested public functions or endpoints',
    ],
    validation: [
      'Typecheck passes with zero errors',
      'All unit and integration tests pass',
      'Acceptance criteria explicitly verified',
    ],
    outputFormat: 'Surgical multi-file changes with verified test coverage',
  },
  {
    skillId: 'testing',
    name: 'Automated Test Authoring & Validation',
    description: 'Design and execute unit, integration, and contract tests',
    purpose: 'Ensure software reliability, verify edge cases, and maintain high test coverage',
    whenToUse: 'When verifying code changes, adding test coverage, or reproducing reported bugs',
    workflow: [
      '1. Identify happy paths, edge cases, and failure modes',
      '2. Formulate test fixtures and mock dependencies cleanly',
      '3. Execute test runner in non-interactive mode',
      '4. Collect test execution telemetry (duration, pass/fail counts)',
    ],
    constraints: [
      'Tests must be deterministic and isolated (no shared mutable global state)',
      'Tests must clean up temporary files and network listeners',
    ],
    validation: [
      'Test runner exit code is strictly 0',
      'Zero flaky or unhandled asynchronous rejections',
    ],
    outputFormat: 'Test file additions and structured test execution evidence',
  },
  {
    skillId: 'debugging',
    name: 'Root Cause Diagnostics & Failure Tracing',
    description: 'Systematically diagnose failing tests, runtime crashes, and performance issues',
    purpose: 'Isolate obscure bugs, race conditions, memory leaks, or unhandled promise rejections',
    whenToUse: 'When test suites fail, workers crash, or unexpected behavior occurs in runtime',
    workflow: [
      '1. Collect execution logs, stack traces, and system error events',
      '2. Formulate falsifiable hypotheses',
      '3. Introduce diagnostic instrumentation or assertions',
      '4. Pinpoint exact faulty code statement or race condition',
    ],
    constraints: [
      'Remove all temporary debugging prints before committing code',
      'Do not mask errors with catch-all empty exception handlers',
    ],
    validation: [
      'Identified root cause directly accounts for all observed symptoms',
    ],
    outputFormat: 'Root Cause Analysis (RCA) report and remediation plan',
  },
  {
    skillId: 'refactoring',
    name: 'Behavior-Preserving Code Refactoring',
    description: 'Restructure existing code to improve maintainability and performance without changing external behavior',
    purpose: 'Clean up technical debt, improve code organization, and eliminate duplication',
    whenToUse: 'When optimizing performance, decomposing monolithic files, or updating deprecated APIs',
    workflow: [
      '1. Verify full existing test suite passes before making any modifications',
      '2. Apply small, incremental structural changes',
      '3. Run tests after each transformation step',
      '4. Verify public interfaces remain 100% backwards compatible',
    ],
    constraints: [
      'Strict invariant: Zero external behavior change',
      'Do not mix functional feature additions with refactoring',
    ],
    validation: [
      'All pre-existing test suites continue to pass without modification',
      'Typecheck passes with zero interface changes',
    ],
    outputFormat: 'Clean, surgical git diff demonstrating reduced complexity',
  },
  {
    skillId: 'security-review',
    name: 'Security Vulnerability & Threat Assessment',
    description: 'Audit code for security vulnerabilities, injection flaws, and authorization bypasses',
    purpose: 'Identify and remediate security risks before deployment',
    whenToUse: 'When reviewing PRs, auditing external dependencies, or inspecting authentication flows',
    workflow: [
      '1. Scan for OWASP Top 10 vulnerabilities (SQLi, command injection, XSS, etc.)',
      '2. Verify authorization checks on all public endpoints',
      '3. Check for hardcoded secrets, API keys, and insecure defaults',
      '4. Audit third-party dependency CVE advisories',
    ],
    constraints: [
      'Never output unredacted real secrets or vulnerable exploit payloads',
      'Immediately escalate critical vulnerabilities to human operator',
    ],
    validation: [
      'Zero high or critical severity vulnerabilities detected',
    ],
    outputFormat: 'Security assessment matrix with CVSS ratings and remediation patches',
  },
  {
    skillId: 'code-review',
    name: 'Automated Code Review & Quality Gating',
    description: 'Comprehensive code review against enterprise coding standards and architectural conventions',
    purpose: 'Ensure consistency, readability, error handling, and performance across all changes',
    whenToUse: 'When evaluating git diffs prior to merging or task completion',
    workflow: [
      '1. Review git diff chunk by chunk',
      '2. Verify naming conventions, documentation, and error handling',
      '3. Check that tests accompany all new logic',
      '4. Verify no secrets or debug statements are left in the patch',
    ],
    constraints: [
      'Be constructive and specific with actionable line-by-line feedback',
    ],
    validation: [
      'All review feedback items link to specific code lines',
    ],
    outputFormat: 'Formal review approval or change requests with line comments',
  },
  {
    skillId: 'database-migration-review',
    name: 'Database Schema & Migration Review',
    description: 'Inspect SQL migrations for performance, backward compatibility, and data loss risks',
    purpose: 'Prevent destructive operations, unindexed foreign keys, and table locks in production',
    whenToUse: 'When adding or modifying PostgreSQL schemas, migrations, or database queries',
    workflow: [
      '1. Check for destructive statements (DROP, TRUNCATE, ALTER COLUMN type)',
      '2. Verify backward compatibility with currently running application code',
      '3. Check that appropriate indexes exist for foreign keys and frequent queries',
      '4. Verify reversible down migrations exist',
    ],
    constraints: [
      'Destructive database operations strictly require human approval',
    ],
    validation: [
      'Migration applies cleanly in test environment and rolls back cleanly',
    ],
    outputFormat: 'Migration safety assessment and SQL execution plan',
  },
  {
    skillId: 'documentation',
    name: 'Technical Documentation & ADR Authoring',
    description: 'Author and maintain accurate technical documentation, API specs, and ADRs',
    purpose: 'Keep architectural documentation synchronized with actual code implementation',
    whenToUse: 'When introducing new architectural decisions, modules, or APIs',
    workflow: [
      '1. Review actual implementation code and contracts',
      '2. Document design context, decisions, consequences, and alternatives',
      '3. Include clear code examples and Mermaid architectural diagrams',
      '4. Validate all markdown links and symbol references',
    ],
    constraints: [
      'Do not document hypothetical or non-existent features as implemented',
      'Preserve existing comments and docstrings',
    ],
    validation: [
      'All file paths and symbol links are verified to exist',
    ],
    outputFormat: 'Standard GitHub Flavored Markdown documents with clickable file links',
  },
];

export class EngineeringSkillsCatalog {
  public static getSkill(skillId: string): EngineeringSkillDefinition | undefined {
    return REUSABLE_ENGINEERING_SKILLS.find((s) => s.skillId === skillId);
  }

  public static listSkills(): EngineeringSkillDefinition[] {
    return REUSABLE_ENGINEERING_SKILLS;
  }
}
