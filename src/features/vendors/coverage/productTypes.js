export const VENDOR_PRODUCT_TYPES = Object.freeze([
  { slug: "appraisal", label: "Appraisal" },
  { slug: "commercial_appraisal", label: "Commercial Appraisal" },
  { slug: "residential_appraisal", label: "Residential Appraisal" },
  { slug: "restricted_appraisal", label: "Restricted Appraisal" },
  { slug: "construction_draw", label: "Construction Draw" },
  { slug: "short_term_rental", label: "Short-Term Rental" },
  { slug: "review", label: "Review" },
]);

const PRODUCT_TYPE_LOOKUP = new Map(
  [
    ...VENDOR_PRODUCT_TYPES.flatMap((productType) => [
      [productType.slug, productType],
      [productType.label.toLowerCase(), productType],
    ]),
    ["commercial", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["residential", { slug: "residential_appraisal", label: "Residential Appraisal" }],
    ["industrial", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["multifamily", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["multi_family", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["land", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["office", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["retail", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["mixed_use", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["special_purpose", { slug: "commercial_appraisal", label: "Commercial Appraisal" }],
    ["single_family", { slug: "residential_appraisal", label: "Residential Appraisal" }],
    ["condo", { slug: "residential_appraisal", label: "Residential Appraisal" }],
  ],
);

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeVendorProductType(value) {
  const normalized = normalizeKey(value);
  return PRODUCT_TYPE_LOOKUP.get(normalized)?.slug || "";
}

export function getVendorProductTypeLabel(slug) {
  const normalized = normalizeVendorProductType(slug);
  if (normalized) return PRODUCT_TYPE_LOOKUP.get(normalized).label;
  return String(slug || "").trim();
}
