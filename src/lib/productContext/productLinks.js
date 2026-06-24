import {
  PRODUCT_CONTEXTS,
  normalizeProductContext,
} from "@/lib/productContext/productContext";
import {
  PRODUCT_ROUTE_IDS,
  getCanonicalPath,
} from "@/lib/productContext/productRoutes";

export const PRODUCT_LINK_TARGETS = Object.freeze({
  DASHBOARD: "dashboard",
  INTERNAL_ORDER_DETAIL: "internal_order_detail",
  AMC_ORDER_DETAIL: "amc_order_detail",
  AMC_VENDORS: "amc_vendors",
  AMC_VENDOR_DETAIL: "amc_vendor_detail",
  VENDOR_WORKSPACE: "vendor_workspace",
  CLIENT_PORTAL: "client_portal",
  PUBLIC_VENDOR_BID_INVITATION: "public_vendor_bid_invitation",
  PUBLIC_VENDOR_ASSIGNMENT_OFFER: "public_vendor_assignment_offer",
  PUBLIC_VENDOR_ASSIGNMENT_WORK: "public_vendor_assignment_work",
  ACCEPT_INVITE: "accept_invite",
});

const PRODUCT_BASE_URL_KEYS = Object.freeze({
  [PRODUCT_CONTEXTS.INTERNAL]: "internalAppBaseUrl",
  [PRODUCT_CONTEXTS.AMC]: "amcAppBaseUrl",
  [PRODUCT_CONTEXTS.VENDOR]: "vendorAppBaseUrl",
  [PRODUCT_CONTEXTS.CLIENT]: "clientPortalAppBaseUrl",
  [PRODUCT_CONTEXTS.SHARED_LEGACY]: "legacyAppBaseUrl",
});

const PRODUCT_LINK_ROUTE_IDS = Object.freeze({
  [PRODUCT_LINK_TARGETS.INTERNAL_ORDER_DETAIL]: PRODUCT_ROUTE_IDS.INTERNAL_ORDER_DETAIL,
  [PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL]: PRODUCT_ROUTE_IDS.AMC_ORDER_DETAIL,
  [PRODUCT_LINK_TARGETS.AMC_VENDORS]: PRODUCT_ROUTE_IDS.AMC_VENDORS,
  [PRODUCT_LINK_TARGETS.AMC_VENDOR_DETAIL]: PRODUCT_ROUTE_IDS.AMC_VENDOR_DETAIL,
  [PRODUCT_LINK_TARGETS.VENDOR_WORKSPACE]: PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_DASHBOARD,
  [PRODUCT_LINK_TARGETS.CLIENT_PORTAL]: PRODUCT_ROUTE_IDS.CLIENT_PORTAL_DASHBOARD,
  [PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_BID_INVITATION]: PRODUCT_ROUTE_IDS.VENDOR_BID_INVITATION,
  [PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_OFFER]: PRODUCT_ROUTE_IDS.VENDOR_ASSIGNMENT_OFFER,
  [PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_WORK]: PRODUCT_ROUTE_IDS.VENDOR_ASSIGNMENT_WORK,
  [PRODUCT_LINK_TARGETS.ACCEPT_INVITE]: PRODUCT_ROUTE_IDS.ACCEPT_INVITE,
});

const DASHBOARD_ROUTE_IDS_BY_CONTEXT = Object.freeze({
  [PRODUCT_CONTEXTS.INTERNAL]: PRODUCT_ROUTE_IDS.INTERNAL_DASHBOARD,
  [PRODUCT_CONTEXTS.AMC]: PRODUCT_ROUTE_IDS.AMC_DASHBOARD,
  [PRODUCT_CONTEXTS.VENDOR]: PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_DASHBOARD,
  [PRODUCT_CONTEXTS.CLIENT]: PRODUCT_ROUTE_IDS.CLIENT_PORTAL_DASHBOARD,
});

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function trimSlashes(value) {
  return cleanText(value).replace(/^\/+|\/+$/g, "");
}

function normalizeBaseUrl(value) {
  const base = cleanText(value);
  if (!base) return "";
  return base.replace(/\/+$/g, "");
}

function normalizePath(value) {
  const raw = cleanText(value);
  if (!raw) return "/";
  const [path, suffix = ""] = raw.split(/(?=[?#])/);
  const normalizedPath = `/${trimSlashes(path)}`;
  return `${normalizedPath === "/" ? "/" : normalizedPath}${suffix}`;
}

function appendQuery(path, query = null) {
  const entries = Object.entries(query || {})
    .filter(([, value]) => value !== undefined && value !== null && cleanText(String(value)) !== "");

  if (entries.length === 0) return path;

  const separator = path.includes("?") ? "&" : "?";
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => {
    params.set(key, String(value));
  });

  return `${path}${separator}${params.toString()}`;
}

function encodeSegment(value) {
  return encodeURIComponent(cleanText(String(value)));
}

function shouldUseCanonicalRoutes(options = {}) {
  return options.useCanonicalRoutes === true || options.routeMode === "canonical";
}

function routePathFromRegistry(routeId, fallbackPath, routeParams = {}, options = {}) {
  if (!shouldUseCanonicalRoutes(options) || !routeId) return fallbackPath;

  const canonicalPath = getCanonicalPath(routeId);
  if (!canonicalPath) return fallbackPath;

  return Object.entries(routeParams || {}).reduce(
    (path, [key, value]) => path.replaceAll(`:${key}`, encodeSegment(value)),
    canonicalPath,
  );
}

export function getProductBaseUrl(productContext, config = {}) {
  const context = normalizeProductContext(productContext);
  const productBaseUrl = normalizeBaseUrl(config[PRODUCT_BASE_URL_KEYS[context]]);
  if (productBaseUrl) return productBaseUrl;
  return normalizeBaseUrl(config.legacyAppBaseUrl);
}

export function buildProductPath(path, query = null) {
  return appendQuery(normalizePath(path), query);
}

export function buildProductLink({
  productContext = PRODUCT_CONTEXTS.SHARED_LEGACY,
  path = "/",
  query = null,
  config = {},
  routeId = null,
  routeParams = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  const resolvedPath = routePathFromRegistry(routeId, path, routeParams, {
    useCanonicalRoutes,
    routeMode,
  });
  const normalizedPath = buildProductPath(resolvedPath, query);
  const baseUrl = getProductBaseUrl(productContext, config);
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function buildDashboardLink({
  productContext = PRODUCT_CONTEXTS.SHARED_LEGACY,
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  const context = normalizeProductContext(productContext);
  return buildProductLink({
    productContext: context,
    path: "/dashboard",
    config,
    routeId: DASHBOARD_ROUTE_IDS_BY_CONTEXT[context] || null,
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildInternalOrderDetailLink(orderId, {
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.INTERNAL,
    path: `/orders/${encodeSegment(orderId)}`,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.INTERNAL_ORDER_DETAIL],
    routeParams: { id: orderId },
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildAmcOrderDetailLink(orderId, {
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.AMC,
    path: `/orders/${encodeSegment(orderId)}`,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL],
    routeParams: { id: orderId },
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildAmcVendorsLink({
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.AMC,
    path: "/vendors",
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.AMC_VENDORS],
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildAmcVendorDetailLink(vendorProfileId, {
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.AMC,
    path: `/vendors/${encodeSegment(vendorProfileId)}`,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.AMC_VENDOR_DETAIL],
    routeParams: { vendorProfileId },
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildVendorWorkspaceLink({
  path = "/vendor-workspace/dashboard",
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.VENDOR_WORKSPACE],
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildClientPortalLink({
  path = "/client-portal",
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.CLIENT,
    path,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.CLIENT_PORTAL],
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildPublicVendorBidInvitationLink(token, {
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path: `/vendor/bid-invitations/${encodeSegment(token)}`,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_BID_INVITATION],
    routeParams: { token },
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildPublicVendorAssignmentOfferLink(token, {
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path: `/vendor/assignment-offers/${encodeSegment(token)}`,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_OFFER],
    routeParams: { token },
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildPublicVendorAssignmentWorkLink(token, {
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path: `/vendor/assignment-work/${encodeSegment(token)}`,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_WORK],
    routeParams: { token },
    useCanonicalRoutes,
    routeMode,
  });
}

export function buildAcceptInviteLink(invitationId, {
  config = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.SHARED_LEGACY,
    path: `/accept-invite/${encodeSegment(invitationId)}`,
    config,
    routeId: PRODUCT_LINK_ROUTE_IDS[PRODUCT_LINK_TARGETS.ACCEPT_INVITE],
    routeParams: { invitationId },
    useCanonicalRoutes,
    routeMode,
  });
}

export function describeProductLink({
  target,
  productContext = PRODUCT_CONTEXTS.SHARED_LEGACY,
  path = "/",
  query = null,
  config = {},
  routeId = null,
  routeParams = {},
  useCanonicalRoutes = false,
  routeMode = "compatibility",
} = {}) {
  const context = normalizeProductContext(productContext);
  const resolvedPath = routePathFromRegistry(routeId, path, routeParams, {
    useCanonicalRoutes,
    routeMode,
  });
  const normalizedPath = buildProductPath(resolvedPath, query);
  const baseUrl = getProductBaseUrl(context, config);

  return Object.freeze({
    target: target || null,
    productContext: context,
    routeId: routeId || null,
    routeMode: shouldUseCanonicalRoutes({ useCanonicalRoutes, routeMode })
      ? "canonical"
      : "compatibility",
    path: normalizedPath,
    baseUrl: baseUrl || null,
    url: baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath,
    legacyFallbackUsed:
      Boolean(baseUrl) &&
      context !== PRODUCT_CONTEXTS.SHARED_LEGACY &&
      baseUrl === normalizeBaseUrl(config.legacyAppBaseUrl),
    relativeFallbackUsed: !baseUrl,
    diagnosticOnly: true,
    affectsDelivery: false,
    affectsRouting: false,
    affectsAuth: false,
  });
}
