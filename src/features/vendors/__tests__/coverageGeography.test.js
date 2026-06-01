import { describe, expect, it } from "vitest";

import {
  getCountiesForState,
  VENDOR_COVERAGE_COUNTIES_BY_STATE,
} from "../coverage/counties";
import {
  getCoverageStateLabel,
  isSupportedCoverageState,
  VENDOR_COVERAGE_STATES,
} from "../coverage/states";

function sortedCopy(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

describe("vendor coverage geography constants", () => {
  it("exports the supported MVP coverage states", () => {
    expect(VENDOR_COVERAGE_STATES).toEqual([
      { code: "OH", label: "Ohio" },
      { code: "MI", label: "Michigan" },
      { code: "IN", label: "Indiana" },
    ]);
  });

  it("renders state labels and detects supported states", () => {
    expect(getCoverageStateLabel("oh")).toBe("Ohio");
    expect(getCoverageStateLabel("MI")).toBe("Michigan");
    expect(getCoverageStateLabel("in")).toBe("Indiana");
    expect(getCoverageStateLabel("KY")).toBe("KY");
    expect(isSupportedCoverageState("oh")).toBe(true);
    expect(isSupportedCoverageState("KY")).toBe(false);
  });

  it("returns counties for each supported state and empty lists for unsupported states", () => {
    expect(getCountiesForState("OH")).toContain("Franklin");
    expect(getCountiesForState("MI")).toContain("Wayne");
    expect(getCountiesForState("IN")).toContain("Marion");
    expect(getCountiesForState("KY")).toEqual([]);
    expect(getCountiesForState("")).toEqual([]);
  });

  it("keeps county lists sorted and duplicate-free", () => {
    for (const [stateCode, counties] of Object.entries(VENDOR_COVERAGE_COUNTIES_BY_STATE)) {
      expect(counties).toEqual(sortedCopy(counties));
      expect(new Set(counties).size).toBe(counties.length);
      expect(counties.length).toBeGreaterThan(0);
      expect(isSupportedCoverageState(stateCode)).toBe(true);
    }
  });
});
