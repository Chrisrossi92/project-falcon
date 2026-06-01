import { getCountiesForState } from "./counties";
import { getVendorProductTypeLabel, normalizeVendorProductType } from "./productTypes";
import { isSupportedCoverageState } from "./states";

export const VENDOR_COVERAGE_MODES = Object.freeze({
  ENTIRE_STATE: "entire_state",
  SELECTED_COUNTIES: "selected_counties",
  SELECTED_ZIPS: "selected_zips",
  MARKET_RADIUS: "market_radius",
});

export const VENDOR_COVERAGE_MODE_OPTIONS = Object.freeze([
  { value: VENDOR_COVERAGE_MODES.ENTIRE_STATE, label: "Entire state" },
  { value: VENDOR_COVERAGE_MODES.SELECTED_COUNTIES, label: "Selected counties" },
  { value: VENDOR_COVERAGE_MODES.SELECTED_ZIPS, label: "Selected ZIPs" },
  { value: VENDOR_COVERAGE_MODES.MARKET_RADIUS, label: "Market / radius" },
]);

const ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeStateCode(value) {
  return normalizeText(value).toUpperCase();
}

function normalizeRadiusMiles(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseZipTokens(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeText).filter(Boolean))];
  }

  return [
    ...new Set(
      String(value || "")
        .split(/[\s,;]+/)
        .map(normalizeText)
        .filter(Boolean),
    ),
  ];
}

export function normalizeCoverageBlock(input = {}) {
  const state = normalizeStateCode(input.state);
  const mode = input.mode || VENDOR_COVERAGE_MODES.ENTIRE_STATE;
  const allowedCounties = new Set(getCountiesForState(state));
  const counties = [
    ...new Set(
      (input.counties || [])
        .map(normalizeText)
        .filter((county) => county && allowedCounties.has(county)),
    ),
  ];
  const zips = parseZipTokens(input.zips);
  const productTypes = [
    ...new Set(
      (input.productTypes || [])
        .map(normalizeVendorProductType)
        .filter(Boolean),
    ),
  ];

  return {
    state,
    mode,
    counties,
    zips,
    market: normalizeText(input.market),
    radius_miles: normalizeRadiusMiles(input.radius_miles),
    productTypes,
  };
}

export function validateCoverageBlock(input = {}) {
  const block = normalizeCoverageBlock(input);
  const errors = [];

  if (!block.state || !isSupportedCoverageState(block.state)) {
    errors.push("Choose a supported state.");
  }

  if (!block.productTypes.length) {
    errors.push("Choose at least one product type.");
  }

  if (block.mode === VENDOR_COVERAGE_MODES.SELECTED_COUNTIES && !block.counties.length) {
    errors.push("Choose at least one county.");
  }

  if (block.mode === VENDOR_COVERAGE_MODES.SELECTED_ZIPS) {
    if (!block.zips.length) {
      errors.push("Enter at least one ZIP code.");
    } else if (block.zips.some((zip) => !ZIP_PATTERN.test(zip))) {
      errors.push("Use five-digit ZIPs or ZIP+4 values.");
    }
  }

  if (
    block.mode === VENDOR_COVERAGE_MODES.MARKET_RADIUS
    && !block.market
    && block.radius_miles === null
  ) {
    errors.push("Enter a market or radius.");
  }

  return {
    valid: errors.length === 0,
    errors,
    block,
  };
}

function baseRow(block, productType) {
  return {
    state: block.state,
    county: null,
    zip: null,
    market: null,
    radius_miles: null,
    product_type: productType,
  };
}

export function generateCoverageRows(input = {}) {
  const { valid, block } = validateCoverageBlock(input);
  if (!valid) return [];

  if (block.mode === VENDOR_COVERAGE_MODES.SELECTED_COUNTIES) {
    return block.counties.flatMap((county) =>
      block.productTypes.map((productType) => ({
        ...baseRow(block, productType),
        county,
      })),
    );
  }

  if (block.mode === VENDOR_COVERAGE_MODES.SELECTED_ZIPS) {
    return block.zips.flatMap((zip) =>
      block.productTypes.map((productType) => ({
        ...baseRow(block, productType),
        zip,
      })),
    );
  }

  if (block.mode === VENDOR_COVERAGE_MODES.MARKET_RADIUS) {
    return block.productTypes.map((productType) => ({
      ...baseRow(block, productType),
      market: block.market || null,
      radius_miles: block.radius_miles,
    }));
  }

  return block.productTypes.map((productType) => baseRow(block, productType));
}

export function formatCoverageRowPreview(row = {}) {
  const state = normalizeStateCode(row.state);
  const geography = [];

  if (row.county) {
    geography.push(`${row.county} County`);
  } else if (row.zip) {
    geography.push(`ZIP ${row.zip}`);
  } else if (row.market || row.radius_miles !== null && row.radius_miles !== undefined) {
    if (row.market) geography.push(row.market);
    if (row.radius_miles !== null && row.radius_miles !== undefined) {
      geography.push(`${row.radius_miles} mi`);
    }
  } else {
    geography.push("Statewide");
  }

  const productLabel = getVendorProductTypeLabel(row.product_type);
  return [state, ...geography, productLabel].filter(Boolean).join(" · ");
}

export function summarizeCoverageRows(rows = []) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!safeRows.length) return "No coverage";

  const firstRow = safeRows[0] || {};
  const state = normalizeStateCode(firstRow.state);
  const products = new Set(safeRows.map((row) => normalizeVendorProductType(row.product_type)).filter(Boolean));
  const counties = new Set(safeRows.map((row) => normalizeText(row.county)).filter(Boolean));
  const zips = new Set(safeRows.map((row) => normalizeText(row.zip)).filter(Boolean));
  const markets = new Set(safeRows.map((row) => normalizeText(row.market)).filter(Boolean));
  const radii = new Set(
    safeRows
      .map((row) => row.radius_miles)
      .filter((radius) => radius !== null && radius !== undefined && radius !== ""),
  );

  let geography = "Statewide";
  if (counties.size) {
    geography = `${counties.size} ${counties.size === 1 ? "county" : "counties"}`;
  } else if (zips.size) {
    geography = `${zips.size} ${zips.size === 1 ? "ZIP" : "ZIPs"}`;
  } else if (markets.size || radii.size) {
    const marketLabel = markets.size === 1 ? [...markets][0] : `${markets.size} markets`;
    const radiusLabel = radii.size === 1 ? `${[...radii][0]} mi` : radii.size ? `${radii.size} radii` : "";
    geography = [markets.size ? marketLabel : null, radiusLabel].filter(Boolean).join(" · ");
  }

  const productCount = products.size || safeRows.length;
  const productLabel = `${productCount} ${productCount === 1 ? "product" : "products"}`;
  return [state, geography, productLabel].filter(Boolean).join(" · ");
}
