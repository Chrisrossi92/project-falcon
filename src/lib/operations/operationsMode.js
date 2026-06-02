export const OPERATIONS_MODES = Object.freeze({
  INTERNAL_OPERATIONS: "internal_operations",
  AMC_OPERATIONS: "amc_operations",
});

export const DEFAULT_OPERATIONS_MODE = OPERATIONS_MODES.INTERNAL_OPERATIONS;
export const AVAILABLE_OPERATIONS_MODES = Object.freeze(Object.values(OPERATIONS_MODES));

const OPERATIONS_MODE_LABELS = Object.freeze({
  [OPERATIONS_MODES.INTERNAL_OPERATIONS]: "Internal Operations",
  [OPERATIONS_MODES.AMC_OPERATIONS]: "AMC Operations",
});

const VALID_OPERATIONS_MODES = new Set(AVAILABLE_OPERATIONS_MODES);

export function isValidOperationsMode(mode) {
  return VALID_OPERATIONS_MODES.has(mode);
}

export function normalizeOperationsMode(mode) {
  return isValidOperationsMode(mode) ? mode : DEFAULT_OPERATIONS_MODE;
}

export function getOperationsModeLabel(mode) {
  return OPERATIONS_MODE_LABELS[normalizeOperationsMode(mode)];
}

export function getAvailableOperationsModes() {
  return AVAILABLE_OPERATIONS_MODES;
}

export function getOperationsScopeForMode(mode) {
  return normalizeOperationsMode(mode);
}
