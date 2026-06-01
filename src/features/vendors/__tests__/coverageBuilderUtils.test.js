import { describe, expect, it } from "vitest";

import {
  formatCoverageRowPreview,
  generateCoverageRows,
  summarizeCoverageRows,
  validateCoverageBlock,
  VENDOR_COVERAGE_MODES,
} from "../coverage/coverageBuilderUtils";

describe("vendor coverage builder utilities", () => {
  it("generates one statewide row per product", () => {
    expect(
      generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.ENTIRE_STATE,
        productTypes: ["commercial", "multifamily"],
      }),
    ).toEqual([
      {
        state: "OH",
        county: null,
        zip: null,
        market: null,
        radius_miles: null,
        product_type: "commercial",
      },
      {
        state: "OH",
        county: null,
        zip: null,
        market: null,
        radius_miles: null,
        product_type: "multifamily",
      },
    ]);
  });

  it("generates county and product combinations", () => {
    expect(
      generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.SELECTED_COUNTIES,
        counties: ["Franklin", "Delaware"],
        productTypes: ["commercial", "land"],
      }),
    ).toEqual([
      expect.objectContaining({ state: "OH", county: "Franklin", product_type: "commercial" }),
      expect.objectContaining({ state: "OH", county: "Franklin", product_type: "land" }),
      expect.objectContaining({ state: "OH", county: "Delaware", product_type: "commercial" }),
      expect.objectContaining({ state: "OH", county: "Delaware", product_type: "land" }),
    ]);
  });

  it("generates ZIP and market radius rows", () => {
    expect(
      generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.SELECTED_ZIPS,
        zips: "43215, 43212",
        productTypes: ["residential"],
      }),
    ).toEqual([
      expect.objectContaining({ zip: "43215", product_type: "residential" }),
      expect.objectContaining({ zip: "43212", product_type: "residential" }),
    ]);

    expect(
      generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.MARKET_RADIUS,
        market: "Columbus",
        radius_miles: "25",
        productTypes: ["commercial"],
      }),
    ).toEqual([
      {
        state: "OH",
        county: null,
        zip: null,
        market: "Columbus",
        radius_miles: 25,
        product_type: "commercial",
      },
    ]);
  });

  it("validates incomplete blocks and formats preview labels", () => {
    expect(validateCoverageBlock({ state: "KY", productTypes: ["commercial"] })).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining(["Choose a supported state."]),
      }),
    );
    expect(
      validateCoverageBlock({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.SELECTED_ZIPS,
        zips: "abc",
        productTypes: ["residential"],
      }),
    ).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining(["Use five-digit ZIPs or ZIP+4 values."]),
      }),
    );
    expect(
      formatCoverageRowPreview({
        state: "OH",
        county: "Franklin",
        product_type: "multifamily",
      }),
    ).toBe("OH · Franklin County · Multifamily");
  });

  it("summarizes generated rows by geography and product count", () => {
    expect(
      summarizeCoverageRows(
        generateCoverageRows({
          state: "OH",
          mode: VENDOR_COVERAGE_MODES.ENTIRE_STATE,
          productTypes: ["commercial", "multifamily", "land"],
        }),
      ),
    ).toBe("OH · Statewide · 3 products");

    expect(
      summarizeCoverageRows(
        generateCoverageRows({
          state: "MI",
          mode: VENDOR_COVERAGE_MODES.SELECTED_COUNTIES,
          counties: ["Wayne", "Oakland"],
          productTypes: ["commercial", "review"],
        }),
      ),
    ).toBe("MI · 2 counties · 2 products");
  });
});
