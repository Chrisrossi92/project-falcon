import { getModuleMetadata } from '../modules/moduleHelpers.js';
import {
  composeProductModeModuleIds,
  getMissingDependencyIds,
} from '../modules/moduleHelpers.js';
import {
  DASHBOARD_REGISTRATION_KINDS,
  MODULE_IDS,
} from '../modules/moduleRegistry.js';
import { PRODUCT_MODE_METADATA } from '../productModes/productModeMetadata.js';
import { isProductModeId, PRODUCT_MODE_IDS } from '../productModes/productModes.js';

export const SHADOW_DASHBOARD_DIAGNOSTIC_STATUS = Object.freeze({
  METADATA_ONLY: 'metadata_only',
});

export const SHADOW_DASHBOARD_AUTHORITY = Object.freeze({
  NONE: 'none_metadata_only',
});

export const SHADOW_DASHBOARD_LANE = Object.freeze({
  SHELL: 'shell',
  PERSONAL_WORKSPACE: 'personal_workspace',
  INTERNAL_OPERATIONS: 'internal_operations',
  NETWORK_OPERATIONS: 'network_operations',
  PACKET_EXECUTION: 'packet_execution',
  CLIENT_WORKSPACE: 'client_workspace',
  INTELLIGENCE: 'intelligence',
  PLATFORM_ADMIN: 'platform_admin',
});

export const SHADOW_DASHBOARD_ITEM_KIND = Object.freeze({
  SHELL: 'shell',
  SECTION: 'section',
  WIDGET: 'widget',
  EMPTY_STATE: 'empty_state',
});

const dashboardBlueprint = (id, label, kind, lane, tags = []) =>
  Object.freeze({ id, label, kind, lane, tags: Object.freeze(tags) });

const systemDashboardBlueprints = (moduleId) => {
  const blueprints = {
    [MODULE_IDS.DASHBOARD]: [
      dashboardBlueprint(
        'dashboard-shell-anchor',
        'Dashboard Shell Anchor',
        SHADOW_DASHBOARD_ITEM_KIND.SHELL,
        SHADOW_DASHBOARD_LANE.SHELL,
        ['dashboard'],
      ),
    ],
    [MODULE_IDS.NOTIFICATIONS]: [
      dashboardBlueprint(
        'notification-attention',
        'Notification Attention',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.PERSONAL_WORKSPACE,
        ['notifications'],
      ),
    ],
    [MODULE_IDS.ACTIVITY]: [
      dashboardBlueprint(
        'recent-activity',
        'Recent Activity',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.PERSONAL_WORKSPACE,
        ['activity'],
      ),
    ],
  };

  return blueprints[moduleId] ?? [];
};

const ordersBlueprintsForMode = (modeId) => {
  if (modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL) {
    return [
      dashboardBlueprint(
        'active-requests',
        'Active Requests',
        SHADOW_DASHBOARD_ITEM_KIND.SECTION,
        SHADOW_DASHBOARD_LANE.CLIENT_WORKSPACE,
        ['client', 'requests', 'status'],
      ),
      dashboardBlueprint(
        'waiting-on-me',
        'Waiting on Me',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.CLIENT_WORKSPACE,
        ['client', 'requests'],
      ),
    ];
  }

  if (modeId === PRODUCT_MODE_IDS.AMC_OPERATIONS) {
    return [
      dashboardBlueprint(
        'amc-intake-unassigned',
        'Intake and Unassigned Orders',
        SHADOW_DASHBOARD_ITEM_KIND.SECTION,
        SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS,
        ['amc', 'intake', 'orders'],
      ),
      dashboardBlueprint(
        'client-lender-exceptions',
        'Client and Lender Exceptions',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS,
        ['amc', 'client', 'exceptions'],
      ),
    ];
  }

  return [
    dashboardBlueprint(
      'active-order-attention',
      'Active Order Attention',
      SHADOW_DASHBOARD_ITEM_KIND.SECTION,
      SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS,
      ['orders', 'queue'],
    ),
    dashboardBlueprint(
      'due-soon-overdue',
      'Due Soon and Overdue',
      SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
      SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS,
      ['orders', 'deadlines'],
    ),
  ];
};

const modeAwareDashboardBlueprints = (modeId, moduleId) => {
  if (moduleId === MODULE_IDS.ORDERS) {
    return ordersBlueprintsForMode(modeId);
  }

  const blueprints = {
    [MODULE_IDS.CLIENTS]: [
      dashboardBlueprint(
        'client-operational-summary',
        'Client Operational Summary',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS,
        ['clients'],
      ),
    ],
    [MODULE_IDS.TEAM_ACCESS]: [
      dashboardBlueprint(
        'team-access-setup',
        'Team Access Setup',
        SHADOW_DASHBOARD_ITEM_KIND.EMPTY_STATE,
        SHADOW_DASHBOARD_LANE.PLATFORM_ADMIN,
        ['team', 'setup'],
      ),
    ],
    [MODULE_IDS.ASSIGNMENTS]: [
      dashboardBlueprint(
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? 'active-assignment-packets'
          : 'assignment-sla-pressure',
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? 'Active Assignment Packets'
          : 'Assignment SLA Pressure',
        SHADOW_DASHBOARD_ITEM_KIND.SECTION,
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? SHADOW_DASHBOARD_LANE.PACKET_EXECUTION
          : SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS,
        ['assignments', 'packets'],
      ),
    ],
    [MODULE_IDS.REVIEWS]: [
      dashboardBlueprint(
        'review-qc-queue',
        'Review / QC Queue',
        SHADOW_DASHBOARD_ITEM_KIND.SECTION,
        SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS,
        ['reviews', 'workflow'],
      ),
    ],
    [MODULE_IDS.CALENDAR]: [
      dashboardBlueprint(
        'calendar-pressure',
        'Calendar Pressure',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? SHADOW_DASHBOARD_LANE.PACKET_EXECUTION
          : SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS,
        ['calendar', 'deadlines'],
      ),
    ],
    [MODULE_IDS.RELATIONSHIPS]: [
      dashboardBlueprint(
        'relationship-attention',
        'Relationship Attention',
        SHADOW_DASHBOARD_ITEM_KIND.SECTION,
        SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS,
        ['relationships', 'network'],
      ),
    ],
    [MODULE_IDS.AMC_OPERATIONS]: [
      dashboardBlueprint(
        'amc-network-command-center',
        'AMC Network Command Center',
        SHADOW_DASHBOARD_ITEM_KIND.SHELL,
        SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS,
        ['amc', 'network'],
      ),
    ],
    [MODULE_IDS.VENDOR_PORTAL]: [
      dashboardBlueprint(
        'vendor-packet-dashboard',
        'Vendor Packet Dashboard',
        SHADOW_DASHBOARD_ITEM_KIND.SHELL,
        SHADOW_DASHBOARD_LANE.PACKET_EXECUTION,
        ['vendor', 'packets'],
      ),
    ],
    [MODULE_IDS.CLIENT_PORTAL]: [
      dashboardBlueprint(
        'client-status-dashboard',
        'Client Status Dashboard',
        SHADOW_DASHBOARD_ITEM_KIND.SHELL,
        SHADOW_DASHBOARD_LANE.CLIENT_WORKSPACE,
        ['client', 'requests', 'status'],
      ),
      dashboardBlueprint(
        'recent-client-updates',
        'Recent Updates',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.CLIENT_WORKSPACE,
        ['client', 'updates'],
      ),
    ],
    [MODULE_IDS.REPORTS]: [
      dashboardBlueprint(
        'delivered-documents-reports',
        'Delivered Documents / Reports',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL
          ? SHADOW_DASHBOARD_LANE.CLIENT_WORKSPACE
          : SHADOW_DASHBOARD_LANE.INTELLIGENCE,
        ['reports', 'documents'],
      ),
    ],
    [MODULE_IDS.ANALYTICS]: [
      dashboardBlueprint(
        'analytics-snapshot',
        'Analytics Snapshot',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.INTELLIGENCE,
        ['analytics'],
      ),
    ],
    [MODULE_IDS.AI_WORKSPACE]: [
      dashboardBlueprint(
        'ai-summary',
        'AI Summary',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.INTELLIGENCE,
        ['ai'],
      ),
    ],
    [MODULE_IDS.BILLING]: [
      dashboardBlueprint(
        'billing-status',
        'Billing Status',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.PLATFORM_ADMIN,
        ['billing'],
      ),
    ],
    [MODULE_IDS.INTEGRATIONS]: [
      dashboardBlueprint(
        'integration-health',
        'Integration Health',
        SHADOW_DASHBOARD_ITEM_KIND.WIDGET,
        SHADOW_DASHBOARD_LANE.PLATFORM_ADMIN,
        ['integrations'],
      ),
    ],
    [MODULE_IDS.ONBOARDING]: [
      dashboardBlueprint(
        'setup-progress',
        'Setup Progress',
        SHADOW_DASHBOARD_ITEM_KIND.EMPTY_STATE,
        SHADOW_DASHBOARD_LANE.PLATFORM_ADMIN,
        ['onboarding'],
      ),
    ],
  };

  return blueprints[moduleId] ?? systemDashboardBlueprints(moduleId);
};

const registrationKindForBlueprint = (blueprint, moduleDefinition) => {
  if (blueprint.kind === SHADOW_DASHBOARD_ITEM_KIND.SHELL) {
    return DASHBOARD_REGISTRATION_KINDS.SHELL;
  }

  return moduleDefinition.dashboardRegistration.kind;
};

const createShadowDashboardItem = (modeId, moduleDefinition, blueprint) =>
  Object.freeze({
    id: `${moduleDefinition.id}:${blueprint.id}`,
    dashboardItemId: blueprint.id,
    label: blueprint.label,
    kind: blueprint.kind,
    lane: blueprint.lane,
    tags: blueprint.tags,
    moduleId: moduleDefinition.id,
    moduleLabel: moduleDefinition.label,
    category: moduleDefinition.category,
    registrationKind: registrationKindForBlueprint(blueprint, moduleDefinition),
    registrationStatus: SHADOW_DASHBOARD_DIAGNOSTIC_STATUS.METADATA_ONLY,
    runtimeComposed: false,
    permissionDomains: Object.freeze([...moduleDefinition.permissionDomains]),
    permissionAuthority: SHADOW_DASHBOARD_AUTHORITY.NONE,
    permissionMetadataOnly: true,
    modeId,
    notes: moduleDefinition.dashboardRegistration.notes,
  });

export const getShadowDashboardItemsForModuleIds = (moduleIds = [], modeId = null) =>
  Object.freeze(
    moduleIds.flatMap((moduleId) => {
      const moduleDefinition = getModuleMetadata(moduleId);

      if (!moduleDefinition) {
        return [];
      }

      return modeAwareDashboardBlueprints(modeId, moduleDefinition.id).map((blueprint) =>
        createShadowDashboardItem(modeId, moduleDefinition, blueprint),
      );
    }),
  );

export const getShadowDashboardComposition = (modeId, additionalModuleIds = []) => {
  const isKnownMode = isProductModeId(modeId);

  if (!isKnownMode) {
    return Object.freeze({
      modeId,
      isKnownMode: false,
      shell: null,
      moduleIds: Object.freeze([]),
      expectedSections: Object.freeze([]),
      items: Object.freeze([]),
      itemsByLane: Object.freeze({}),
      missingDependencyIds: Object.freeze([]),
      permissionAuthority: SHADOW_DASHBOARD_AUTHORITY.NONE,
      runtimeComposed: false,
      diagnostics: Object.freeze(['Unknown product mode; no shadow dashboard generated.']),
    });
  }

  const productMode = PRODUCT_MODE_METADATA[modeId];
  const moduleIds = composeProductModeModuleIds(modeId, additionalModuleIds);
  const items = getShadowDashboardItemsForModuleIds(moduleIds, modeId);
  const itemsByLane = items.reduce((accumulator, item) => {
    const existingItems = accumulator[item.lane] ?? [];

    return {
      ...accumulator,
      [item.lane]: Object.freeze([...existingItems, item]),
    };
  }, {});

  const shell = Object.freeze({
    modeId,
    name: productMode.dashboardName,
    primaryDailyQuestion: productMode.primaryDailyQuestion,
    lane: SHADOW_DASHBOARD_LANE.SHELL,
    registrationStatus: SHADOW_DASHBOARD_DIAGNOSTIC_STATUS.METADATA_ONLY,
    runtimeComposed: false,
    permissionAuthority: SHADOW_DASHBOARD_AUTHORITY.NONE,
  });

  return Object.freeze({
    modeId,
    isKnownMode: true,
    shell,
    moduleIds,
    expectedSections: productMode.futureDashboardSections,
    items,
    itemsByLane: Object.freeze(itemsByLane),
    missingDependencyIds: getMissingDependencyIds(moduleIds),
    permissionAuthority: SHADOW_DASHBOARD_AUTHORITY.NONE,
    runtimeComposed: false,
    diagnostics: Object.freeze([
      'Shadow dashboard composition is diagnostic metadata only.',
      'Permission domains describe future dashboard gates but do not authorize visibility here.',
    ]),
  });
};

export const getShadowDashboardItemIds = (modeId, additionalModuleIds = []) =>
  getShadowDashboardComposition(modeId, additionalModuleIds).items.map(
    (item) => item.dashboardItemId,
  );
