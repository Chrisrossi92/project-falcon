import { describe, expect, it } from "vitest";

import {
  AVAILABLE_OPERATIONS_MODES,
  DEFAULT_OPERATIONS_MODE,
  getOperationsModeLabel,
  isValidOperationsMode,
  normalizeOperationsMode,
  OPERATIONS_MODES,
} from "../operationsMode.js";

describe("operationsMode", () => {
  it("defaults to internal operations", () => {
    expect(DEFAULT_OPERATIONS_MODE).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(AVAILABLE_OPERATIONS_MODES).toEqual([
      OPERATIONS_MODES.INTERNAL_OPERATIONS,
      OPERATIONS_MODES.AMC_OPERATIONS,
    ]);
    expect(Object.isFrozen(AVAILABLE_OPERATIONS_MODES)).toBe(true);
  });

  it("identifies valid operations modes", () => {
    expect(isValidOperationsMode(OPERATIONS_MODES.INTERNAL_OPERATIONS)).toBe(true);
    expect(isValidOperationsMode(OPERATIONS_MODES.AMC_OPERATIONS)).toBe(true);
    expect(isValidOperationsMode("vendor_portal")).toBe(false);
    expect(isValidOperationsMode(null)).toBe(false);
  });

  it("normalizes invalid modes to internal operations", () => {
    expect(normalizeOperationsMode(OPERATIONS_MODES.AMC_OPERATIONS)).toBe(OPERATIONS_MODES.AMC_OPERATIONS);
    expect(normalizeOperationsMode("bad-mode")).toBe(DEFAULT_OPERATIONS_MODE);
    expect(normalizeOperationsMode(undefined)).toBe(DEFAULT_OPERATIONS_MODE);
  });

  it("returns labels for normalized modes", () => {
    expect(getOperationsModeLabel(OPERATIONS_MODES.INTERNAL_OPERATIONS)).toBe("Internal Operations");
    expect(getOperationsModeLabel(OPERATIONS_MODES.AMC_OPERATIONS)).toBe("AMC Operations");
    expect(getOperationsModeLabel("bad-mode")).toBe("Internal Operations");
  });
});
