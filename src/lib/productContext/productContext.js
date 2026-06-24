import {
  OPERATIONS_MODES,
  normalizeOperationsMode,
} from "@/lib/operations/operationsMode";

export const PRODUCT_CONTEXTS = Object.freeze({
  INTERNAL: "internal",
  AMC: "amc",
  VENDOR: "vendor",
  CLIENT: "client",
  SHARED_LEGACY: "shared_legacy",
});

export const PRODUCT_CONTEXT_LABELS = Object.freeze({
  [PRODUCT_CONTEXTS.INTERNAL]: "Internal Operations",
  [PRODUCT_CONTEXTS.AMC]: "Falcon AMC",
  [PRODUCT_CONTEXTS.VENDOR]: "Vendor Workspace",
  [PRODUCT_CONTEXTS.CLIENT]: "Client Portal",
  [PRODUCT_CONTEXTS.SHARED_LEGACY]: "Shared / Legacy",
});

const VALID_PRODUCT_CONTEXTS = new Set(Object.values(PRODUCT_CONTEXTS));

const AMC_EXPLICIT_PREFIXES = Object.freeze([
  "/amc",
  "/vendors",
  "/client-requests",
]);

const VENDOR_PREFIXES = Object.freeze([
  "/vendor-workspace",
  "/vendor",
]);

const CLIENT_PREFIXES = Object.freeze([
  "/client-portal",
]);

const INTERNAL_EXPLICIT_PREFIXES = Object.freeze([
  "/my-work",
  "/users",
]);

const SHARED_LEGACY_PREFIXES = Object.freeze([
  "/",
  "/dashboard",
  "/orders",
  "/calendar",
  "/activity",
  "/clients",
  "/settings",
  "/assignments",
  "/relationships",
  "/accept-invite",
  "/login",
]);

function normalizePathname(pathname) {
  const raw = typeof pathname === "string" ? pathname.trim() : "";
  if (!raw) return "/";

  try {
    const url = new URL(raw, "https://falcon.local");
    return url.pathname || "/";
  } catch {
    const [withoutQuery] = raw.split(/[?#]/);
    const prefixed = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
    return prefixed || "/";
  }
}

function pathMatchesPrefix(pathname, prefix) {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function pathMatchesAny(pathname, prefixes) {
  return prefixes.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

export function normalizeProductContext(context) {
  return VALID_PRODUCT_CONTEXTS.has(context) ? context : PRODUCT_CONTEXTS.SHARED_LEGACY;
}

export function getProductContextLabel(context) {
  return PRODUCT_CONTEXT_LABELS[normalizeProductContext(context)];
}

export function getProductContextForOperationsMode(operationsMode) {
  const mode = normalizeOperationsMode(operationsMode);
  if (mode === OPERATIONS_MODES.AMC_OPERATIONS) return PRODUCT_CONTEXTS.AMC;
  return PRODUCT_CONTEXTS.INTERNAL;
}

export function inferProductContextFromPathname(pathname, options = {}) {
  const path = normalizePathname(pathname);
  const hasOperationsMode = options.operationsMode !== undefined && options.operationsMode !== null;

  if (pathMatchesAny(path, VENDOR_PREFIXES)) return PRODUCT_CONTEXTS.VENDOR;
  if (pathMatchesAny(path, CLIENT_PREFIXES)) return PRODUCT_CONTEXTS.CLIENT;
  if (pathMatchesAny(path, AMC_EXPLICIT_PREFIXES)) return PRODUCT_CONTEXTS.AMC;
  if (pathMatchesAny(path, INTERNAL_EXPLICIT_PREFIXES)) return PRODUCT_CONTEXTS.INTERNAL;

  if (hasOperationsMode && pathMatchesAny(path, SHARED_LEGACY_PREFIXES)) {
    return getProductContextForOperationsMode(options.operationsMode);
  }

  return PRODUCT_CONTEXTS.SHARED_LEGACY;
}

function describeRouteFamily(pathname) {
  if (pathMatchesAny(pathname, VENDOR_PREFIXES)) return "vendor";
  if (pathMatchesAny(pathname, CLIENT_PREFIXES)) return "client";
  if (pathMatchesAny(pathname, AMC_EXPLICIT_PREFIXES)) return "amc_explicit";
  if (pathMatchesAny(pathname, INTERNAL_EXPLICIT_PREFIXES)) return "internal_explicit";
  if (pathMatchesAny(pathname, SHARED_LEGACY_PREFIXES)) return "shared_legacy";
  return "unknown";
}

export function getProductContextDiagnostics({
  pathname = "/",
  operationsMode = null,
  source = "route_pathname",
} = {}) {
  const normalizedPathname = normalizePathname(pathname);
  const operationsModeProvided = operationsMode !== null && operationsMode !== undefined;
  const productContext = inferProductContextFromPathname(normalizedPathname, {
    operationsMode: operationsModeProvided ? operationsMode : undefined,
  });

  return Object.freeze({
    productContext,
    productContextLabel: getProductContextLabel(productContext),
    pathname: normalizedPathname,
    routeFamily: describeRouteFamily(normalizedPathname),
    source,
    operationsMode: operationsModeProvided ? normalizeOperationsMode(operationsMode) : null,
    operationsModeProvided,
    diagnosticOnly: true,
    affectsAuth: false,
    affectsRouting: false,
    affectsCompanyContext: false,
    affectsDataAccess: false,
    legalBoundary: false,
  });
}
