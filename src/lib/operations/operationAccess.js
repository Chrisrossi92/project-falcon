import { OPERATIONS_MODES, isValidOperationsMode } from "./operationsMode.js";
import { PERMISSIONS } from "@/lib/permissions/constants";

const INTERNAL_ALIASES = new Set([
  "internal",
  "internal_operations",
  "internal-operations",
]);

const AMC_ALIASES = new Set([
  "amc",
  "amc_operations",
  "amc-operations",
]);

function normalizeModeAlias(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (INTERNAL_ALIASES.has(normalizedValue)) return OPERATIONS_MODES.INTERNAL_OPERATIONS;
  if (AMC_ALIASES.has(normalizedValue)) return OPERATIONS_MODES.AMC_OPERATIONS;
  if (isValidOperationsMode(normalizedValue)) return normalizedValue;

  return null;
}

function normalizeExplicitModes(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeModeAlias).filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => enabled === true)
      .map(([mode]) => normalizeModeAlias(mode))
      .filter(Boolean);
  }

  return [];
}

function explicitOperationsModesFromContext(appContext = {}) {
  const candidates = [
    appContext.available_operations_modes,
    appContext.availableOperationsModes,
    appContext.operations_modes,
    appContext.operationsModes,
    appContext.operation_access,
    appContext.operationAccess,
    appContext.operations_access,
    appContext.operationsAccess,
  ];

  for (const candidate of candidates) {
    const modes = normalizeExplicitModes(candidate);
    if (modes.length) return [...new Set(modes)];
  }

  return [];
}

export function resolveAvailableOperationsModes(permissions, shellProfile) {
  const appContext = shellProfile?.appContext || {};
  const explicitModes = explicitOperationsModesFromContext(appContext);

  if (explicitModes.length) return explicitModes;

  const isOwnerOrAdmin = Boolean(appContext.is_owner || appContext.is_admin_role);
  const canAccessAmcOperations =
    !permissions.loading &&
    !permissions.error &&
    isOwnerOrAdmin &&
    permissions.hasPermission(PERMISSIONS.VENDORS_READ);

  return canAccessAmcOperations
    ? [OPERATIONS_MODES.INTERNAL_OPERATIONS, OPERATIONS_MODES.AMC_OPERATIONS]
    : [OPERATIONS_MODES.INTERNAL_OPERATIONS];
}
