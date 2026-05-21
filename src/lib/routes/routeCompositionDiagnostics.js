import {
  composeProductModeModuleIds,
  getMissingDependencyIds,
  getModuleMetadata,
} from '../modules/moduleHelpers.js';
import { MODULE_IDS } from '../modules/moduleRegistry.js';
import { isProductModeId, PRODUCT_MODE_IDS } from '../productModes/productModes.js';

export const SHADOW_ROUTE_DIAGNOSTIC_STATUS = Object.freeze({
  METADATA_ONLY: 'metadata_only',
});

export const SHADOW_ROUTE_AUTHORITY = Object.freeze({
  NONE: 'none_metadata_only',
});

export const SHADOW_ROUTE_LANE = Object.freeze({
  PERSONAL_WORKSPACE: 'personal_workspace',
  INTERNAL_OPERATIONS: 'internal_operations',
  NETWORK_OPERATIONS: 'network_operations',
  PACKET_EXECUTION: 'packet_execution',
  CLIENT_WORKSPACE: 'client_workspace',
  PLATFORM_ADMIN: 'platform_admin',
  INTELLIGENCE: 'intelligence',
});

export const SHADOW_ROUTE_KIND = Object.freeze({
  SHELL: 'shell',
  LIST: 'list',
  DETAIL: 'detail',
  CREATE: 'create',
  EDIT: 'edit',
  SETTINGS: 'settings',
  DIAGNOSTIC: 'diagnostic',
});

const routeBlueprint = (
  id,
  label,
  kind,
  lane,
  routePattern,
  permissionKeys = [],
  tags = [],
) =>
  Object.freeze({
    id,
    label,
    kind,
    lane,
    routePattern,
    permissionKeys: Object.freeze(permissionKeys),
    tags: Object.freeze(tags),
  });

const systemRouteBlueprints = (moduleId) => {
  const blueprints = {
    [MODULE_IDS.DASHBOARD]: [
      routeBlueprint(
        'dashboard-home',
        'Dashboard',
        SHADOW_ROUTE_KIND.SHELL,
        SHADOW_ROUTE_LANE.PERSONAL_WORKSPACE,
        '/dashboard',
        ['core.dashboard.view'],
        ['dashboard'],
      ),
    ],
    [MODULE_IDS.ACTIVITY]: [
      routeBlueprint(
        'activity-feed',
        'Activity',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.PERSONAL_WORKSPACE,
        '/activity',
        ['activity.read.all', 'activity.read.assigned'],
        ['activity'],
      ),
    ],
    [MODULE_IDS.SETTINGS]: [
      routeBlueprint(
        'settings-home',
        'Settings',
        SHADOW_ROUTE_KIND.SETTINGS,
        SHADOW_ROUTE_LANE.PERSONAL_WORKSPACE,
        '/settings',
        ['settings.view'],
        ['settings'],
      ),
    ],
    [MODULE_IDS.NOTIFICATIONS]: [
      routeBlueprint(
        'notification-settings',
        'Notification Settings',
        SHADOW_ROUTE_KIND.SETTINGS,
        SHADOW_ROUTE_LANE.PERSONAL_WORKSPACE,
        '/settings/notifications',
        ['notifications.preferences.manage.own'],
        ['notifications', 'settings'],
      ),
    ],
  };

  return blueprints[moduleId] ?? [];
};

const orderRoutesForMode = (modeId) => {
  if (modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL) {
    return [
      routeBlueprint(
        'client-request-list',
        'My Requests',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.CLIENT_WORKSPACE,
        '/requests',
        ['client_portal.requests.read'],
        ['client', 'request', 'status'],
      ),
      routeBlueprint(
        'client-request-detail',
        'Request Status Detail',
        SHADOW_ROUTE_KIND.DETAIL,
        SHADOW_ROUTE_LANE.CLIENT_WORKSPACE,
        '/requests/:requestId',
        ['client_portal.requests.read'],
        ['client', 'request', 'status', 'documents'],
      ),
      routeBlueprint(
        'client-request-submit',
        'Submit Request',
        SHADOW_ROUTE_KIND.CREATE,
        SHADOW_ROUTE_LANE.CLIENT_WORKSPACE,
        '/requests/new',
        ['client_portal.requests.create'],
        ['client', 'request'],
      ),
    ];
  }

  if (modeId === PRODUCT_MODE_IDS.AMC_OPERATIONS) {
    return [
      routeBlueprint(
        'amc-intake-orders',
        'AMC Intake Orders',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
        '/orders',
        ['orders.read.all', 'orders.read.assigned'],
        ['amc', 'intake', 'orders'],
      ),
      routeBlueprint(
        'amc-order-detail',
        'AMC Order Detail',
        SHADOW_ROUTE_KIND.DETAIL,
        SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
        '/orders/:id',
        ['orders.read.all', 'orders.read.assigned'],
        ['amc', 'orders', 'client'],
      ),
    ];
  }

  return [
    routeBlueprint(
      'staff-orders',
      'Orders',
      SHADOW_ROUTE_KIND.LIST,
      SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
      '/orders',
      ['orders.read.all', 'orders.read.assigned'],
      ['staff', 'orders', 'operations'],
    ),
    routeBlueprint(
      'staff-new-order',
      'New Order',
      SHADOW_ROUTE_KIND.CREATE,
      SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
      '/orders/new',
      ['orders.create'],
      ['staff', 'orders', 'intake'],
    ),
    routeBlueprint(
      'staff-order-detail',
      'Order Detail',
      SHADOW_ROUTE_KIND.DETAIL,
      SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
      '/orders/:id',
      ['orders.read.all', 'orders.read.assigned'],
      ['staff', 'orders'],
    ),
    routeBlueprint(
      'staff-edit-order',
      'Edit Order',
      SHADOW_ROUTE_KIND.EDIT,
      SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
      '/orders/:id/edit',
      ['orders.update.all'],
      ['staff', 'orders'],
    ),
  ];
};

const assignmentRoutesForMode = (modeId) => {
  if (modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL) {
    return [
      routeBlueprint(
        'vendor-assignment-packets',
        'Assignment Packets',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.PACKET_EXECUTION,
        '/assignments',
        ['order_company_assignments.read_assigned'],
        ['vendor', 'assignment', 'packet'],
      ),
      routeBlueprint(
        'vendor-assignment-packet-detail',
        'Assignment Packet Detail',
        SHADOW_ROUTE_KIND.DETAIL,
        SHADOW_ROUTE_LANE.PACKET_EXECUTION,
        '/assignments/:assignmentId',
        ['order_company_assignments.read_assigned'],
        ['vendor', 'assignment', 'packet', 'timeline'],
      ),
    ];
  }

  return [
    routeBlueprint(
      'owner-assignments',
      'Assignments',
      SHADOW_ROUTE_KIND.LIST,
      SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
      '/assignments',
      ['order_company_assignments.read_owner', 'order_company_assignments.read_assigned'],
      ['assignments', 'network'],
    ),
    routeBlueprint(
      'owner-assignment-detail',
      'Assignment Detail',
      SHADOW_ROUTE_KIND.DETAIL,
      SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
      '/assignments/:assignmentId',
      ['order_company_assignments.read_owner', 'order_company_assignments.read_assigned'],
      ['assignments', 'network', 'packet'],
    ),
  ];
};

const calendarRoutesForMode = (modeId) =>
  routeBlueprint(
    modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL ? 'packet-calendar' : 'operations-calendar',
    modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL ? 'Packet Calendar' : 'Calendar',
    SHADOW_ROUTE_KIND.LIST,
    modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
      ? SHADOW_ROUTE_LANE.PACKET_EXECUTION
      : SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
    '/calendar',
    ['navigation.orders.view', 'orders.read.all', 'orders.read.assigned'],
    ['calendar', 'deadlines'],
  );

const modeAwareRouteBlueprints = (modeId, moduleId) => {
  if (moduleId === MODULE_IDS.ORDERS) {
    return orderRoutesForMode(modeId);
  }

  if (moduleId === MODULE_IDS.ASSIGNMENTS) {
    return assignmentRoutesForMode(modeId);
  }

  if (moduleId === MODULE_IDS.CALENDAR) {
    return [calendarRoutesForMode(modeId)];
  }

  const blueprints = {
    [MODULE_IDS.CLIENTS]: [
      routeBlueprint(
        'clients-list',
        'Clients',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
        '/clients',
        ['clients.read.all'],
        ['clients', 'crm'],
      ),
      routeBlueprint(
        'clients-detail',
        'Client Detail',
        SHADOW_ROUTE_KIND.DETAIL,
        SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
        '/clients/:id',
        ['clients.read.all', 'clients.read.assigned'],
        ['clients'],
      ),
    ],
    [MODULE_IDS.TEAM_ACCESS]: [
      routeBlueprint(
        'team-access-users',
        'Team Access',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.PLATFORM_ADMIN,
        '/users',
        ['users.read'],
        ['team', 'access'],
      ),
    ],
    [MODULE_IDS.REVIEWS]: [
      routeBlueprint(
        'review-workflow',
        'Review Workflow',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
        '/reviews',
        ['workflow.review.read'],
        ['review', 'workflow'],
      ),
    ],
    [MODULE_IDS.RELATIONSHIPS]: [
      routeBlueprint(
        'relationships-list',
        'Relationships',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
        '/relationships',
        ['relationships.read'],
        ['relationships', 'network'],
      ),
      routeBlueprint(
        'relationships-detail',
        'Relationship Detail',
        SHADOW_ROUTE_KIND.DETAIL,
        SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
        '/relationships/:relationshipId',
        ['relationships.read'],
        ['relationships', 'network'],
      ),
    ],
    [MODULE_IDS.AMC_OPERATIONS]: [
      routeBlueprint(
        'amc-command-center',
        'AMC Command Center',
        SHADOW_ROUTE_KIND.SHELL,
        SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
        '/amc',
        ['amc.operations.read'],
        ['amc', 'network', 'intake'],
      ),
    ],
    [MODULE_IDS.VENDOR_PORTAL]: [
      routeBlueprint(
        'vendor-workspace',
        'Vendor Workspace',
        SHADOW_ROUTE_KIND.SHELL,
        SHADOW_ROUTE_LANE.PACKET_EXECUTION,
        '/vendor',
        ['vendor_portal.read'],
        ['vendor', 'packet'],
      ),
    ],
    [MODULE_IDS.CLIENT_PORTAL]: [
      routeBlueprint(
        'client-portal-home',
        'Client Request Workspace',
        SHADOW_ROUTE_KIND.SHELL,
        SHADOW_ROUTE_LANE.CLIENT_WORKSPACE,
        '/client',
        ['client_portal.read'],
        ['client', 'request', 'status'],
      ),
      routeBlueprint(
        'client-documents',
        'Documents and Reports',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.CLIENT_WORKSPACE,
        '/client/documents',
        ['client_portal.documents.read'],
        ['client', 'documents', 'reports'],
      ),
    ],
    [MODULE_IDS.REPORTS]: [
      routeBlueprint(
        'documents-reports',
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL ? 'Documents and Reports' : 'Reports',
        SHADOW_ROUTE_KIND.LIST,
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL
          ? SHADOW_ROUTE_LANE.CLIENT_WORKSPACE
          : SHADOW_ROUTE_LANE.INTELLIGENCE,
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL ? '/client/documents' : '/reports',
        ['reports.read'],
        ['reports', 'documents'],
      ),
    ],
    [MODULE_IDS.ANALYTICS]: [
      routeBlueprint(
        'analytics',
        'Analytics',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.INTELLIGENCE,
        '/analytics',
        ['analytics.read'],
        ['analytics'],
      ),
    ],
    [MODULE_IDS.AI_WORKSPACE]: [
      routeBlueprint(
        'ai-workspace',
        'AI Workspace',
        SHADOW_ROUTE_KIND.SHELL,
        SHADOW_ROUTE_LANE.INTELLIGENCE,
        '/ai',
        ['ai.read'],
        ['ai'],
      ),
    ],
    [MODULE_IDS.BILLING]: [
      routeBlueprint(
        'billing',
        'Billing',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.PLATFORM_ADMIN,
        '/billing',
        ['billing.read'],
        ['billing'],
      ),
    ],
    [MODULE_IDS.INTEGRATIONS]: [
      routeBlueprint(
        'integrations',
        'Integrations',
        SHADOW_ROUTE_KIND.LIST,
        SHADOW_ROUTE_LANE.PLATFORM_ADMIN,
        '/integrations',
        ['integrations.read'],
        ['integrations'],
      ),
    ],
    [MODULE_IDS.ONBOARDING]: [
      routeBlueprint(
        'onboarding',
        'Guided Setup',
        SHADOW_ROUTE_KIND.SHELL,
        SHADOW_ROUTE_LANE.PLATFORM_ADMIN,
        '/setup',
        ['onboarding.read'],
        ['onboarding'],
      ),
    ],
    [MODULE_IDS.TENANT_ADMIN]: [
      routeBlueprint(
        'tenant-admin',
        'Tenant Administration',
        SHADOW_ROUTE_KIND.SHELL,
        SHADOW_ROUTE_LANE.PLATFORM_ADMIN,
        '/tenant-admin',
        ['tenant_admin.read'],
        ['tenant', 'admin'],
      ),
    ],
  };

  return blueprints[moduleId] ?? systemRouteBlueprints(moduleId);
};

const createShadowRouteEntry = (modeId, moduleDefinition, blueprint) =>
  Object.freeze({
    id: `${moduleDefinition.id}:${blueprint.id}`,
    routeConceptId: blueprint.id,
    label: blueprint.label,
    kind: blueprint.kind,
    lane: blueprint.lane,
    routePattern: blueprint.routePattern,
    tags: blueprint.tags,
    moduleId: moduleDefinition.id,
    moduleLabel: moduleDefinition.label,
    category: moduleDefinition.category,
    registrationStatus: SHADOW_ROUTE_DIAGNOSTIC_STATUS.METADATA_ONLY,
    runtimeComposed: false,
    permissionKeys: blueprint.permissionKeys,
    permissionDomains: Object.freeze([...moduleDefinition.permissionDomains]),
    permissionAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
    permissionMetadataOnly: true,
    routeAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
    routeMetadataOnly: true,
    modeId,
  });

export const getShadowRouteEntriesForModuleIds = (moduleIds = [], modeId = null) =>
  Object.freeze(
    moduleIds.flatMap((moduleId) => {
      const moduleDefinition = getModuleMetadata(moduleId);

      if (!moduleDefinition) {
        return [];
      }

      return modeAwareRouteBlueprints(modeId, moduleDefinition.id).map((blueprint) =>
        createShadowRouteEntry(modeId, moduleDefinition, blueprint),
      );
    }),
  );

export const getShadowRouteCompositionDiagnostics = (modeId, additionalModuleIds = []) => {
  if (!isProductModeId(modeId)) {
    return Object.freeze({
      modeId,
      isKnownMode: false,
      moduleIds: Object.freeze([]),
      entries: Object.freeze([]),
      entriesByLane: Object.freeze({}),
      missingDependencyIds: Object.freeze([]),
      permissionAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
      routeAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
      runtimeComposed: false,
      diagnostics: Object.freeze(['Unknown product mode; no shadow route diagnostics generated.']),
    });
  }

  const moduleIds = composeProductModeModuleIds(modeId, additionalModuleIds);
  const entries = getShadowRouteEntriesForModuleIds(moduleIds, modeId);
  const entriesByLane = entries.reduce((accumulator, entry) => {
    const existingEntries = accumulator[entry.lane] ?? [];

    return {
      ...accumulator,
      [entry.lane]: Object.freeze([...existingEntries, entry]),
    };
  }, {});

  return Object.freeze({
    modeId,
    isKnownMode: true,
    moduleIds,
    entries,
    entriesByLane: Object.freeze(entriesByLane),
    missingDependencyIds: getMissingDependencyIds(moduleIds),
    permissionAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
    routeAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
    runtimeComposed: false,
    diagnostics: Object.freeze([
      'Shadow route composition is diagnostic metadata only.',
      'Permission keys and domains describe future route gates but do not authorize route access here.',
      'Route patterns are conceptual and do not change active route configuration.',
    ]),
  });
};

export const getShadowRouteConceptIds = (modeId, additionalModuleIds = []) =>
  getShadowRouteCompositionDiagnostics(modeId, additionalModuleIds).entries.map(
    (entry) => entry.routeConceptId,
  );
