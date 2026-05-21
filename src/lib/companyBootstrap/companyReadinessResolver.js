export const COMPANY_READINESS_SEVERITIES = Object.freeze({
  CRITICAL: 'critical',
  WARNING: 'warning',
  OPTIONAL: 'optional',
  DEFERRED: 'deferred',
  UNKNOWN: 'unknown',
});

export const COMPANY_READINESS_ITEM_STATUSES = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  WARNING: 'warning',
  OPTIONAL: 'optional',
  DEFERRED: 'deferred',
  UNKNOWN: 'unknown',
});

export const COMPANY_READINESS_STATUSES = Object.freeze({
  READY_FOR_ORDERS: 'ready_for_orders',
  NOT_READY: 'not_ready',
  UNKNOWN: 'unknown',
});

const RESOLVER_SOURCE = Object.freeze({
  resolver: 'companyReadinessResolver',
  version: '10B2-read-only',
  inputContract: 'rpc_company_setup_context',
  mode: 'diagnostic_only',
  runtimeWired: false,
});

const UNKNOWN_SETUP_KEYS = Object.freeze([
  'order_numbering',
  'notification_defaults',
  'onboarding_persistence',
  'module_package_state',
]);

const freezeArray = (items = []) => Object.freeze([...items]);

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readValue = (context, ...keys) => {
  if (!isRecord(context)) return undefined;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      return context[key];
    }
  }

  return undefined;
};

const readBoolean = (context, fallback, ...keys) => {
  const value = readValue(context, ...keys);
  return typeof value === 'boolean' ? value : fallback;
};

const readNumber = (context, fallback, ...keys) => {
  const value = readValue(context, ...keys);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const readNestedBoolean = (context, path, fallback = false) => {
  const value = path.reduce((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, context);

  return typeof value === 'boolean' ? value : fallback;
};

const normalizeGeneratedAt = (generatedAt) => {
  if (typeof generatedAt === 'string') return generatedAt;
  if (generatedAt instanceof Date) return generatedAt.toISOString();
  return new Date().toISOString();
};

const createItem = ({
  key,
  category,
  label,
  severity,
  status,
  blocking = false,
  message,
  remediation,
  evidence = {},
}) =>
  Object.freeze({
    key,
    category,
    label,
    severity,
    status,
    blocking,
    message,
    remediation,
    evidence: Object.freeze({ ...evidence }),
  });

const createUnknownItem = (key, label, message) =>
  createItem({
    key,
    category: key,
    label,
    severity: COMPANY_READINESS_SEVERITIES.UNKNOWN,
    status: COMPANY_READINESS_ITEM_STATUSES.UNKNOWN,
    blocking: false,
    message,
    remediation: 'Inspect in a later storage/model slice before treating this as ready.',
  });

const countSeverities = (items) => {
  const counts = Object.values(COMPANY_READINESS_SEVERITIES).reduce(
    (accumulator, severity) => ({ ...accumulator, [severity]: 0 }),
    {},
  );

  items.forEach((item) => {
    counts[item.severity] += 1;
  });

  return Object.freeze(counts);
};

const itemDidNotPass = (item) => item.status !== COMPANY_READINESS_ITEM_STATUSES.PASS;

const getNextAction = (blockingItems, warningItems, unknownItems) => {
  const [firstBlocking] = blockingItems;
  if (firstBlocking) return firstBlocking.remediation;

  const [firstWarning] = warningItems;
  if (firstWarning) return firstWarning.remediation;

  const [firstUnknown] = unknownItems;
  if (firstUnknown) return firstUnknown.remediation;

  return 'Enter the workspace; continue monitoring readiness diagnostics as setup models mature.';
};

const resolveStatus = (context, blockingItems) => {
  if (!context) return COMPANY_READINESS_STATUSES.UNKNOWN;
  if (blockingItems.length > 0) return COMPANY_READINESS_STATUSES.NOT_READY;
  return COMPANY_READINESS_STATUSES.READY_FOR_ORDERS;
};

export const resolveCompanyReadiness = (setupContext, options = {}) => {
  const context = isRecord(setupContext) ? setupContext : null;
  const companyId = readValue(context, 'companyId', 'company_id') ?? null;
  const companyStatus = readValue(context, 'companyStatus', 'company_status');
  const activeCompanyContextValid = readBoolean(
    context,
    false,
    'activeCompanyContextValid',
    'active_company_context_valid',
  );
  const profileComplete = readBoolean(context, false, 'profileComplete', 'profile_complete');
  const ownerInvariantOk = readBoolean(context, false, 'ownerInvariantOk', 'owner_invariant_ok');
  const activeOwnerCount = readNumber(context, 0, 'activeOwnerCount', 'active_owner_count');
  const activeMemberCount = readNumber(context, 0, 'activeMemberCount', 'active_member_count');
  const rolePresetsReady = readBoolean(context, false, 'rolePresetsReady', 'role_presets_ready');
  const ownerRoleReady = readBoolean(context, false, 'ownerRoleReady', 'owner_role_ready');
  const auditReady = readNestedBoolean(context, ['audit_readiness', 'has_bootstrap_audit']);
  const dashboardReady =
    readNestedBoolean(context, ['dashboard_readiness', 'has_any_dashboard']) ||
    readNestedBoolean(context, ['dashboardReadiness', 'hasAnyDashboard']);
  const relationshipSummaryKnown =
    isRecord(readValue(context, 'relationship_readiness', 'relationshipReadiness')) ||
    isRecord(readValue(context, 'relationship_summary', 'relationshipSummary'));
  const assignmentSummaryKnown =
    isRecord(readValue(context, 'assignment_readiness', 'assignmentReadiness')) ||
    isRecord(readValue(context, 'assignment_summary', 'assignmentSummary'));
  const invitationSummaryKnown =
    isRecord(readValue(context, 'invitation_summary', 'invitationSummary')) ||
    Array.isArray(readValue(context, 'invitations', 'invitationSummaries'));

  const items = [
    createItem({
      key: 'setup_context_available',
      category: 'setup_context',
      label: 'Setup context available',
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: context
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.FAIL,
      blocking: true,
      message: context
        ? 'Setup context was provided to the local resolver.'
        : 'No setup context was provided, so readiness cannot be determined safely.',
      remediation: 'Load guarded setup context before evaluating readiness.',
    }),
    createItem({
      key: 'company_profile',
      category: 'company_profile',
      label: 'Company profile',
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: companyId && companyStatus === 'active' && profileComplete
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.FAIL,
      blocking: true,
      message:
        companyId && companyStatus === 'active' && profileComplete
          ? 'Company identity and profile signals are present.'
          : 'Company identity, active status, or profile completion is missing.',
      remediation: 'Review company setup context or complete company profile setup.',
      evidence: { companyId, companyStatus: companyStatus ?? null, profileComplete },
    }),
    createItem({
      key: 'owner_presence',
      category: 'owner',
      label: 'Owner presence',
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: ownerInvariantOk && activeOwnerCount > 0
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.FAIL,
      blocking: true,
      message:
        ownerInvariantOk && activeOwnerCount > 0
          ? 'An active owner invariant is present for the company.'
          : 'No active owner invariant was confirmed for the company.',
      remediation: 'Repair bootstrap owner membership or owner role assignment through a backend-owned path.',
      evidence: { ownerInvariantOk, activeOwnerCount },
    }),
    createItem({
      key: 'owner_active_membership',
      category: 'owner',
      label: 'Owner active membership signal',
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: activeCompanyContextValid && activeMemberCount > 0
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.FAIL,
      blocking: true,
      message:
        activeCompanyContextValid && activeMemberCount > 0
          ? 'Current company context has an active member signal.'
          : 'Active company context or active member signal is missing.',
      remediation: 'Confirm active company context and active owner membership before setup continues.',
      evidence: { activeCompanyContextValid, activeMemberCount },
    }),
    createItem({
      key: 'role_presets',
      category: 'roles',
      label: 'Role presets',
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: rolePresetsReady
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.FAIL,
      blocking: true,
      message: rolePresetsReady
        ? 'Required role preset signals are present.'
        : 'Required role preset signals are missing.',
      remediation: 'Repair seeded role presets before relying on setup flows.',
      evidence: { rolePresetsReady },
    }),
    createItem({
      key: 'owner_role_assignment',
      category: 'roles',
      label: 'Owner role assignment',
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: ownerRoleReady
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.FAIL,
      blocking: true,
      message: ownerRoleReady
        ? 'Owner role assignment readiness is confirmed.'
        : 'Owner role assignment readiness is missing.',
      remediation: 'Repair company-scoped owner role assignment through a backend-owned path.',
      evidence: { ownerRoleReady },
    }),
    createItem({
      key: 'bootstrap_audit_event',
      category: 'audit',
      label: 'Bootstrap audit event',
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: auditReady
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.FAIL,
      blocking: true,
      message: auditReady
        ? 'Bootstrap audit signal is present.'
        : 'Bootstrap audit signal is missing or unavailable.',
      remediation: 'Inspect bootstrap audit history before marking setup ready.',
      evidence: { auditReady },
    }),
    createItem({
      key: 'dashboard_projection',
      category: 'dashboard',
      label: 'Dashboard readiness projection',
      severity: COMPANY_READINESS_SEVERITIES.WARNING,
      status: dashboardReady
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.WARNING,
      blocking: false,
      message: dashboardReady
        ? 'Dashboard readiness projection is available.'
        : 'Dashboard readiness projection is missing or incomplete.',
      remediation: 'Keep dashboard setup prompts diagnostic until a later readiness integration slice.',
      evidence: { dashboardReady },
    }),
    createItem({
      key: 'invitation_pipeline',
      category: 'team',
      label: 'Invitation pipeline summary',
      severity: COMPANY_READINESS_SEVERITIES.OPTIONAL,
      status: invitationSummaryKnown
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.OPTIONAL,
      blocking: false,
      message: invitationSummaryKnown
        ? 'Invitation summary input is available.'
        : 'Invitation summary input is not present; solo-owner operation can still be ready.',
      remediation: 'Use invitation summaries later for owner setup and Team Access prompts.',
      evidence: { invitationSummaryKnown },
    }),
    createItem({
      key: 'relationship_summary',
      category: 'relationships',
      label: 'Relationship aggregate summary',
      severity: COMPANY_READINESS_SEVERITIES.DEFERRED,
      status: relationshipSummaryKnown
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.DEFERRED,
      blocking: false,
      message: relationshipSummaryKnown
        ? 'Relationship aggregate input is available as advisory context.'
        : 'Relationship readiness is deferred unless a future package explicitly enables it.',
      remediation: 'Keep relationship readiness advisory until package/module state is durable.',
      evidence: { relationshipSummaryKnown },
    }),
    createItem({
      key: 'assignment_summary',
      category: 'assignments',
      label: 'Assignment aggregate summary',
      severity: COMPANY_READINESS_SEVERITIES.DEFERRED,
      status: assignmentSummaryKnown
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.DEFERRED,
      blocking: false,
      message: assignmentSummaryKnown
        ? 'Assignment aggregate input is available as advisory context.'
        : 'Assignment readiness is deferred unless a future package explicitly enables it.',
      remediation: 'Keep assignment readiness advisory until package/module state is durable.',
      evidence: { assignmentSummaryKnown },
    }),
    createItem({
      key: 'staff_readiness',
      category: 'team',
      label: 'Staff readiness',
      severity: COMPANY_READINESS_SEVERITIES.OPTIONAL,
      status: activeMemberCount > 1
        ? COMPANY_READINESS_ITEM_STATUSES.PASS
        : COMPANY_READINESS_ITEM_STATUSES.OPTIONAL,
      blocking: false,
      message:
        activeMemberCount > 1
          ? 'Additional active staff are present.'
          : 'Solo-owner operation remains allowed until a package requires staff setup.',
      remediation: 'Invite staff later if the company package or operations require it.',
      evidence: { activeMemberCount },
    }),
    ...UNKNOWN_SETUP_KEYS.map((key) =>
      createUnknownItem(
        key,
        key
          .split('_')
          .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
          .join(' '),
        `${key} cannot be assessed from the current setup context without inventing backend state.`,
      ),
    ),
  ];

  const blockingItems = items.filter((item) => item.blocking && itemDidNotPass(item));
  const warningItems = items.filter(
    (item) => item.severity === COMPANY_READINESS_SEVERITIES.WARNING && itemDidNotPass(item),
  );
  const unknownItems = items.filter(
    (item) => item.severity === COMPANY_READINESS_SEVERITIES.UNKNOWN && itemDidNotPass(item),
  );

  return Object.freeze({
    companyId,
    status: resolveStatus(context, blockingItems),
    severityCounts: countSeverities(items),
    checklistItems: freezeArray(items),
    blockingItems: freezeArray(blockingItems.map((item) => item.key)),
    warnings: freezeArray([...warningItems, ...unknownItems].map((item) => item.key)),
    nextRecommendedAction: getNextAction(blockingItems, warningItems, unknownItems),
    generatedAt: normalizeGeneratedAt(options.generatedAt),
    source: Object.freeze({ ...RESOLVER_SOURCE }),
  });
};
