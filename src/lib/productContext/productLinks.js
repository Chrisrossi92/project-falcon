import {
  PRODUCT_CONTEXTS,
  normalizeProductContext,
} from "@/lib/productContext/productContext";

export const PRODUCT_LINK_TARGETS = Object.freeze({
  DASHBOARD: "dashboard",
  INTERNAL_ORDER_DETAIL: "internal_order_detail",
  AMC_ORDER_DETAIL: "amc_order_detail",
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
} = {}) {
  const normalizedPath = buildProductPath(path, query);
  const baseUrl = getProductBaseUrl(productContext, config);
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function buildDashboardLink({ productContext = PRODUCT_CONTEXTS.SHARED_LEGACY, config = {} } = {}) {
  return buildProductLink({
    productContext,
    path: "/dashboard",
    config,
  });
}

export function buildInternalOrderDetailLink(orderId, { config = {} } = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.INTERNAL,
    path: `/orders/${encodeSegment(orderId)}`,
    config,
  });
}

export function buildAmcOrderDetailLink(orderId, { config = {} } = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.AMC,
    path: `/orders/${encodeSegment(orderId)}`,
    config,
  });
}

export function buildVendorWorkspaceLink({
  path = "/vendor-workspace/dashboard",
  config = {},
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path,
    config,
  });
}

export function buildClientPortalLink({
  path = "/client-portal",
  config = {},
} = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.CLIENT,
    path,
    config,
  });
}

export function buildPublicVendorBidInvitationLink(token, { config = {} } = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path: `/vendor/bid-invitations/${encodeSegment(token)}`,
    config,
  });
}

export function buildPublicVendorAssignmentOfferLink(token, { config = {} } = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path: `/vendor/assignment-offers/${encodeSegment(token)}`,
    config,
  });
}

export function buildPublicVendorAssignmentWorkLink(token, { config = {} } = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    path: `/vendor/assignment-work/${encodeSegment(token)}`,
    config,
  });
}

export function buildAcceptInviteLink(invitationId, { config = {} } = {}) {
  return buildProductLink({
    productContext: PRODUCT_CONTEXTS.SHARED_LEGACY,
    path: `/accept-invite/${encodeSegment(invitationId)}`,
    config,
  });
}

export function describeProductLink({
  target,
  productContext = PRODUCT_CONTEXTS.SHARED_LEGACY,
  path = "/",
  query = null,
  config = {},
} = {}) {
  const context = normalizeProductContext(productContext);
  const normalizedPath = buildProductPath(path, query);
  const baseUrl = getProductBaseUrl(context, config);

  return Object.freeze({
    target: target || null,
    productContext: context,
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
