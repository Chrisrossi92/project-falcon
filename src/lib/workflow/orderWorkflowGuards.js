import { getOrderWorkflowTransition } from "@/lib/workflow/orderWorkflow";

function normalizeWorkflowStatus(status) {
  return String(status || "").toLowerCase().trim();
}

function normalizePermissionResult(value) {
  if (typeof value === "function") return Boolean(value());
  return Boolean(value);
}

export function validateOrderWorkflowTransition({
  currentStatus,
  transitionKey,
  permissions = {},
  allowDuringPermissionFallback = false,
} = {}) {
  const transition = getOrderWorkflowTransition(transitionKey);
  const normalizedStatus = normalizeWorkflowStatus(currentStatus);

  if (!transition) {
    return {
      allowed: false,
      reason: `Unknown workflow transition: ${transitionKey || "(missing)"}`,
      code: "unknown_transition",
      transition: null,
    };
  }

  if (!transition.from.includes(normalizedStatus)) {
    return {
      allowed: false,
      reason: `Transition ${transition.key} is not allowed from status ${normalizedStatus || "(missing)"}.`,
      code: "invalid_status",
      transition,
    };
  }

  if (permissions.loading || permissions.error) {
    return {
      allowed: Boolean(allowDuringPermissionFallback),
      reason: allowDuringPermissionFallback
        ? null
        : "Workflow permissions are not available yet.",
      code: allowDuringPermissionFallback ? null : "permissions_unavailable",
      transition,
    };
  }

  const requiredPermission =
    normalizedStatus === "needs_revisions" && transition.resubmissionPermission
      ? transition.resubmissionPermission
      : transition.requiredPermission;

  if (requiredPermission) {
    const hasPermission = normalizePermissionResult(
      permissions[requiredPermission] ?? permissions.hasPermission?.(requiredPermission)
    );

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Missing required permission: ${requiredPermission}`,
        code: "missing_permission",
        requiredPermission,
        transition,
      };
    }
  }

  return {
    allowed: true,
    reason: null,
    code: null,
    requiredPermission,
    transition,
  };
}

export function assertOrderWorkflowTransition(input = {}) {
  const result = validateOrderWorkflowTransition(input);
  if (!result.allowed) {
    const error = new Error(result.reason || "Workflow transition is not allowed.");
    error.code = result.code;
    error.transition = result.transition;
    error.requiredPermission = result.requiredPermission;
    throw error;
  }
  return result;
}

export function getOrderWorkflowTransitionTarget(transitionKey) {
  return getOrderWorkflowTransition(transitionKey)?.to || null;
}
