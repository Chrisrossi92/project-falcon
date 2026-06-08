import { PERMISSIONS } from "@/lib/permissions/constants";

export const CLIENT_PORTAL_MEMBER_PERMISSIONS = Object.freeze([
  PERMISSIONS.CLIENT_PORTAL_DASHBOARD_VIEW,
  PERMISSIONS.CLIENT_PORTAL_ORDERS_READ,
  PERMISSIONS.CLIENT_PORTAL_ORDERS_CREATE,
  PERMISSIONS.CLIENT_PORTAL_REPORTS_READ,
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
