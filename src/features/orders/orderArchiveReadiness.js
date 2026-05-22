import { PERMISSIONS } from "@/lib/permissions/constants";

const TERMINAL_CANCEL_VOID_STATUSES = new Set(["cancelled", "voided"]);

function hasPermissionKey(permissions, permissionKey) {
  if (!permissions) return false;

  if (typeof permissions.hasPermission === "function") {
    return permissions.hasPermission(permissionKey);
  }

  if (permissions.permissionSet instanceof Set) {
    return permissions.permissionSet.has(permissionKey);
  }

  if (permissions instanceof Set) {
    return permissions.has(permissionKey);
  }

  const keys = Array.isArray(permissions)
    ? permissions
    : permissions.permissionKeys || permissions.permissions;

  return Array.isArray(keys) && keys.includes(permissionKey);
}

export function canArchiveOrder(order, permissions) {
  if (!order) return false;
  if (permissions?.loading || permissions?.error) return false;
  if (order.is_archived === true) return false;
  if (TERMINAL_CANCEL_VOID_STATUSES.has(String(order.status || "").toLowerCase())) return false;

  return hasPermissionKey(permissions, PERMISSIONS.ORDERS_ARCHIVE);
}

export function canCancelOrder(order, permissions) {
  if (!order) return false;
  if (permissions?.loading || permissions?.error) return false;
  if (order.is_archived === true) return false;
  if (TERMINAL_CANCEL_VOID_STATUSES.has(String(order.status || "").toLowerCase())) return false;

  return hasPermissionKey(permissions, PERMISSIONS.ORDERS_CANCEL);
}

export function canVoidOrder(order, permissions) {
  if (!order) return false;
  if (permissions?.loading || permissions?.error) return false;
  if (order.is_archived === true) return false;
  if (TERMINAL_CANCEL_VOID_STATUSES.has(String(order.status || "").toLowerCase())) return false;

  return hasPermissionKey(permissions, PERMISSIONS.ORDERS_VOID);
}

export default canArchiveOrder;
