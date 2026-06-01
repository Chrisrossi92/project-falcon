export const VENDOR_PRODUCT_TYPES = Object.freeze([
  { slug: "appraisal", label: "Appraisal" },
  { slug: "restricted_appraisal", label: "Restricted Appraisal" },
  { slug: "construction_draw", label: "Construction Draw" },
  { slug: "short_term_rental", label: "Short-Term Rental" },
  { slug: "residential", label: "Residential" },
  { slug: "commercial", label: "Commercial" },
  { slug: "industrial", label: "Industrial" },
  { slug: "multifamily", label: "Multifamily" },
  { slug: "land", label: "Land" },
  { slug: "review", label: "Review" },
]);

const PRODUCT_TYPE_LOOKUP = new Map(
  VENDOR_PRODUCT_TYPES.flatMap((productType) => [
    [productType.slug, productType],
    [productType.label.toLowerCase(), productType],
  ]),
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
