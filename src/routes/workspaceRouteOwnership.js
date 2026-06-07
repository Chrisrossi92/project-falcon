import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";

export const ROUTE_WORKSPACES = Object.freeze({
  INTERNAL: "internal",
  AMC: "amc",
  VENDOR: "vendor",
  CLIENT: "client",
  PUBLIC: "public",
});

export const ROUTE_WORKSPACE_DASHBOARDS = Object.freeze({
  [ROUTE_WORKSPACES.INTERNAL]: "/dashboard",
  [ROUTE_WORKSPACES.AMC]: "/dashboard",
  [ROUTE_WORKSPACES.VENDOR]: "/vendor-workspace/dashboard",
  [ROUTE_WORKSPACES.CLIENT]: "/dashboard",
  [ROUTE_WORKSPACES.PUBLIC]: "/",
});

export const ROUTE_WORKSPACE_GROUPS = Object.freeze({
  OPERATIONS: Object.freeze([
    ROUTE_WORKSPACES.INTERNAL,
    ROUTE_WORKSPACES.AMC,
  ]),
});

const OPERATIONS_MODE_ROUTE_WORKSPACES = Object.freeze({
  [OPERATIONS_MODES.INTERNAL_OPERATIONS]: ROUTE_WORKSPACES.INTERNAL,
  [OPERATIONS_MODES.AMC_OPERATIONS]: ROUTE_WORKSPACES.AMC,
});

export function getRouteWorkspaceForOperationsMode(operationsMode) {
  return OPERATIONS_MODE_ROUTE_WORKSPACES[operationsMode] || ROUTE_WORKSPACES.INTERNAL;
}

export function isRouteWorkspaceAllowed(routeWorkspace, operationsMode) {
  if (!routeWorkspace || routeWorkspace === ROUTE_WORKSPACES.PUBLIC) return true;
  if (Array.isArray(routeWorkspace)) {
    return routeWorkspace.includes(getRouteWorkspaceForOperationsMode(operationsMode));
  }

  return routeWorkspace === getRouteWorkspaceForOperationsMode(operationsMode);
}

export function getRouteWorkspaceFallbackPath(routeWorkspace) {
  return ROUTE_WORKSPACE_DASHBOARDS[routeWorkspace] || "/dashboard";
}
