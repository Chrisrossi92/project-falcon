import { SHELL_PROFILE_IDS } from "@/lib/shell/resolveShellProfile";

export const V1_HIDDEN_ENTERPRISE_SURFACE_FALLBACK_PATH = "/orders";

export const V1_HIDDEN_ENTERPRISE_ROUTE_PREFIXES = Object.freeze([
  "/assignments",
  "/relationships",
  "/vendors",
]);

const AMC_OPERATIONS_VENDOR_ROUTE_PREFIXES = Object.freeze([
  "/vendors",
]);

const STAFF_APPRAISAL_OPERATIONAL_SHELLS = new Set([
  SHELL_PROFILE_IDS.OPERATIONS,
  SHELL_PROFILE_IDS.MY_WORK,
  SHELL_PROFILE_IDS.REVIEW_QUEUE,
]);

export function getShellProfileId(shellProfilePresentation = {}) {
  return (
    shellProfilePresentation?.profileId ??
    shellProfilePresentation?.id ??
    shellProfilePresentation?.resolution?.id ??
    shellProfilePresentation?.profile?.id ??
    null
  );
}

export function isStaffAppraisalHiddenEnterpriseSurfaceBlocked(shellProfilePresentation = {}) {
  return STAFF_APPRAISAL_OPERATIONAL_SHELLS.has(
    getShellProfileId(shellProfilePresentation),
  );
}

export function isAmcOperationsVendorSurfacePath(pathname = "") {
  return AMC_OPERATIONS_VENDOR_ROUTE_PREFIXES.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));
}
