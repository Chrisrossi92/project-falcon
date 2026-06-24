import { PRODUCT_CONTEXTS } from "@/lib/productContext/productContext";

export const PRODUCT_ROUTE_MIGRATION_PHASES = Object.freeze({
  COMPATIBILITY_ONLY: "compatibility_only",
  FUTURE_ALIAS: "future_alias",
  FUTURE_CANONICAL: "future_canonical",
});

export const PRODUCT_ROUTE_IDS = Object.freeze({
  INTERNAL_DASHBOARD: "internalDashboard",
  INTERNAL_ORDERS: "internalOrders",
  INTERNAL_ORDER_DETAIL: "internalOrderDetail",
  INTERNAL_CALENDAR: "internalCalendar",
  INTERNAL_ACTIVITY: "internalActivity",
  INTERNAL_CLIENTS: "internalClients",
  INTERNAL_SETTINGS: "internalSettings",

  AMC_DASHBOARD: "amcDashboard",
  AMC_ORDERS: "amcOrders",
  AMC_ORDER_DETAIL: "amcOrderDetail",
  AMC_VENDORS: "amcVendors",
  AMC_VENDOR_DETAIL: "amcVendorDetail",
  AMC_CLIENT_REQUESTS: "amcClientRequests",
  AMC_SETTINGS: "amcSettings",

  VENDOR_WORKSPACE_DASHBOARD: "vendorWorkspaceDashboard",
  VENDOR_WORKSPACE_ASSIGNED_ORDERS: "vendorWorkspaceAssignedOrders",
  VENDOR_WORKSPACE_PAYMENTS: "vendorWorkspacePayments",
  VENDOR_WORKSPACE_PROFILE: "vendorWorkspaceProfile",

  CLIENT_PORTAL_DASHBOARD: "clientPortalDashboard",
  CLIENT_PORTAL_ORDER_DETAIL: "clientPortalOrderDetail",

  VENDOR_BID_INVITATION: "vendorBidInvitation",
  VENDOR_ASSIGNMENT_OFFER: "vendorAssignmentOffer",
  VENDOR_ASSIGNMENT_WORK: "vendorAssignmentWork",
  ACCEPT_INVITE: "acceptInvite",
});

function routeDefinition(id, productContext, currentPath, canonicalPath, migrationPhase) {
  return Object.freeze({
    id,
    productContext,
    currentPath,
    compatibilityPath: currentPath,
    canonicalPath,
    migrationPhase,
  });
}

export const PRODUCT_ROUTE_DEFINITIONS = Object.freeze([
  routeDefinition(
    PRODUCT_ROUTE_IDS.INTERNAL_DASHBOARD,
    PRODUCT_CONTEXTS.INTERNAL,
    "/dashboard",
    "/internal/dashboard",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.INTERNAL_ORDERS,
    PRODUCT_CONTEXTS.INTERNAL,
    "/orders",
    "/internal/orders",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.INTERNAL_ORDER_DETAIL,
    PRODUCT_CONTEXTS.INTERNAL,
    "/orders/:id",
    "/internal/orders/:id",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.INTERNAL_CALENDAR,
    PRODUCT_CONTEXTS.INTERNAL,
    "/calendar",
    "/internal/calendar",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.INTERNAL_ACTIVITY,
    PRODUCT_CONTEXTS.INTERNAL,
    "/activity",
    "/internal/activity",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.INTERNAL_CLIENTS,
    PRODUCT_CONTEXTS.INTERNAL,
    "/clients",
    "/internal/clients",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.INTERNAL_SETTINGS,
    PRODUCT_CONTEXTS.INTERNAL,
    "/settings",
    "/internal/settings",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),

  routeDefinition(
    PRODUCT_ROUTE_IDS.AMC_DASHBOARD,
    PRODUCT_CONTEXTS.AMC,
    "/dashboard",
    "/amc/dashboard",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.AMC_ORDERS,
    PRODUCT_CONTEXTS.AMC,
    "/orders",
    "/amc/orders",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.AMC_ORDER_DETAIL,
    PRODUCT_CONTEXTS.AMC,
    "/orders/:id",
    "/amc/orders/:id",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.AMC_VENDORS,
    PRODUCT_CONTEXTS.AMC,
    "/vendors",
    "/amc/vendors",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.AMC_VENDOR_DETAIL,
    PRODUCT_CONTEXTS.AMC,
    "/vendors/:vendorProfileId",
    "/amc/vendors/:vendorProfileId",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.AMC_CLIENT_REQUESTS,
    PRODUCT_CONTEXTS.AMC,
    "/client-requests",
    "/amc/client-requests",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.AMC_SETTINGS,
    PRODUCT_CONTEXTS.AMC,
    "/settings",
    "/amc/settings",
    PRODUCT_ROUTE_MIGRATION_PHASES.FUTURE_ALIAS,
  ),

  routeDefinition(
    PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_DASHBOARD,
    PRODUCT_CONTEXTS.VENDOR,
    "/vendor-workspace/dashboard",
    "/vendor-workspace/dashboard",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_ASSIGNED_ORDERS,
    PRODUCT_CONTEXTS.VENDOR,
    "/vendor-workspace/assigned-orders",
    "/vendor-workspace/assigned-orders",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_PAYMENTS,
    PRODUCT_CONTEXTS.VENDOR,
    "/vendor-workspace/payments",
    "/vendor-workspace/payments",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.VENDOR_WORKSPACE_PROFILE,
    PRODUCT_CONTEXTS.VENDOR,
    "/vendor-workspace/profile",
    "/vendor-workspace/profile",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),

  routeDefinition(
    PRODUCT_ROUTE_IDS.CLIENT_PORTAL_DASHBOARD,
    PRODUCT_CONTEXTS.CLIENT,
    "/client-portal",
    "/client-portal",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.CLIENT_PORTAL_ORDER_DETAIL,
    PRODUCT_CONTEXTS.CLIENT,
    "/client-portal/orders/:orderId",
    "/client-portal/orders/:orderId",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),

  routeDefinition(
    PRODUCT_ROUTE_IDS.VENDOR_BID_INVITATION,
    PRODUCT_CONTEXTS.VENDOR,
    "/vendor/bid-invitations/:token",
    "/vendor/bid-invitations/:token",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.VENDOR_ASSIGNMENT_OFFER,
    PRODUCT_CONTEXTS.VENDOR,
    "/vendor/assignment-offers/:token",
    "/vendor/assignment-offers/:token",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.VENDOR_ASSIGNMENT_WORK,
    PRODUCT_CONTEXTS.VENDOR,
    "/vendor/assignment-work/:token",
    "/vendor/assignment-work/:token",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
  routeDefinition(
    PRODUCT_ROUTE_IDS.ACCEPT_INVITE,
    PRODUCT_CONTEXTS.SHARED_LEGACY,
    "/accept-invite/:invitationId",
    "/accept-invite/:invitationId",
    PRODUCT_ROUTE_MIGRATION_PHASES.COMPATIBILITY_ONLY,
  ),
]);

const PRODUCT_ROUTE_DEFINITIONS_BY_ID = Object.freeze(
  Object.fromEntries(PRODUCT_ROUTE_DEFINITIONS.map((definition) => [definition.id, definition])),
);

export function getRouteDefinition(id) {
  return PRODUCT_ROUTE_DEFINITIONS_BY_ID[id] || null;
}

export function getCanonicalPath(id) {
  return getRouteDefinition(id)?.canonicalPath || null;
}

export function getCompatibilityPath(id) {
  return getRouteDefinition(id)?.compatibilityPath || null;
}
