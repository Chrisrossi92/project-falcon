import { PERMISSIONS } from "@/lib/permissions/constants";

export const CLIENT_PORTAL_MEMBER_PERMISSIONS = Object.freeze([
  PERMISSIONS.CLIENT_PORTAL_DASHBOARD_VIEW,
  PERMISSIONS.CLIENT_PORTAL_ORDERS_READ,
  PERMISSIONS.CLIENT_PORTAL_ORDERS_CREATE,
  PERMISSIONS.CLIENT_PORTAL_REPORTS_READ,
]);

export const VENDOR_PORTAL_MEMBER_PERMISSIONS = Object.freeze([
  PERMISSIONS.VENDOR_WORKSPACE_VIEW,
  PERMISSIONS.VENDOR_BIDS_READ,
  PERMISSIONS.VENDOR_BIDS_RESPOND,
  PERMISSIONS.VENDOR_ASSIGNMENTS_READ,
  PERMISSIONS.VENDOR_ASSIGNMENTS_RESPOND,
  PERMISSIONS.VENDOR_ASSIGNMENTS_PROGRESS,
  PERMISSIONS.VENDOR_DOCUMENTS_READ,
  PERMISSIONS.VENDOR_DOCUMENTS_UPLOAD,
  PERMISSIONS.VENDOR_PROFILE_READ,
  PERMISSIONS.VENDOR_PROFILE_UPDATE,
  PERMISSIONS.VENDOR_PAYMENTS_READ,
  PERMISSIONS.VENDOR_INVOICES_SUBMIT,
]);

function normalizePermissionKeys(permissionKeys) {
  if (!permissionKeys) return [];
  if (permissionKeys instanceof Set) return normalizePermissionKeys([...permissionKeys]);
  if (!Array.isArray(permissionKeys)) return [];

  return [...new Set(permissionKeys.map((key) => String(key || "").trim()).filter(Boolean))];
}

export function hasClientPortalMemberAccess(permissionKeys) {
  const permissionSet = new Set(normalizePermissionKeys(permissionKeys));
  return CLIENT_PORTAL_MEMBER_PERMISSIONS.some((permissionKey) => permissionSet.has(permissionKey));
}

export function isClientOnlyPortalAccess(permissionKeys) {
  const normalizedKeys = normalizePermissionKeys(permissionKeys);
  if (!hasClientPortalMemberAccess(normalizedKeys)) return false;

  const clientPortalMemberPermissionSet = new Set(CLIENT_PORTAL_MEMBER_PERMISSIONS);
  return normalizedKeys.every((permissionKey) => clientPortalMemberPermissionSet.has(permissionKey));
}

export function hasVendorPortalMemberAccess(permissionKeys) {
  const permissionSet = new Set(normalizePermissionKeys(permissionKeys));
  return VENDOR_PORTAL_MEMBER_PERMISSIONS.some((permissionKey) => permissionSet.has(permissionKey));
}

export function isVendorOnlyPortalAccess(permissionKeys) {
  const normalizedKeys = normalizePermissionKeys(permissionKeys);
  if (!normalizedKeys.includes(PERMISSIONS.VENDOR_WORKSPACE_VIEW)) return false;

  const vendorPortalMemberPermissionSet = new Set(VENDOR_PORTAL_MEMBER_PERMISSIONS);
  return normalizedKeys.every((permissionKey) => vendorPortalMemberPermissionSet.has(permissionKey));
}
