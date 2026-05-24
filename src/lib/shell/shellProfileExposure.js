import { SHELL_PROFILE_AUTHORITY, resolveShellProfile } from './resolveShellProfile.js';
import { getShellProfileMetadata } from './shellProfiles.js';

const normalizeArray = (items) => (Array.isArray(items) ? items : []);

const normalizeToken = (value) => String(value || '').trim();

const roleLabelsFromContext = (appContext = {}) => {
  const labels = [
    appContext.primary_role_key,
    ...normalizeArray(appContext.role_keys),
    ...normalizeArray(appContext.role_assignments).flatMap((role) => [
      role.role_key,
      role.role_name,
      role.display_name,
    ]),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  return Object.freeze([...new Set(labels)]);
};

const explicitTrue = (value) => (value === true ? true : undefined);

export function buildShellProfileInput({ appContext, permissions, session, userId, authenticated } = {}) {
  const permissionKeys = normalizeArray(permissions?.permissionKeys ?? permissions?.permissions)
    .map(normalizeToken)
    .filter(Boolean);
  const hasAppContext = Boolean(appContext);
  const hasMembershipSignal = Object.prototype.hasOwnProperty.call(
    appContext || {},
    'has_current_company_membership',
  );
  const resolvedUserId = userId ?? session?.user?.id ?? session?.userId ?? appContext?.user_id ?? null;

  return Object.freeze({
    authenticated: authenticated ?? Boolean(resolvedUserId),
    userId: resolvedUserId,
    currentCompanyId: appContext?.current_company_id ?? null,
    membershipActive: hasAppContext && hasMembershipSignal
      ? Boolean(appContext?.has_current_company_membership)
      : undefined,
    permissionKeys: Object.freeze([...new Set(permissionKeys)]),
    roleLabels: roleLabelsFromContext(appContext),
    hasOwnerAdminAuthority: explicitTrue(Boolean(appContext?.is_owner || appContext?.is_admin_role)),
    hasAppraiserResponsibilities: explicitTrue(appContext?.is_appraiser_role),
    hasReviewerResponsibilities: explicitTrue(appContext?.is_reviewer_role),
  });
}

export function resolveShellProfileExposure(input) {
  const resolution = resolveShellProfile(input);
  const profile = getShellProfileMetadata(resolution.id);

  return Object.freeze({
    profileId: resolution.id,
    profile,
    resolutionReason: resolution.reason,
    resolution,
    capabilities: resolution.capabilities,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    isPresentationOnly: true,
  });
}

export function getShellProfileExposure(context = {}) {
  return resolveShellProfileExposure(buildShellProfileInput(context));
}
