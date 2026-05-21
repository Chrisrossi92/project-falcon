import { PERMISSIONS } from '../permissions/constants.js';
import {
  CURRENT_DASHBOARD_AUTHORITY,
  CURRENT_DASHBOARD_REGISTRY_KIND,
  CURRENT_DASHBOARD_SURFACES,
  currentLiveDashboardEntries,
  getCurrentLiveDashboardEntry,
} from './currentDashboardRegistry.js';

export const CURRENT_DASHBOARD_RESOLUTION_STATES = Object.freeze({
  LOADING: 'loading',
  ORDER_DASHBOARD: 'order_dashboard',
  ASSIGNMENT_DASHBOARD: 'assignment_dashboard',
  UNAVAILABLE: 'unavailable',
});

export const CURRENT_ORDER_DASHBOARD_PERMISSIONS = Object.freeze([
  PERMISSIONS.NAVIGATION_ORDERS_VIEW,
  PERMISSIONS.ORDERS_READ_ALL,
  PERMISSIONS.ORDERS_READ_ASSIGNED,
]);

export const CURRENT_ASSIGNMENT_DASHBOARD_PERMISSIONS = Object.freeze([
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
]);

const ASSIGNED_WORK_ENTRY_ID = 'dashboard.assignment.assigned-work';
const OWNER_SENT_ENTRY_ID = 'dashboard.assignment.owner-sent';

const ORDER_DASHBOARD_METADATA = Object.freeze({
  id: 'current.dashboard.order',
  label: 'Staff / Default Order Dashboard',
  state: CURRENT_DASHBOARD_RESOLUTION_STATES.ORDER_DASHBOARD,
  surface: CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
  componentHint: 'DashboardPage',
  route: '/dashboard',
  priority: 1,
});

const ASSIGNMENT_DASHBOARD_METADATA = Object.freeze({
  id: 'current.dashboard.assignment',
  label: 'Assignment Dashboard',
  state: CURRENT_DASHBOARD_RESOLUTION_STATES.ASSIGNMENT_DASHBOARD,
  surface: CURRENT_DASHBOARD_SURFACES.ASSIGNMENT_DASHBOARD,
  componentHint: 'AssignmentDashboardPage',
  route: '/dashboard',
  priority: 2,
});

const LOADING_DASHBOARD_METADATA = Object.freeze({
  id: 'current.dashboard.loading',
  label: 'Loading Dashboard',
  state: CURRENT_DASHBOARD_RESOLUTION_STATES.LOADING,
  surface: null,
  componentHint: 'LoadingState',
  route: '/dashboard',
  message: 'Loading dashboard...',
});

const UNAVAILABLE_DASHBOARD_METADATA = Object.freeze({
  id: 'current.dashboard.unavailable',
  label: 'Dashboard unavailable',
  state: CURRENT_DASHBOARD_RESOLUTION_STATES.UNAVAILABLE,
  surface: null,
  componentHint: 'AssignmentState',
  route: '/dashboard',
  message:
    'Dashboard access requires order read permission or assignment packet read permission for the current company.',
});

const normalizePermissionKeys = (value) => {
  if (!value) return [];

  if (value instanceof Set) {
    return normalizePermissionKeys([...value]);
  }

  if (Array.isArray(value)) {
    return [...new Set(value.map((key) => String(key || '').trim()).filter(Boolean))];
  }

  return [];
};

const normalizeResolutionInput = (input) => {
  if (!input) return {};
  if (Array.isArray(input) || input instanceof Set) {
    return { permissionKeys: normalizePermissionKeys(input) };
  }

  return input;
};

const hasAny = (permissionKeys, requiredPermissions) => {
  const permissionSet = new Set(normalizePermissionKeys(permissionKeys));
  return requiredPermissions.some((permission) => permissionSet.has(permission));
};

const getOrderDashboardEntries = () =>
  currentLiveDashboardEntries.filter(
    (entry) => entry.surface === CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
  );

const getAssignmentDashboardEntries = (capabilities) => {
  const entries = [];

  if (capabilities.canReadAssignedAssignments) {
    const assignedWorkEntry = getCurrentLiveDashboardEntry(ASSIGNED_WORK_ENTRY_ID);
    if (assignedWorkEntry) entries.push(assignedWorkEntry);
  }

  if (capabilities.canReadOwnerAssignments) {
    const ownerSentEntry = getCurrentLiveDashboardEntry(OWNER_SENT_ENTRY_ID);
    if (ownerSentEntry) entries.push(ownerSentEntry);
  }

  return entries;
};

export function getCurrentDashboardCapabilities(input) {
  const normalizedInput = normalizeResolutionInput(input);
  const permissionKeys = normalizePermissionKeys(
    normalizedInput.permissionKeys ?? normalizedInput.permissions,
  );

  const canReadAssignedAssignments =
    normalizedInput.canReadAssignedAssignments ??
    hasAny(permissionKeys, [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED]);
  const canReadOwnerAssignments =
    normalizedInput.canReadOwnerAssignments ??
    hasAny(permissionKeys, [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER]);

  const canViewOrderDashboard =
    normalizedInput.canViewOrderDashboard ??
    hasAny(permissionKeys, CURRENT_ORDER_DASHBOARD_PERMISSIONS);
  const canViewAssignmentDashboard =
    normalizedInput.canViewAssignmentDashboard ??
    Boolean(canReadAssignedAssignments || canReadOwnerAssignments);

  return Object.freeze({
    loading: Boolean(normalizedInput.loading),
    error: normalizedInput.error ?? null,
    permissionKeys: Object.freeze(permissionKeys),
    canViewOrderDashboard: Boolean(canViewOrderDashboard),
    canViewAssignmentDashboard: Boolean(canViewAssignmentDashboard),
    canReadAssignedAssignments: Boolean(canReadAssignedAssignments),
    canReadOwnerAssignments: Boolean(canReadOwnerAssignments),
  });
}

export function resolveCurrentDashboard(input) {
  const capabilities = getCurrentDashboardCapabilities(input);
  const gateEntry = getCurrentLiveDashboardEntry('dashboard.gate');

  if (capabilities.loading) {
    return Object.freeze({
      ...LOADING_DASHBOARD_METADATA,
      registryKind: CURRENT_DASHBOARD_REGISTRY_KIND,
      metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
      gateEntry,
      conceptEntries: Object.freeze([]),
      capabilities,
    });
  }

  if (capabilities.canViewOrderDashboard) {
    return Object.freeze({
      ...ORDER_DASHBOARD_METADATA,
      registryKind: CURRENT_DASHBOARD_REGISTRY_KIND,
      metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
      gateEntry,
      conceptEntries: Object.freeze(getOrderDashboardEntries()),
      capabilities,
    });
  }

  if (capabilities.canViewAssignmentDashboard) {
    return Object.freeze({
      ...ASSIGNMENT_DASHBOARD_METADATA,
      registryKind: CURRENT_DASHBOARD_REGISTRY_KIND,
      metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
      gateEntry,
      conceptEntries: Object.freeze(getAssignmentDashboardEntries(capabilities)),
      capabilities,
    });
  }

  return Object.freeze({
    ...UNAVAILABLE_DASHBOARD_METADATA,
    registryKind: CURRENT_DASHBOARD_REGISTRY_KIND,
    metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
    gateEntry,
    conceptEntries: Object.freeze([]),
    capabilities,
  });
}

export default resolveCurrentDashboard;
