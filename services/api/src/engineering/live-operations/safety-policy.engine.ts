// ==========================================================
// services/api/src/engineering/live-operations/safety-policy.engine.ts
// Phase 27: Production Safety Policy Engine (§1–§9, §14–§17)
// ==========================================================

import type {
  ActionRisk,
  BlastRadiusClass,
  ProductionActionRequest,
  SafetyPolicyEvaluationResult,
} from './phase-27.types.js';

export class PolicyDeniedError extends Error {
  constructor(message: string, public readonly reasons: string[]) {
    super(message);
    this.name = 'PolicyDeniedError';
  }
}

export class SafetyPolicyEngine {
  // Global Production Safety Kill Switch (§17)
  private killSwitchActive = false;
  private killSwitchReason = '';
  private killSwitchActivatedAt?: string;

  // Level 1 Allowlisted Actions (§3)
  private static readonly LOW_RISK_ALLOWLIST = new Set<string>([
    'restart_stateless_worker',
    'restart_failed_process',
    'recycle_unhealthy_container',
    'clear_bounded_cache',
    'retry_transient_health_check',
    'requeue_recoverable_job',
    'rotate_ephemeral_worker',
    'restore_replica_count_within_limits',
  ]);

  // Level 2 Controlled Autonomous Approved Actions (§4)
  private static readonly CONTROLLED_ALLOWLIST = new Set<string>([
    'isolate_and_restart_instance',
    'invoke_approved_rollback',
    'recover_db_connection_pool',
    'restart_stateless_db_client',
    'rotate_application_logs',
    'purge_temporary_disk_spool',
    'reconcile_stateless_replica_drift',
    'trigger_stale_backup_verification',
  ]);

  // Level 4 Forbidden Actions (§6)
  private static readonly FORBIDDEN_ACTIONS = new Set<string>([
    'delete_production_database',
    'drop_table',
    'drop_database',
    'drop_schema',
    'truncate_table',
    'bulk_delete_records',
    'disable_audit_logging',
    'disable_security_controls',
    'exfiltrate_secrets',
    'print_production_secrets',
    'copy_credentials_to_context',
    'grant_elevated_permissions',
    'bypass_human_approval',
    'modify_safety_policy',
    'bypass_policy_engine',
    'deploy_unverified_artifact',
    'destroy_backups',
    'delete_forensic_evidence',
  ]);

  // Level 3 Human Approval Required Actions (§5, §15)
  private static readonly HUMAN_APPROVAL_ACTIONS = new Set<string>([
    'destructive_database_migration',
    'schema_destruction',
    'mass_data_modification',
    'credential_rotation_unknown_blast_radius',
    'production_secret_change',
    'firewall_network_policy_change',
    'iam_permission_change',
    'provision_new_cost_infrastructure',
    'change_security_policy',
    'change_production_architecture',
    'change_autoscaling_limits',
    'cross_project_mutation',
    'modify_persistent_data',
    'change_backup_policy',
    'disable_monitoring',
    'change_dns_routing',
    'deploy_untested_hotfix',
  ]);

  /**
   * Activate Global Production Safety Kill Switch (§17)
   */
  public engageKillSwitch(reason: string): void {
    this.killSwitchActive = true;
    this.killSwitchReason = reason;
    this.killSwitchActivatedAt = new Date().toISOString();
  }

  /**
   * Deactivate Global Production Safety Kill Switch (§17)
   */
  public disengageKillSwitch(): void {
    this.killSwitchActive = false;
    this.killSwitchReason = '';
    this.killSwitchActivatedAt = undefined;
  }

  /**
   * Check if Kill Switch is currently active
   */
  public isKillSwitchActive(): boolean {
    return this.killSwitchActive;
  }

  public getKillSwitchDetails(): { active: boolean; reason: string; activatedAt?: string } {
    return {
      active: this.killSwitchActive,
      reason: this.killSwitchReason,
      activatedAt: this.killSwitchActivatedAt,
    };
  }

  /**
   * Classify risk level of a requested action name (§2–§6)
   */
  public classifyActionRisk(action: string): ActionRisk {
    const normalized = action.toLowerCase().trim();

    if (SafetyPolicyEngine.FORBIDDEN_ACTIONS.has(normalized)) {
      return 'FORBIDDEN';
    }

    if (
      normalized.startsWith('drop_') ||
      normalized.startsWith('delete_prod_') ||
      normalized.includes('truncate') ||
      normalized.includes('disable_audit') ||
      normalized.includes('disable_security') ||
      normalized.includes('bypass_')
    ) {
      return 'FORBIDDEN';
    }

    if (SafetyPolicyEngine.HUMAN_APPROVAL_ACTIONS.has(normalized)) {
      return 'HUMAN_APPROVAL_REQUIRED';
    }

    if (
      normalized.startsWith('read_') ||
      normalized.startsWith('inspect_') ||
      normalized.startsWith('check_') ||
      normalized.startsWith('get_')
    ) {
      return 'READ_ONLY';
    }

    if (SafetyPolicyEngine.LOW_RISK_ALLOWLIST.has(normalized)) {
      return 'LOW_RISK_AUTONOMOUS';
    }

    if (SafetyPolicyEngine.CONTROLLED_ALLOWLIST.has(normalized)) {
      return 'CONTROLLED_AUTONOMOUS';
    }

    // Default to requiring human review if unknown
    return 'HUMAN_APPROVAL_REQUIRED';
  }

  /**
   * Classify blast radius acceptable boundaries (§8)
   */
  public isBlastRadiusAcceptableForAutonomy(
    blastRadius: BlastRadiusClass,
    risk: ActionRisk
  ): boolean {
    if (blastRadius === 'MULTI_SERVICE' || blastRadius === 'MULTI_PROJECT' || blastRadius === 'GLOBAL') {
      // Must always require human approval
      return false;
    }

    if (blastRadius === 'SINGLE_SERVICE') {
      // Allowed only for CONTROLLED_AUTONOMOUS with explicit policy
      return risk === 'CONTROLLED_AUTONOMOUS';
    }

    // SINGLE_PROCESS, SINGLE_CONTAINER, SINGLE_INSTANCE
    return risk === 'LOW_RISK_AUTONOMOUS' || risk === 'CONTROLLED_AUTONOMOUS' || risk === 'READ_ONLY';
  }

  /**
   * Evaluate a production action request deterministically (§1, §7, §9)
   */
  public evaluatePolicy(request: ProductionActionRequest): SafetyPolicyEvaluationResult {
    const evaluatedAt = new Date().toISOString();
    const evaluatedRisk = this.classifyActionRisk(request.action);
    const reasons: string[] = [];
    const unmetPreconditions: string[] = [];

    // 1. Check Kill Switch (§17)
    if (this.killSwitchActive) {
      if (evaluatedRisk !== 'READ_ONLY') {
        reasons.push(
          `KILL_SWITCH_ACTIVE: Global production safety kill switch is engaged (${this.killSwitchReason || 'Manual override'}). All autonomous mutations blocked.`
        );
        return {
          allowed: false,
          policyDecision: 'REQUIRE_HUMAN_APPROVAL',
          risk: evaluatedRisk,
          reasons,
          preconditionsMet: false,
          unmetPreconditions: ['KILL_SWITCH_ACTIVE'],
          blastRadiusAcceptable: false,
          killSwitchActive: true,
          evaluatedAt,
        };
      }
    }

    // 2. Level 4: FORBIDDEN Check (§6)
    if (evaluatedRisk === 'FORBIDDEN') {
      reasons.push(`POLICY_DENIED: Action '${request.action}' is explicitly forbidden under Level 4 Safety Policy.`);
      return {
        allowed: false,
        policyDecision: 'POLICY_DENIED',
        risk: 'FORBIDDEN',
        reasons,
        preconditionsMet: false,
        unmetPreconditions: ['ACTION_NOT_FORBIDDEN'],
        blastRadiusAcceptable: false,
        killSwitchActive: this.killSwitchActive,
        evaluatedAt,
      };
    }

    // 3. Level 0: READ_ONLY (§2)
    if (evaluatedRisk === 'READ_ONLY') {
      return {
        allowed: true,
        policyDecision: 'ALLOW_AUTONOMOUS',
        risk: 'READ_ONLY',
        reasons: ['READ_ONLY action does not mutate production state.'],
        preconditionsMet: true,
        unmetPreconditions: [],
        blastRadiusAcceptable: true,
        killSwitchActive: this.killSwitchActive,
        evaluatedAt,
      };
    }

    // 4. Level 3: HUMAN_APPROVAL_REQUIRED Check (§5)
    if (evaluatedRisk === 'HUMAN_APPROVAL_REQUIRED') {
      reasons.push(
        `Action '${request.action}' modifies high-risk production configuration, architecture, database schema, or credentials and requires explicit human approval.`
      );
      return {
        allowed: false,
        policyDecision: 'REQUIRE_HUMAN_APPROVAL',
        risk: 'HUMAN_APPROVAL_REQUIRED',
        reasons,
        preconditionsMet: false,
        unmetPreconditions: ['HUMAN_APPROVAL_GRANTED'],
        blastRadiusAcceptable: false,
        killSwitchActive: this.killSwitchActive,
        evaluatedAt,
      };
    }

    // 5. Blast Radius Check (§8)
    const blastAcceptable = this.isBlastRadiusAcceptableForAutonomy(request.blastRadius, evaluatedRisk);
    if (!blastAcceptable) {
      reasons.push(
        `Blast radius '${request.blastRadius}' exceeds autonomous threshold for risk tier '${evaluatedRisk}'. Multi-service/project/global impact mandates human review.`
      );
      unmetPreconditions.push('BLAST_RADIUS_WITHIN_THRESHOLD');
    }

    // 6. Precondition Checks (§9)
    if (!request.incidentId || request.incidentId.trim() === '') {
      unmetPreconditions.push('INCIDENT_IDENTIFIED');
      reasons.push('Incident ID is required for autonomous remediation.');
    }

    if (!request.target || request.target.trim() === '') {
      unmetPreconditions.push('TARGET_IDENTIFIED');
      reasons.push('Target instance, process, or container must be explicitly identified.');
    }

    if (!request.verificationPlan || request.verificationPlan.trim() === '') {
      unmetPreconditions.push('VERIFICATION_PLAN_AVAILABLE');
      reasons.push('Automated post-remediation verification plan is mandatory (§13).');
    }

    if (!request.rollbackAvailable && evaluatedRisk === 'CONTROLLED_AUTONOMOUS') {
      unmetPreconditions.push('ROLLBACK_AVAILABLE');
      reasons.push('Controlled autonomous remediation requires a validated rollback/recovery path (§4, §14).');
    }

    if (unmetPreconditions.length > 0) {
      return {
        allowed: false,
        policyDecision: 'REQUIRE_HUMAN_APPROVAL',
        risk: evaluatedRisk,
        reasons,
        preconditionsMet: false,
        unmetPreconditions,
        blastRadiusAcceptable: blastAcceptable,
        killSwitchActive: this.killSwitchActive,
        evaluatedAt,
      };
    }

    // 7. Approved Autonomous Mutation (§3, §4)
    return {
      allowed: true,
      policyDecision: 'ALLOW_AUTONOMOUS',
      risk: evaluatedRisk,
      reasons: [
        `Action '${request.action}' satisfies all autonomous safety preconditions under risk tier '${evaluatedRisk}' with bounded blast radius '${request.blastRadius}'.`,
      ],
      preconditionsMet: true,
      unmetPreconditions: [],
      blastRadiusAcceptable: true,
      killSwitchActive: this.killSwitchActive,
      evaluatedAt,
    };
  }

  /**
   * Assert policy compliance before execution. Throws PolicyDeniedError on Level 4 rejection.
   */
  public assertExecutionPermitted(request: ProductionActionRequest): SafetyPolicyEvaluationResult {
    const evalResult = this.evaluatePolicy(request);

    if (evalResult.policyDecision === 'POLICY_DENIED') {
      throw new PolicyDeniedError(
        `TECHNICAL POLICY DENIAL: Action '${request.action}' violates Level 4 safety rules.`,
        evalResult.reasons
      );
    }

    return evalResult;
  }
}
