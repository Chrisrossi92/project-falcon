import { OPERATIONS_MODES } from '../operations/operationsMode.js';

export const WORKSPACE_NAVIGATION_KIND = 'workspace_navigation_definitions';

export const WORKSPACE_NAVIGATION_IDS = Object.freeze({
  INTERNAL_OPERATIONS: OPERATIONS_MODES.INTERNAL_OPERATIONS,
  AMC_OPERATIONS: OPERATIONS_MODES.AMC_OPERATIONS,
  VENDOR_WORKSPACE: 'vendor_workspace',
  CLIENT_WORKSPACE: 'client_workspace',
});

export const WORKSPACE_NAVIGATION_STATUSES = Object.freeze({
  ACTIVE_LIVE: 'active_live',
  FUTURE_PLACEHOLDER: 'future_placeholder',
  SAFE_EMPTY: 'safe_empty',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const freezeRecord = (record = {}) =>
  Object.freeze(Object.fromEntries(Object.entries(record)));

const freezeSection = (section) =>
  Object.freeze({
    ...section,
    navEntryIds: freezeArray(section.navEntryIds),
    notes: freezeArray(section.notes),
  });

const freezeDefinition = (definition) =>
  Object.freeze({
    ...definition,
    sections: freezeArray(definition.sections.map(freezeSection)),
    mobileOrder: freezeArray(definition.mobileOrder),
    labelOverrides: freezeRecord(definition.labelOverrides),
    hiddenPrimaryNavEntryIds: freezeArray(definition.hiddenPrimaryNavEntryIds),
    futurePlaceholderNavEntryIds: freezeArray(definition.futurePlaceholderNavEntryIds),
    notes: freezeArray(definition.notes),
  });

const emptyDefinition = freezeDefinition({
  id: 'unknown_workspace',
  label: 'Unknown Workspace',
  status: WORKSPACE_NAVIGATION_STATUSES.SAFE_EMPTY,
  activeLive: false,
  futureOnly: false,
  sections: [],
  mobileOrder: [],
  labelOverrides: {},
  hiddenPrimaryNavEntryIds: [],
  futurePlaceholderNavEntryIds: [],
  notes: ['Unknown workspaces resolve to an empty definition and must not create navigation.'],
});

export const workspaceNavigationDefinitions = freezeArray([
  freezeDefinition({
    id: WORKSPACE_NAVIGATION_IDS.INTERNAL_OPERATIONS,
    label: 'Internal Operations',
    status: WORKSPACE_NAVIGATION_STATUSES.ACTIVE_LIVE,
    activeLive: true,
    futureOnly: false,
    sections: [
      {
        id: 'operations',
        label: 'Operations',
        navEntryIds: ['dashboard', 'orders', 'calendar', 'assignments', 'my_work'],
        notes: [
          'Internal production, scheduling, assignment oversight, and role-appropriate staff work lanes.',
        ],
      },
      {
        id: 'management',
        label: 'Management',
        navEntryIds: ['clients.primary', 'users', 'relationships'],
        notes: ['Client, team, and relationship management surfaces stay internal-only.'],
      },
      {
        id: 'reporting',
        label: 'Reporting',
        navEntryIds: [],
        notes: ['Reserved for reports or analytics routes when current-live entries exist.'],
      },
      {
        id: 'system',
        label: 'System',
        navEntryIds: [
          'settings',
          'settings.ownerSetup',
          'settings.notifications',
          'settings.productMetadataDiagnostics',
        ],
        notes: ['Settings and diagnostics stay support/system surfaces.'],
      },
    ],
    mobileOrder: [
      'dashboard',
      'orders',
      'calendar',
      'assignments',
      'my_work',
      'clients.primary',
      'users',
      'relationships',
      'settings',
    ],
    labelOverrides: {},
    hiddenPrimaryNavEntryIds: ['vendors'],
    futurePlaceholderNavEntryIds: [],
    notes: [
      'Internal Operations intentionally excludes AMC vendor and procurement-specific navigation.',
    ],
  }),
  freezeDefinition({
    id: WORKSPACE_NAVIGATION_IDS.AMC_OPERATIONS,
    label: 'AMC Operations',
    status: WORKSPACE_NAVIGATION_STATUSES.ACTIVE_LIVE,
    activeLive: true,
    futureOnly: false,
    sections: [
      {
        id: 'procurement',
        label: 'Procurement',
        navEntryIds: ['dashboard', 'orders', 'calendar'],
        notes: ['AMC order monitoring, due pressure, and procurement workflow entry points.'],
      },
      {
        id: 'vendors',
        label: 'Vendors',
        navEntryIds: ['vendors'],
        notes: ['Vendor directory and future vendor-network management surfaces.'],
      },
      {
        id: 'clients',
        label: 'Clients',
        navEntryIds: ['clients.primary'],
        notes: ['Client context remains shared by route but AMC-native by workspace meaning.'],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        navEntryIds: [],
        notes: ['Reserved for AMC analytics routes when current-live entries exist.'],
      },
      {
        id: 'system',
        label: 'System',
        navEntryIds: ['settings'],
        notes: ['System settings remain available only through existing permission gates.'],
      },
    ],
    mobileOrder: ['dashboard', 'orders', 'calendar', 'vendors', 'clients.primary', 'settings'],
    labelOverrides: {},
    hiddenPrimaryNavEntryIds: ['assignments', 'relationships', 'users', 'my_work'],
    futurePlaceholderNavEntryIds: ['procurement.queue', 'bid_requests'],
    notes: [
      'AMC Operations hides internal assignment, relationship, user, and staff work navigation.',
      'Assignment packets may remain reachable from workflow links even when direct navigation is hidden.',
    ],
  }),
  freezeDefinition({
    id: WORKSPACE_NAVIGATION_IDS.VENDOR_WORKSPACE,
    label: 'Vendor Workspace',
    status: WORKSPACE_NAVIGATION_STATUSES.FUTURE_PLACEHOLDER,
    activeLive: false,
    futureOnly: true,
    sections: [
      {
        id: 'work',
        label: 'Work',
        navEntryIds: ['vendor.available_work', 'vendor.my_bids', 'vendor.assigned_orders'],
        notes: ['Future vendor-native workbench routes; not current-live navigation entries.'],
      },
      {
        id: 'documents',
        label: 'Documents',
        navEntryIds: ['vendor.documents'],
        notes: ['Future vendor document and compliance document surface.'],
      },
      {
        id: 'financials',
        label: 'Financials',
        navEntryIds: ['vendor.invoices'],
        notes: ['Future vendor invoice and payment status surface.'],
      },
      {
        id: 'profile',
        label: 'Profile',
        navEntryIds: [
          'vendor.profile',
          'vendor.coverage',
          'vendor.contacts',
          'vendor.compliance',
        ],
        notes: ['Future vendor company profile, coverage, contact, and compliance surfaces.'],
      },
    ],
    mobileOrder: [
      'vendor.available_work',
      'vendor.my_bids',
      'vendor.assigned_orders',
      'vendor.documents',
      'vendor.invoices',
      'vendor.profile',
    ],
    labelOverrides: {},
    hiddenPrimaryNavEntryIds: [],
    futurePlaceholderNavEntryIds: [
      'vendor.available_work',
      'vendor.my_bids',
      'vendor.assigned_orders',
      'vendor.documents',
      'vendor.invoices',
      'vendor.profile',
      'vendor.coverage',
      'vendor.contacts',
      'vendor.compliance',
    ],
    notes: ['Future placeholder only. Do not expose in active navigation before portal support.'],
  }),
  freezeDefinition({
    id: WORKSPACE_NAVIGATION_IDS.CLIENT_WORKSPACE,
    label: 'Client Workspace',
    status: WORKSPACE_NAVIGATION_STATUSES.FUTURE_PLACEHOLDER,
    activeLive: false,
    futureOnly: true,
    sections: [
      {
        id: 'orders',
        label: 'Orders',
        navEntryIds: ['client.orders'],
        notes: ['Future client-facing order/request status surface.'],
      },
      {
        id: 'documents',
        label: 'Documents',
        navEntryIds: ['client.documents'],
        notes: ['Future client reports and document delivery surface.'],
      },
      {
        id: 'messages',
        label: 'Messages',
        navEntryIds: ['client.messages'],
        notes: ['Future client communication surface.'],
      },
      {
        id: 'billing',
        label: 'Billing',
        navEntryIds: ['client.billing'],
        notes: ['Future client invoice/payment surface.'],
      },
      {
        id: 'profile',
        label: 'Profile',
        navEntryIds: ['client.profile'],
        notes: ['Future client profile and account surface.'],
      },
    ],
    mobileOrder: [
      'client.orders',
      'client.documents',
      'client.messages',
      'client.billing',
      'client.profile',
    ],
    labelOverrides: {},
    hiddenPrimaryNavEntryIds: [],
    futurePlaceholderNavEntryIds: [
      'client.orders',
      'client.documents',
      'client.messages',
      'client.billing',
      'client.profile',
    ],
    notes: ['Future placeholder only. Do not expose in active navigation before portal support.'],
  }),
]);

const workspaceNavigationDefinitionsById = Object.freeze(
  Object.fromEntries(workspaceNavigationDefinitions.map((definition) => [definition.id, definition])),
);

export const getWorkspaceNavigationDefinition = (workspaceId) =>
  workspaceNavigationDefinitionsById[workspaceId] ?? emptyDefinition;

export const getWorkspaceNavigationSections = (workspaceId) =>
  getWorkspaceNavigationDefinition(workspaceId).sections;

export const getWorkspaceNavigationMobileOrder = (workspaceId) =>
  getWorkspaceNavigationDefinition(workspaceId).mobileOrder;

export const getWorkspaceNavigationLabelOverrides = (workspaceId) =>
  getWorkspaceNavigationDefinition(workspaceId).labelOverrides;
