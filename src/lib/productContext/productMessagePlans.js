import { PRODUCT_CONTEXTS, normalizeProductContext } from "@/lib/productContext/productContext";
import { PRODUCT_LINK_TARGETS } from "@/lib/productContext/productLinks";

export const PRODUCT_MESSAGE_KINDS = Object.freeze({
  INTERNAL_ORDER_NOTIFICATION: "internal_order_notification",
  AMC_ORDER_NOTIFICATION: "amc_order_notification",
  VENDOR_BID_INVITATION: "vendor_bid_invitation",
  VENDOR_ASSIGNMENT_OFFER: "vendor_assignment_offer",
  VENDOR_ASSIGNMENT_WORK: "vendor_assignment_work",
  CLIENT_PORTAL_INVITE: "client_portal_invite",
  GENERIC_LEGACY_NOTIFICATION: "generic_legacy_notification",
});

export const PRODUCT_MESSAGE_LINK_BUILDERS = Object.freeze({
  INTERNAL_ORDER_DETAIL: "buildInternalOrderDetailLink",
  AMC_ORDER_DETAIL: "buildAmcOrderDetailLink",
  PUBLIC_VENDOR_BID_INVITATION: "buildPublicVendorBidInvitationLink",
  PUBLIC_VENDOR_ASSIGNMENT_OFFER: "buildPublicVendorAssignmentOfferLink",
  PUBLIC_VENDOR_ASSIGNMENT_WORK: "buildPublicVendorAssignmentWorkLink",
  CLIENT_PORTAL: "buildClientPortalLink",
  DASHBOARD: "buildDashboardLink",
});

const PRODUCT_BASE_URL_KEYS = Object.freeze({
  [PRODUCT_CONTEXTS.INTERNAL]: "internalAppBaseUrl",
  [PRODUCT_CONTEXTS.AMC]: "amcAppBaseUrl",
  [PRODUCT_CONTEXTS.VENDOR]: "vendorAppBaseUrl",
  [PRODUCT_CONTEXTS.CLIENT]: "clientPortalAppBaseUrl",
  [PRODUCT_CONTEXTS.SHARED_LEGACY]: "legacyAppBaseUrl",
});

const MESSAGE_PLAN_DEFINITIONS = Object.freeze({
  [PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION]: Object.freeze({
    productContext: PRODUCT_CONTEXTS.INTERNAL,
    target: PRODUCT_LINK_TARGETS.INTERNAL_ORDER_DETAIL,
    linkBuilder: PRODUCT_MESSAGE_LINK_BUILDERS.INTERNAL_ORDER_DETAIL,
    requiredBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.INTERNAL],
    fallbackBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    routeFamily: "order_detail",
  }),
  [PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION]: Object.freeze({
    productContext: PRODUCT_CONTEXTS.AMC,
    target: PRODUCT_LINK_TARGETS.AMC_ORDER_DETAIL,
    linkBuilder: PRODUCT_MESSAGE_LINK_BUILDERS.AMC_ORDER_DETAIL,
    requiredBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.AMC],
    fallbackBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    routeFamily: "order_detail",
  }),
  [PRODUCT_MESSAGE_KINDS.VENDOR_BID_INVITATION]: Object.freeze({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    target: PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_BID_INVITATION,
    linkBuilder: PRODUCT_MESSAGE_LINK_BUILDERS.PUBLIC_VENDOR_BID_INVITATION,
    requiredBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.VENDOR],
    fallbackBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    routeFamily: "public_vendor_bid_invitation",
  }),
  [PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_OFFER]: Object.freeze({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    target: PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_OFFER,
    linkBuilder: PRODUCT_MESSAGE_LINK_BUILDERS.PUBLIC_VENDOR_ASSIGNMENT_OFFER,
    requiredBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.VENDOR],
    fallbackBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    routeFamily: "public_vendor_assignment_offer",
  }),
  [PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK]: Object.freeze({
    productContext: PRODUCT_CONTEXTS.VENDOR,
    target: PRODUCT_LINK_TARGETS.PUBLIC_VENDOR_ASSIGNMENT_WORK,
    linkBuilder: PRODUCT_MESSAGE_LINK_BUILDERS.PUBLIC_VENDOR_ASSIGNMENT_WORK,
    requiredBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.VENDOR],
    fallbackBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    routeFamily: "public_vendor_assignment_work",
  }),
  [PRODUCT_MESSAGE_KINDS.CLIENT_PORTAL_INVITE]: Object.freeze({
    productContext: PRODUCT_CONTEXTS.CLIENT,
    target: PRODUCT_LINK_TARGETS.CLIENT_PORTAL,
    linkBuilder: PRODUCT_MESSAGE_LINK_BUILDERS.CLIENT_PORTAL,
    requiredBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.CLIENT],
    fallbackBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    routeFamily: "client_portal_invitation",
  }),
  [PRODUCT_MESSAGE_KINDS.GENERIC_LEGACY_NOTIFICATION]: Object.freeze({
    productContext: PRODUCT_CONTEXTS.SHARED_LEGACY,
    target: PRODUCT_LINK_TARGETS.DASHBOARD,
    linkBuilder: PRODUCT_MESSAGE_LINK_BUILDERS.DASHBOARD,
    requiredBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    fallbackBaseUrlKey: PRODUCT_BASE_URL_KEYS[PRODUCT_CONTEXTS.SHARED_LEGACY],
    routeFamily: "shared_legacy",
  }),
});

const EVENT_KIND_BY_TYPE = Object.freeze({
  internal_order_notification: PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION,
  amc_order_notification: PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION,
  vendor_bid_invitation: PRODUCT_MESSAGE_KINDS.VENDOR_BID_INVITATION,
  vendor_assignment_offer: PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_OFFER,
  vendor_assignment_work: PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK,
  vendor_assignment_submission: PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK,
  client_portal_invite: PRODUCT_MESSAGE_KINDS.CLIENT_PORTAL_INVITE,
  generic_legacy_notification: PRODUCT_MESSAGE_KINDS.GENERIC_LEGACY_NOTIFICATION,
});

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeToken(value) {
  return cleanText(value).toLowerCase();
}

function payloadValue(descriptor, key) {
  const payload = descriptor?.payload && typeof descriptor.payload === "object" ? descriptor.payload : {};
  return descriptor?.[key] ?? payload[key] ?? null;
}

function kindFromProductContext(descriptor) {
  const context = normalizeProductContext(
    descriptor?.productContext ?? descriptor?.product_context ?? descriptor?.workspaceContext,
  );
  const hasOrderReference = Boolean(payloadValue(descriptor, "orderId") ?? payloadValue(descriptor, "order_id"));

  if (!hasOrderReference) return null;
  if (context === PRODUCT_CONTEXTS.INTERNAL) return PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION;
  if (context === PRODUCT_CONTEXTS.AMC) return PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION;

  return null;
}

function kindFromOperationsScope(descriptor) {
  const scope = normalizeToken(
    descriptor?.operationsScope ??
      descriptor?.operations_scope ??
      descriptor?.payload?.operations_scope ??
      descriptor?.payload?.order_operations_scope,
  );
  const hasOrderReference = Boolean(payloadValue(descriptor, "orderId") ?? payloadValue(descriptor, "order_id"));

  if (!hasOrderReference) return null;
  if (scope === "internal_operations") return PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION;
  if (scope === "amc_operations") return PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION;

  return null;
}

export function inferProductMessageKind(descriptor = {}) {
  const explicitKind = normalizeToken(descriptor.kind ?? descriptor.messageKind ?? descriptor.message_kind);
  if (EVENT_KIND_BY_TYPE[explicitKind]) return EVENT_KIND_BY_TYPE[explicitKind];

  const eventType = normalizeToken(descriptor.eventType ?? descriptor.event_type ?? descriptor.type);
  if (EVENT_KIND_BY_TYPE[eventType]) return EVENT_KIND_BY_TYPE[eventType];

  const linkPath = cleanText(descriptor.linkPath ?? descriptor.link_path ?? descriptor.payload?.link_path);
  if (linkPath.startsWith("/vendor/bid-invitations/")) return PRODUCT_MESSAGE_KINDS.VENDOR_BID_INVITATION;
  if (linkPath.startsWith("/vendor/assignment-offers/")) return PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_OFFER;
  if (linkPath.startsWith("/vendor/assignment-work/")) return PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK;
  if (linkPath.startsWith("/client-portal/invitations/")) return PRODUCT_MESSAGE_KINDS.CLIENT_PORTAL_INVITE;

  return (
    kindFromProductContext(descriptor) ||
    kindFromOperationsScope(descriptor) ||
    PRODUCT_MESSAGE_KINDS.GENERIC_LEGACY_NOTIFICATION
  );
}

function routeParameterSummary(kind, descriptor) {
  switch (kind) {
    case PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION:
    case PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION:
      return Object.freeze({
        orderIdPresent: Boolean(payloadValue(descriptor, "orderId") ?? payloadValue(descriptor, "order_id")),
      });
    case PRODUCT_MESSAGE_KINDS.VENDOR_BID_INVITATION:
    case PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_OFFER:
    case PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK:
    case PRODUCT_MESSAGE_KINDS.CLIENT_PORTAL_INVITE:
      return Object.freeze({
        tokenPresent: Boolean(payloadValue(descriptor, "token")),
      });
    default:
      return Object.freeze({});
  }
}

function warningsForPlan(kind, descriptor, definition) {
  const warnings = [];
  const explicitContext = descriptor?.productContext ?? descriptor?.product_context ?? null;
  const normalizedExplicitContext = explicitContext ? normalizeProductContext(explicitContext) : null;

  if (kind === PRODUCT_MESSAGE_KINDS.GENERIC_LEGACY_NOTIFICATION) {
    warnings.push("product_context_ambiguous");
  }

  if (
    normalizedExplicitContext &&
    normalizedExplicitContext !== PRODUCT_CONTEXTS.SHARED_LEGACY &&
    normalizedExplicitContext !== definition.productContext
  ) {
    warnings.push("product_context_conflicts_with_message_kind");
  }

  if (
    (kind === PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION ||
      kind === PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION) &&
    !routeParameterSummary(kind, descriptor).orderIdPresent
  ) {
    warnings.push("order_id_missing_for_future_link");
  }

  if (
    (kind === PRODUCT_MESSAGE_KINDS.VENDOR_BID_INVITATION ||
      kind === PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_OFFER ||
      kind === PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK ||
      kind === PRODUCT_MESSAGE_KINDS.CLIENT_PORTAL_INVITE) &&
    !routeParameterSummary(kind, descriptor).tokenPresent
  ) {
    warnings.push("token_missing_for_future_link");
  }

  return Object.freeze(warnings);
}

export function createProductMessagePlan(descriptor = {}) {
  const kind = inferProductMessageKind(descriptor);
  const definition =
    MESSAGE_PLAN_DEFINITIONS[kind] ||
    MESSAGE_PLAN_DEFINITIONS[PRODUCT_MESSAGE_KINDS.GENERIC_LEGACY_NOTIFICATION];
  const warnings = warningsForPlan(kind, descriptor, definition);

  return Object.freeze({
    messageKind: kind,
    eventType: descriptor.eventType ?? descriptor.event_type ?? descriptor.type ?? null,
    productContext: definition.productContext,
    target: definition.target,
    linkBuilder: definition.linkBuilder,
    requiredBaseUrlKey: definition.requiredBaseUrlKey,
    fallbackBaseUrlKey: definition.fallbackBaseUrlKey,
    fallback: definition.fallbackBaseUrlKey,
    routeFamily: definition.routeFamily,
    routeParameters: routeParameterSummary(kind, descriptor),
    warnings,
    ambiguous: warnings.includes("product_context_ambiguous"),
    dryRunOnly: true,
    diagnosticOnly: true,
    sendsEmail: false,
    sendsNotification: false,
    writesPayload: false,
    affectsDelivery: false,
  });
}

export const planProductMessage = createProductMessagePlan;

export function planInternalOrderNotification(descriptor = {}) {
  return createProductMessagePlan({
    ...descriptor,
    kind: PRODUCT_MESSAGE_KINDS.INTERNAL_ORDER_NOTIFICATION,
  });
}

export function planAmcOrderNotification(descriptor = {}) {
  return createProductMessagePlan({
    ...descriptor,
    kind: PRODUCT_MESSAGE_KINDS.AMC_ORDER_NOTIFICATION,
  });
}

export function planVendorBidInvitation(descriptor = {}) {
  return createProductMessagePlan({
    ...descriptor,
    kind: PRODUCT_MESSAGE_KINDS.VENDOR_BID_INVITATION,
  });
}

export function planVendorAssignmentOffer(descriptor = {}) {
  return createProductMessagePlan({
    ...descriptor,
    kind: PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_OFFER,
  });
}

export function planVendorAssignmentWork(descriptor = {}) {
  return createProductMessagePlan({
    ...descriptor,
    kind: PRODUCT_MESSAGE_KINDS.VENDOR_ASSIGNMENT_WORK,
  });
}

export function planClientPortalInvite(descriptor = {}) {
  return createProductMessagePlan({
    ...descriptor,
    kind: PRODUCT_MESSAGE_KINDS.CLIENT_PORTAL_INVITE,
  });
}
