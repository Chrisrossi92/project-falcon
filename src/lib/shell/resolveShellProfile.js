import { PERMISSIONS } from '../permissions/constants.js';

export const SHELL_PROFILE_IDS = Object.freeze({
  OPERATIONS: 'operations',
  MY_WORK: 'my_work',
  REVIEW_QUEUE: 'review_queue',
  RECEIVED_WORK: 'received_work',
  REQUESTS: 'requests',
  UNAVAILABLE: 'unavailable',
  COMPANY_REQUIRED: 'company_required',
  MEMBERSHIP_INACTIVE: 'membership_inactive',
  PROFILE_AMBIGUOUS: 'profile_ambiguous',
  MODULE_UNAVAILABLE: 'module_unavailable',
});

export const SHELL_PROFILE_AUTHORITY = Object.freeze({
  PRESENTATION_ONLY: 'presentation_only',
});

const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'owner', 'admin']);
const INACTIVE_MEMBERSHIP_STATUSES = new Set([
  'inactive',
  'disabled',
  'suspended',
  'revoked',
  'removed',
  'expired',
]);

const OWNER_ADMIN_ROLE_LABELS = new Set(['owner', 'admin', 'administrator', 'company_admin']);
const APPRAISER_ROLE_LABELS = new Set(['appraiser', 'staff_appraiser', 'staff appraiser']);
const REVIEWER_ROLE_LABELS = new Set(['reviewer', 'review', 'quality_control', 'quality control']);

const OWNER_ADMIN_PERMISSIONS = Object.freeze([
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_INVITE,
  PERMISSIONS.USERS_MANAGE_COMPANY_ACCESS,
  PERMISSIONS.ROLES_ASSIGN,
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.ORDERS_READ_ALL,
  PERMISSIONS.ORDERS_UPDATE_ALL,
  PERMISSIONS.ASSIGNMENTS_ASSIGN_APPRAISER,
  PERMISSIONS.ASSIGNMENTS_ASSIGN_REVIEWER,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
]);

const INTERNAL_ORDER_PERMISSIONS = Object.freeze([
  PERMISSIONS.NAVIGATION_ORDERS_VIEW,
  PERMISSIONS.ORDERS_READ_ALL,
  PERMISSIONS.ORDERS_READ_ASSIGNED,
  PERMISSIONS.CLIENTS_READ_ALL,
  PERMISSIONS.CLIENTS_READ_ASSIGNED,
]);

const APPRAISER_PERMISSIONS = Object.freeze([
  PERMISSIONS.ORDERS_READ_ASSIGNED,
  PERMISSIONS.ORDERS_UPDATE_ASSIGNED,
  PERMISSIONS.WORKFLOW_STATUS_SUBMIT_TO_REVIEW,
  PERMISSIONS.WORKFLOW_STATUS_RESUBMIT,
  PERMISSIONS.DOCUMENTS_READ_ASSIGNED,
  PERMISSIONS.DOCUMENTS_UPLOAD_ASSIGNED,
]);

const REVIEWER_PERMISSIONS = Object.freeze([
  PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
  PERMISSIONS.WORKFLOW_STATUS_APPROVE_REVIEW,
  PERMISSIONS.WORKFLOW_STATUS_READY_FOR_CLIENT,
  PERMISSIONS.REPORTS_VIEW_REVIEW_QUEUE,
]);

const ASSIGNMENT_RECIPIENT_PERMISSIONS = Object.freeze([
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_RESPOND,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_PROGRESS,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_COMPLETE,
]);

const normalizeString = (value) => String(value || '').trim();

const normalizeToken = (value) => normalizeString(value).toLowerCase();

const normalizePermissionKeys = (value) => {
  if (!value) return [];

  if (value instanceof Set) {
    return normalizePermissionKeys([...value]);
  }

  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeString).filter(Boolean))];
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, allowed]) => allowed === true)
      .map(([key]) => normalizeString(key))
      .filter(Boolean);
  }

  return [];
};

const normalizeRoleLabels = (value) => {
  if (!value) return [];

  if (value instanceof Set) {
    return normalizeRoleLabels([...value]);
  }

  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeToken).filter(Boolean))];
  }

  return [];
};

const normalizePrimaryRoleLabel = (value) => normalizeToken(value);

const normalizeInput = (input) => {
  if (!input) return {};

  if (Array.isArray(input) || input instanceof Set) {
    return { permissionKeys: normalizePermissionKeys(input) };
  }

  return input;
};

const hasAny = (permissionSet, permissions) =>
  permissions.some((permission) => permissionSet.has(permission));

const hasAnyRole = (roleSet, labels) => [...labels].some((label) => roleSet.has(label));

const hasCurrentCompany = (input) =>
  Boolean(
    input.hasCurrentCompany ??
      input.currentCompanyPresent ??
      input.currentCompanyId ??
      input.currentCompany?.id ??
      input.companyId,
  );

const hasAuthenticatedSession = (input) =>
  Boolean(input.authenticated ?? input.hasSession ?? input.session ?? input.user ?? input.userId);

const isMembershipInactive = (input) => {
  if (input.membershipActive === false || input.hasActiveMembership === false) {
    return true;
  }

  const status = normalizeToken(input.membershipStatus ?? input.membership?.status);
  return INACTIVE_MEMBERSHIP_STATUSES.has(status);
};

const isMembershipUsable = (input) => {
  if (input.membershipActive === true || input.hasActiveMembership === true) {
    return true;
  }

  const status = normalizeToken(input.membershipStatus ?? input.membership?.status);
  return !status || ACTIVE_MEMBERSHIP_STATUSES.has(status);
};

const getModuleAvailability = (input, profileId) => {
  const availability =
    input.moduleAvailability ?? input.productModuleAvailability ?? input.productModeAvailability;

  if (!availability || typeof availability !== 'object') {
    return undefined;
  }

  return availability[profileId];
};

const shellProfile = (id, label, reason, capabilities = {}) =>
  Object.freeze({
    id,
    label,
    reason,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    capabilities: Object.freeze({ ...capabilities }),
  });

export function getShellProfileCapabilities(input) {
  const normalizedInput = normalizeInput(input);
  const permissionKeys = normalizePermissionKeys(
    normalizedInput.permissionKeys ?? normalizedInput.permissions,
  );
  const permissionSet = new Set(permissionKeys);
  const roleLabels = normalizeRoleLabels(normalizedInput.roleLabels ?? normalizedInput.roles);
  const roleSet = new Set(roleLabels);
  const primaryRoleLabel = normalizePrimaryRoleLabel(
    normalizedInput.primaryRoleLabel ??
      normalizedInput.primaryRoleKey ??
      normalizedInput.primary_role_key,
  );

  const explicitOwnerAdmin =
    normalizedInput.hasOwnerAdminAuthority ??
    normalizedInput.isOwnerAdmin ??
    normalizedInput.ownerAdmin;
  const explicitAppraiser =
    normalizedInput.hasAppraiserResponsibilities ??
    normalizedInput.hasAppraiserResponsibility ??
    normalizedInput.isAppraiser;
  const explicitReviewer =
    normalizedInput.hasReviewerResponsibilities ??
    normalizedInput.hasReviewerResponsibility ??
    normalizedInput.isReviewer;
  const explicitAssignmentRecipient =
    normalizedInput.hasAssignmentRecipientAccess ?? normalizedInput.canReadAssignedAssignments;

  const hasOwnerAdminAuthority =
    explicitOwnerAdmin === undefined
      ? hasAnyRole(roleSet, OWNER_ADMIN_ROLE_LABELS) ||
        hasAny(permissionSet, OWNER_ADMIN_PERMISSIONS)
      : Boolean(explicitOwnerAdmin);
  const hasAppraiserResponsibility =
    explicitAppraiser === undefined
      ? hasAnyRole(roleSet, APPRAISER_ROLE_LABELS) || hasAny(permissionSet, APPRAISER_PERMISSIONS)
      : Boolean(explicitAppraiser);
  const hasReviewerResponsibility =
    explicitReviewer === undefined
      ? hasAnyRole(roleSet, REVIEWER_ROLE_LABELS) || hasAny(permissionSet, REVIEWER_PERMISSIONS)
      : Boolean(explicitReviewer);
  const hasAssignmentRecipientAccess =
    explicitAssignmentRecipient === undefined
      ? hasAny(permissionSet, ASSIGNMENT_RECIPIENT_PERMISSIONS)
      : Boolean(explicitAssignmentRecipient);
  const hasInternalOrderAccess = Boolean(
    normalizedInput.hasInternalOrderAccess ?? hasAny(permissionSet, INTERNAL_ORDER_PERMISSIONS),
  );
  const assignmentOnlyAccess = Boolean(
    normalizedInput.assignmentOnlyAccess ??
      (hasAssignmentRecipientAccess && !hasInternalOrderAccess && !hasOwnerAdminAuthority),
  );
  const requestsModuleAvailable =
    getModuleAvailability(normalizedInput, SHELL_PROFILE_IDS.REQUESTS) ??
    normalizedInput.requestsModuleAvailable ??
    normalizedInput.clientRequestsAvailable;
  const hasClientRequestsAuthority = Boolean(
    normalizedInput.hasClientRequestsAuthority ??
      normalizedInput.isClientPortalUser ??
      normalizedInput.clientRequestsMode,
  );

  return Object.freeze({
    authenticated: hasAuthenticatedSession(normalizedInput),
    currentCompanyPresent: hasCurrentCompany(normalizedInput),
    membershipInactive: isMembershipInactive(normalizedInput),
    membershipUsable: isMembershipUsable(normalizedInput),
    profileAmbiguous: Boolean(normalizedInput.profileAmbiguous),
    requestedProfileId: normalizedInput.requestedProfileId ?? null,
    permissionKeys: Object.freeze(permissionKeys),
    roleLabels: Object.freeze(roleLabels),
    primaryRoleLabel,
    hasPrimaryOwnerAdminRole: hasAnyRole(new Set([primaryRoleLabel]), OWNER_ADMIN_ROLE_LABELS),
    hasPrimaryAppraiserRole: hasAnyRole(new Set([primaryRoleLabel]), APPRAISER_ROLE_LABELS),
    hasPrimaryReviewerRole: hasAnyRole(new Set([primaryRoleLabel]), REVIEWER_ROLE_LABELS),
    hasOwnerAdminAuthority,
    hasAppraiserResponsibility,
    hasReviewerResponsibility,
    hasAssignmentRecipientAccess,
    hasInternalOrderAccess,
    assignmentOnlyAccess,
    reviewWorkWaiting: Boolean(normalizedInput.reviewWorkWaiting),
    hasClientRequestsAuthority,
    requestsModuleAvailable,
  });
}

export function resolveShellProfile(input) {
  const capabilities = getShellProfileCapabilities(input);

  if (!capabilities.authenticated) {
    return shellProfile(
      SHELL_PROFILE_IDS.UNAVAILABLE,
      'Access unavailable',
      'auth_required',
      capabilities,
    );
  }

  if (!capabilities.currentCompanyPresent) {
    return shellProfile(
      SHELL_PROFILE_IDS.COMPANY_REQUIRED,
      'Company required',
      'current_company_required',
      capabilities,
    );
  }

  if (capabilities.membershipInactive || !capabilities.membershipUsable) {
    return shellProfile(
      SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE,
      'Membership inactive',
      'membership_inactive',
      capabilities,
    );
  }

  if (
    capabilities.requestedProfileId === SHELL_PROFILE_IDS.REQUESTS &&
    capabilities.requestsModuleAvailable === false
  ) {
    return shellProfile(
      SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
      'Workspace unavailable',
      'module_unavailable',
      capabilities,
    );
  }

  if (capabilities.profileAmbiguous) {
    return shellProfile(
      SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
      'Workspace selection needed',
      'profile_ambiguous',
      capabilities,
    );
  }

  if (capabilities.assignmentOnlyAccess) {
    return shellProfile(
      SHELL_PROFILE_IDS.RECEIVED_WORK,
      'Received Work',
      'assignment_only',
      capabilities,
    );
  }

  if (capabilities.hasClientRequestsAuthority && capabilities.requestsModuleAvailable === true) {
    return shellProfile(
      SHELL_PROFILE_IDS.REQUESTS,
      'Requests',
      'client_requests',
      capabilities,
    );
  }

  if (capabilities.hasPrimaryOwnerAdminRole || (!capabilities.primaryRoleLabel && capabilities.hasOwnerAdminAuthority)) {
    return shellProfile(
      SHELL_PROFILE_IDS.OPERATIONS,
      'Operations',
      'owner_admin_authority',
      capabilities,
    );
  }

  if (capabilities.hasPrimaryReviewerRole && capabilities.hasReviewerResponsibility) {
    return shellProfile(
      SHELL_PROFILE_IDS.REVIEW_QUEUE,
      'Review Queue',
      'primary_reviewer_role',
      capabilities,
    );
  }

  if (capabilities.hasPrimaryAppraiserRole && capabilities.hasAppraiserResponsibility) {
    return shellProfile(SHELL_PROFILE_IDS.MY_WORK, 'My Work', 'primary_appraiser_role', capabilities);
  }

  if (capabilities.hasReviewerResponsibility && capabilities.reviewWorkWaiting) {
    return shellProfile(
      SHELL_PROFILE_IDS.REVIEW_QUEUE,
      'Review Queue',
      'review_work_waiting',
      capabilities,
    );
  }

  if (capabilities.hasAppraiserResponsibility) {
    return shellProfile(SHELL_PROFILE_IDS.MY_WORK, 'My Work', 'appraiser_work', capabilities);
  }

  if (capabilities.hasReviewerResponsibility) {
    return shellProfile(
      SHELL_PROFILE_IDS.REVIEW_QUEUE,
      'Review Queue',
      'reviewer_responsibility',
      capabilities,
    );
  }

  return shellProfile(
    SHELL_PROFILE_IDS.UNAVAILABLE,
    'Access unavailable',
    'no_matching_shell_profile',
    capabilities,
  );
}

export default resolveShellProfile;
