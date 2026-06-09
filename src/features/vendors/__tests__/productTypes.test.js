import { describe, expect, it } from "vitest";

import {
  getVendorProductTypeLabel,
  normalizeVendorProductType,
  VENDOR_PRODUCT_TYPES,
} from "../coverage/productTypes";

describe("vendor product type taxonomy", () => {
  it("exports the approved stable slugs and labels", () => {
    expect(VENDOR_PRODUCT_TYPES).toEqual([
      { slug: "appraisal", label: "Appraisal" },
      { slug: "commercial_appraisal", label: "Commercial Appraisal" },
      { slug: "residential_appraisal", label: "Residential Appraisal" },
      { slug: "restricted_appraisal", label: "Restricted Appraisal" },
      { slug: "construction_draw", label: "Construction Draw" },
      { slug: "short_term_rental", label: "Short-Term Rental" },
      { slug: "review", label: "Review" },
    ]);
  });

  it("normalizes labels and slug-like values to stable slugs", () => {
    expect(normalizeVendorProductType("Commercial")).toBe("commercial_appraisal");
    expect(normalizeVendorProductType("Commercial Appraisal")).toBe("commercial_appraisal");
    expect(normalizeVendorProductType("Residential")).toBe("residential_appraisal");
    expect(normalizeVendorProductType("Industrial")).toBe("commercial_appraisal");
    expect(normalizeVendorProductType("restricted appraisal")).toBe("restricted_appraisal");
    expect(normalizeVendorProductType("Short-Term Rental")).toBe("short_term_rental");
    expect(normalizeVendorProductType("unknown legacy")).toBe("");
  });

  it("renders friendly labels and falls back for unknown legacy values", () => {
    expect(getVendorProductTypeLabel("multifamily")).toBe("Commercial Appraisal");
    expect(getVendorProductTypeLabel("residential")).toBe("Residential Appraisal");
    expect(getVendorProductTypeLabel("construction draw")).toBe("Construction Draw");
    expect(getVendorProductTypeLabel("legacy custom")).toBe("legacy custom");
  });
});
