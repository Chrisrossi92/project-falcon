import { PERMISSIONS } from '../permissions/constants.js';

export const CURRENT_DASHBOARD_REGISTRY_KIND = 'current_live_dashboard_registry';

export const CURRENT_DASHBOARD_AUTHORITY = Object.freeze({
  DESCRIPTIVE_ONLY: 'descriptive_only_permissions_remain_authority',
});

export const CURRENT_DASHBOARD_GATE_TYPES = Object.freeze({
  ANY_PERMISSION: 'any_permission',
  NONE: 'none',
});

export const CURRENT_DASHBOARD_SURFACES = Object.freeze({
  ORDER_DASHBOARD: 'order_dashboard',
  ASSIGNMENT_DASHBOARD: 'assignment_dashboard',
  DASHBOARD_GATE: 'dashboard_gate',
});

export const CURRENT_DASHBOARD_STATUS = Object.freeze({
  ACTIVE_LIVE: 'active_live',
  PARTIAL_FOUNDATION: 'partial_foundation',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const gate = (type, permissions = []) =>
  Object.freeze({
    type,
    permissions: freezeArray(permissions),
  });

const noGate = gate(CURRENT_DASHBOARD_GATE_TYPES.NONE);

const orderDashboardGate = gate(CURRENT_DASHBOARD_GATE_TYPES.ANY_PERMISSION, [
  PERMISSIONS.NAVIGATION_ORDERS_VIEW,
  PERMISSIONS.ORDERS_READ_ALL,
  PERMISSIONS.ORDERS_READ_ASSIGNED,
]);

const assignmentDashboardGate = gate(CURRENT_DASHBOARD_GATE_TYPES.ANY_PERMISSION, [
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
]);

const createEntry = (definition) =>
  Object.freeze({
    ...definition,
    activeLive: true,
    futureOnly: false,
    productModeAware: false,
    metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
    status: definition.status ?? CURRENT_DASHBOARD_STATUS.ACTIVE_LIVE,
    gate: definition.gate ?? noGate,
    tags: freezeArray(definition.tags),
    widgetNotes: freezeArray(definition.widgetNotes),
    notes: freezeArray(definition.notes),
  });

export const currentLiveDashboardEntries = freezeArray([
  createEntry({
    id: 'dashboard.gate',
    label: 'Dashboard Gate',
    surface: CURRENT_DASHBOARD_SURFACES.DASHBOARD_GATE,
    shadowDashboardItemId: 'dashboard-shell-anchor',
    gate: gate(CURRENT_DASHBOARD_GATE_TYPES.ANY_PERMISSION, [
      ...orderDashboardGate.permissions,
      ...assignmentDashboardGate.permissions,
    ]),
    tags: ['dashboard', 'gate'],
    widgetNotes: ['Selects order dashboard first, then assignment dashboard, then unavailable state.'],
    notes: ['Current runtime shell selection is permission-driven and not product-mode-driven.'],
  }),
  createEntry({
    id: 'dashboard.order.active-attention',
    label: 'Operational Attention',
    surface: CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
    shadowDashboardItemId: 'active-order-attention',
    laneHint: 'internal_operations',
    gate: orderDashboardGate,
    tags: ['orders', 'queues', 'attention'],
    widgetNotes: ['Top operational queue cards are derived from active dashboard order rows.'],
    notes: ['Current order dashboard concept maps to Staff active order attention.'],
  }),
  createEntry({
    id: 'dashboard.order.deadline-pressure',
    label: 'Due Soon / Overdue Order Pressure',
    surface: CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
    shadowDashboardItemId: 'due-soon-overdue',
    laneHint: 'internal_operations',
    gate: orderDashboardGate,
    tags: ['orders', 'deadlines'],
    widgetNotes: ['Admin KPI cards include inspected/awaiting report and due-to-client windows.'],
    notes: ['Current dashboard exposes deadline pressure through summary cards and order filters.'],
  }),
  createEntry({
    id: 'dashboard.order.client-summary',
    label: 'Client Operational Summary',
    surface: CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
    shadowDashboardItemId: 'client-operational-summary',
    laneHint: 'internal_operations',
    gate: orderDashboardGate,
    tags: ['clients', 'orders'],
    widgetNotes: ['Client context appears through active order rows and client-attached order filters.'],
    notes: ['Current live dashboard has client operational context, not a standalone client dashboard shell.'],
  }),
  createEntry({
    id: 'dashboard.order.review-qc',
    label: 'Review / QC Queue',
    surface: CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
    shadowDashboardItemId: 'review-qc-queue',
    laneHint: 'internal_operations',
    gate: orderDashboardGate,
    tags: ['reviews', 'orders'],
    widgetNotes: ['Reviewer mode uses dashboard order rows with reviewer queue filtering.'],
    notes: ['Current review dashboard behavior is embedded in the order dashboard.'],
  }),
  createEntry({
    id: 'dashboard.order.calendar-pressure',
    label: 'Calendar Pressure',
    surface: CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
    shadowDashboardItemId: 'calendar-pressure',
    laneHint: 'internal_operations',
    gate: orderDashboardGate,
    tags: ['calendar', 'deadlines'],
    widgetNotes: ['DashboardCalendarPanel renders calendar-centered due work and attention signals.'],
    notes: ['Current order dashboard includes calendar pressure as an embedded panel.'],
  }),
  createEntry({
    id: 'dashboard.order.table',
    label: 'Dashboard Orders Table',
    surface: CURRENT_DASHBOARD_SURFACES.ORDER_DASHBOARD,
    shadowDashboardItemId: null,
    laneHint: 'internal_operations',
    gate: orderDashboardGate,
    tags: ['orders', 'table'],
    widgetNotes: ['UnifiedOrdersTable is mounted with dashboard scope and active queue filtering.'],
    notes: ['Live-only diagnostic concept; the shadow registry tracks higher-level dashboard items.'],
  }),
  createEntry({
    id: 'dashboard.assignment.assigned-work',
    label: 'Assigned Work',
    surface: CURRENT_DASHBOARD_SURFACES.ASSIGNMENT_DASHBOARD,
    shadowDashboardItemId: 'active-assignment-packets',
    laneHint: 'packet_execution',
    gate: gate(CURRENT_DASHBOARD_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
    ]),
    tags: ['assignments', 'packets'],
    widgetNotes: ['Shows offered, active, due soon, overdue, and submitted assignment packets.'],
    notes: [
      'Assignment-native dashboard rows link only to assignment packets.',
      'This does not grant canonical order dashboard or client visibility.',
    ],
  }),
  createEntry({
    id: 'dashboard.assignment.owner-sent',
    label: 'Sent Assignments',
    surface: CURRENT_DASHBOARD_SURFACES.ASSIGNMENT_DASHBOARD,
    shadowDashboardItemId: 'assignment-sla-pressure',
    laneHint: 'network_operations',
    gate: gate(CURRENT_DASHBOARD_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]),
    tags: ['assignments', 'owner', 'sla'],
    widgetNotes: ['Shows sent active, submitted, overdue, expiring offers, and completed-recently metrics.'],
    notes: [
      'Owner-side assignment dashboard uses assignment packet APIs only.',
      'This is not an AMC network command center shell.',
    ],
  }),
]);

export const currentLiveDashboardEntriesById = Object.freeze(
  Object.fromEntries(currentLiveDashboardEntries.map((entry) => [entry.id, entry])),
);

export const getCurrentLiveDashboardEntry = (entryId) =>
  currentLiveDashboardEntriesById[entryId] ?? null;

export const getCurrentLiveShadowDashboardItemIds = () =>
  freezeArray(currentLiveDashboardEntries.map((entry) => entry.shadowDashboardItemId).filter(Boolean));
