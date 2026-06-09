import { OPERATIONS_MODES, normalizeOperationsMode } from "@/lib/operations/operationsMode";

const AMC_ORDER_NUMBER_PATTERN = /(^|[^a-z0-9])AMC[-_]/i;
const INTERNAL_ORDER_NUMBER_PATTERN = /(^|[^a-z0-9])(INT|INTERNAL)[-_]/i;
const ORDER_OR_ASSIGNMENT_PATTERN = /(order|assignment|bid|invoice|payment|vendor|procurement)/i;

export function getNotificationOperationsScope(notification) {
  const payload = notification?.payload && typeof notification.payload === "object" ? notification.payload : {};
  const explicitScope =
    notification?.operations_scope ||
    notification?.operation_scope ||
    notification?.workspace_scope ||
    payload.operations_scope ||
    payload.operation_scope ||
    payload.workspace_scope ||
    payload.order_operations_scope ||
    payload.order?.operations_scope;

  if (explicitScope) return normalizeOperationsMode(explicitScope);

  const orderNumber = String(
    notification?.order_number ||
      payload.order_number ||
      payload.order?.order_number ||
      "",
  );

  if (AMC_ORDER_NUMBER_PATTERN.test(orderNumber)) return OPERATIONS_MODES.AMC_OPERATIONS;
  if (INTERNAL_ORDER_NUMBER_PATTERN.test(orderNumber)) return OPERATIONS_MODES.INTERNAL_OPERATIONS;

  return null;
}

export function isNotificationVisibleInOperationsScope(notification, operationsScope) {
  const selectedScope = normalizeOperationsMode(operationsScope);
  const notificationScope = getNotificationOperationsScope(notification);

  if (notificationScope) return notificationScope === selectedScope;

  const hasOrderReference = Boolean(notification?.order_id || notification?.payload?.order_id);
  const workspaceSpecificText = [
    notification?.type,
    notification?.category,
    notification?.title,
    notification?.body,
    notification?.message,
    notification?.payload?.event_key,
    notification?.payload?.source_type,
  ].filter(Boolean).join(" ");

  if (hasOrderReference || ORDER_OR_ASSIGNMENT_PATTERN.test(workspaceSpecificText)) {
    return selectedScope === OPERATIONS_MODES.INTERNAL_OPERATIONS;
  }

  return true;
}

export function filterNotificationsForOperationsScope(notifications = [], operationsScope) {
  return (Array.isArray(notifications) ? notifications : []).filter((notification) =>
    isNotificationVisibleInOperationsScope(notification, operationsScope)
  );
}

export function notificationRpcScopeParams(operationsScope) {
  return {
    p_operations_scope: normalizeOperationsMode(operationsScope),
  };
}

export function notificationListRpcParams({ limit = 50, before = null, operationsScope = null } = {}) {
  return {
    p_limit: limit,
    p_before: before ?? null,
    ...notificationRpcScopeParams(operationsScope),
  };
}
