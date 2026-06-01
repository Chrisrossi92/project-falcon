export const VENDOR_COVERAGE_STATES = Object.freeze([
  { code: "OH", label: "Ohio" },
  { code: "MI", label: "Michigan" },
  { code: "IN", label: "Indiana" },
]);

const COVERAGE_STATE_LOOKUP = new Map(
  VENDOR_COVERAGE_STATES.map((state) => [state.code, state]),
);

function normalizeStateCode(stateCode) {
  return String(stateCode || "").trim().toUpperCase();
}

export function getCoverageStateLabel(stateCode) {
  const normalized = normalizeStateCode(stateCode);
  return COVERAGE_STATE_LOOKUP.get(normalized)?.label || String(stateCode || "").trim();
}

export function isSupportedCoverageState(stateCode) {
  return COVERAGE_STATE_LOOKUP.has(normalizeStateCode(stateCode));
}
