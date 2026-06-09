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
        productTypes: ["commercial_appraisal", "residential_appraisal"],
      }),
    ).toEqual([
      {
        state: "OH",
        county: null,
        zip: null,
        market: null,
        radius_miles: null,
        product_type: "commercial_appraisal",
      },
      {
        state: "OH",
        county: null,
        zip: null,
        market: null,
        radius_miles: null,
        product_type: "residential_appraisal",
      },
    ]);
  });

  it("generates county and product combinations", () => {
    expect(
      generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.SELECTED_COUNTIES,
        counties: ["Franklin", "Delaware"],
        productTypes: ["commercial_appraisal", "review"],
      }),
    ).toEqual([
      expect.objectContaining({ state: "OH", county: "Franklin", product_type: "commercial_appraisal" }),
      expect.objectContaining({ state: "OH", county: "Franklin", product_type: "review" }),
      expect.objectContaining({ state: "OH", county: "Delaware", product_type: "commercial_appraisal" }),
      expect.objectContaining({ state: "OH", county: "Delaware", product_type: "review" }),
    ]);
  });

  it("generates ZIP and market radius rows", () => {
    expect(
      generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.SELECTED_ZIPS,
        zips: "43215, 43212",
        productTypes: ["residential_appraisal"],
      }),
    ).toEqual([
      expect.objectContaining({ zip: "43215", product_type: "residential_appraisal" }),
      expect.objectContaining({ zip: "43212", product_type: "residential_appraisal" }),
    ]);

    expect(
      generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.MARKET_RADIUS,
        market: "Columbus",
        radius_miles: "25",
        productTypes: ["commercial_appraisal"],
      }),
    ).toEqual([
      {
        state: "OH",
        county: null,
        zip: null,
        market: "Columbus",
        radius_miles: 25,
        product_type: "commercial_appraisal",
      },
    ]);
  });

  it("validates incomplete blocks and formats preview labels", () => {
    expect(validateCoverageBlock({ state: "KY", productTypes: ["commercial_appraisal"] })).toEqual(
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
        productTypes: ["residential_appraisal"],
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
        product_type: "commercial_appraisal",
      }),
    ).toBe("OH · Franklin County · Commercial Appraisal");
  });

  it("summarizes generated rows by geography and product count", () => {
    expect(
      summarizeCoverageRows(
        generateCoverageRows({
        state: "OH",
        mode: VENDOR_COVERAGE_MODES.ENTIRE_STATE,
        productTypes: ["commercial_appraisal", "residential_appraisal", "review"],
      }),
      ),
    ).toBe("OH · Statewide · 3 products");

    expect(
      summarizeCoverageRows(
        generateCoverageRows({
        state: "MI",
        mode: VENDOR_COVERAGE_MODES.SELECTED_COUNTIES,
        counties: ["Wayne", "Oakland"],
        productTypes: ["commercial_appraisal", "review"],
      }),
      ),
    ).toBe("MI · 2 counties · 2 products");
  });
});
