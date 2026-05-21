import { isProductModeId, PRODUCT_MODE_IDS } from '../productModes/productModes.js';
import {
  composeProductModeModuleIds,
  getMissingDependencyIds,
  getModuleMetadata,
} from '../modules/moduleHelpers.js';
import { MODULE_IDS } from '../modules/moduleRegistry.js';

export const SHADOW_COMMAND_DIAGNOSTIC_STATUS = Object.freeze({
  METADATA_ONLY: 'metadata_only',
});

export const SHADOW_COMMAND_AUTHORITY = Object.freeze({
  NONE: 'none_metadata_only',
});

export const SHADOW_COMMAND_KIND = Object.freeze({
  NAVIGATE: 'navigate',
  SEARCH: 'search',
  CREATE: 'create',
  OPEN: 'open',
});

export const SHADOW_COMMAND_LANE = Object.freeze({
  PERSONAL_WORKSPACE: 'personal_workspace',
  INTERNAL_OPERATIONS: 'internal_operations',
  NETWORK_OPERATIONS: 'network_operations',
  CLIENT_WORKSPACE: 'client_workspace',
  PLATFORM_ADMIN: 'platform_admin',
  INTELLIGENCE: 'intelligence',
});

const commandBlueprint = (id, label, kind, lane, tags = []) =>
  Object.freeze({ id, label, kind, lane, tags: Object.freeze(tags) });

const systemCommandBlueprints = (moduleId) => {
  const blueprints = {
    [MODULE_IDS.DASHBOARD]: [
      commandBlueprint(
        'open-dashboard',
        'Open Dashboard',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.PERSONAL_WORKSPACE,
        ['dashboard'],
      ),
    ],
    [MODULE_IDS.NOTIFICATIONS]: [
      commandBlueprint(
        'open-notifications',
        'Open Notifications',
        SHADOW_COMMAND_KIND.OPEN,
        SHADOW_COMMAND_LANE.PERSONAL_WORKSPACE,
        ['notifications'],
      ),
    ],
    [MODULE_IDS.ACTIVITY]: [
      commandBlueprint(
        'open-activity',
        'Open Activity',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.PERSONAL_WORKSPACE,
        ['activity'],
      ),
    ],
    [MODULE_IDS.SETTINGS]: [
      commandBlueprint(
        'open-settings',
        'Open Settings',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.PERSONAL_WORKSPACE,
        ['settings'],
      ),
    ],
  };

  return blueprints[moduleId] ?? [];
};

const modeAwareCommandBlueprints = (modeId, moduleId) => {
  if (moduleId === MODULE_IDS.ORDERS && modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL) {
    return [
      commandBlueprint(
        'open-my-requests',
        'Open My Requests',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.CLIENT_WORKSPACE,
        ['client', 'requests', 'status'],
      ),
      commandBlueprint(
        'search-request-status',
        'Search Request Status',
        SHADOW_COMMAND_KIND.SEARCH,
        SHADOW_COMMAND_LANE.CLIENT_WORKSPACE,
        ['client', 'requests', 'status'],
      ),
    ];
  }

  if (moduleId === MODULE_IDS.ORDERS && modeId === PRODUCT_MODE_IDS.AMC_OPERATIONS) {
    return [
      commandBlueprint(
        'open-amc-intake',
        'Open AMC Intake Queue',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        ['amc', 'intake', 'orders'],
      ),
      commandBlueprint(
        'search-amc-orders',
        'Search AMC Orders',
        SHADOW_COMMAND_KIND.SEARCH,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        ['amc', 'orders'],
      ),
    ];
  }

  if (moduleId === MODULE_IDS.ORDERS) {
    return [
      commandBlueprint(
        'open-orders',
        'Open Orders',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        ['orders'],
      ),
      commandBlueprint(
        'search-orders',
        'Search Orders',
        SHADOW_COMMAND_KIND.SEARCH,
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        ['orders'],
      ),
    ];
  }

  const blueprints = {
    [MODULE_IDS.CLIENTS]: [
      commandBlueprint(
        'open-clients',
        'Open Clients',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        ['clients'],
      ),
    ],
    [MODULE_IDS.TEAM_ACCESS]: [
      commandBlueprint(
        'open-team-access',
        'Open Team Access',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.PLATFORM_ADMIN,
        ['team', 'admin'],
      ),
    ],
    [MODULE_IDS.ASSIGNMENTS]: [
      commandBlueprint(
        'open-assignment-packets',
        'Open Assignment Packets',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        ['assignments', 'packets'],
      ),
    ],
    [MODULE_IDS.REVIEWS]: [
      commandBlueprint(
        'open-review-queue',
        'Open Review Queue',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        ['reviews', 'workflow'],
      ),
    ],
    [MODULE_IDS.CALENDAR]: [
      commandBlueprint(
        'open-calendar',
        'Open Calendar',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        ['calendar'],
      ),
    ],
    [MODULE_IDS.RELATIONSHIPS]: [
      commandBlueprint(
        'open-relationships',
        'Open Relationships',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        ['relationships', 'network'],
      ),
    ],
    [MODULE_IDS.AMC_OPERATIONS]: [
      commandBlueprint(
        'open-amc-command-center',
        'Open AMC Command Center',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        ['amc', 'network'],
      ),
    ],
    [MODULE_IDS.VENDOR_PORTAL]: [
      commandBlueprint(
        'open-vendor-workspace',
        'Open Vendor Workspace',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        ['vendor', 'assignments'],
      ),
    ],
    [MODULE_IDS.CLIENT_PORTAL]: [
      commandBlueprint(
        'submit-client-request',
        'Submit Request',
        SHADOW_COMMAND_KIND.CREATE,
        SHADOW_COMMAND_LANE.CLIENT_WORKSPACE,
        ['client', 'request'],
      ),
      commandBlueprint(
        'open-client-messages',
        'Open Messages and Updates',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.CLIENT_WORKSPACE,
        ['client', 'messages'],
      ),
    ],
    [MODULE_IDS.REPORTS]: [
      commandBlueprint(
        'open-documents-reports',
        'Open Documents and Reports',
        SHADOW_COMMAND_KIND.NAVIGATE,
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL
          ? SHADOW_COMMAND_LANE.CLIENT_WORKSPACE
          : SHADOW_COMMAND_LANE.INTELLIGENCE,
        ['reports', 'documents'],
      ),
    ],
    [MODULE_IDS.ANALYTICS]: [
      commandBlueprint(
        'open-analytics',
        'Open Analytics',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.INTELLIGENCE,
        ['analytics'],
      ),
    ],
    [MODULE_IDS.AI_WORKSPACE]: [
      commandBlueprint(
        'open-ai-workspace',
        'Open AI Workspace',
        SHADOW_COMMAND_KIND.OPEN,
        SHADOW_COMMAND_LANE.INTELLIGENCE,
        ['ai'],
      ),
    ],
    [MODULE_IDS.BILLING]: [
      commandBlueprint(
        'open-billing',
        'Open Billing',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.PLATFORM_ADMIN,
        ['billing'],
      ),
    ],
    [MODULE_IDS.INTEGRATIONS]: [
      commandBlueprint(
        'open-integrations',
        'Open Integrations',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.PLATFORM_ADMIN,
        ['integrations'],
      ),
    ],
    [MODULE_IDS.ONBOARDING]: [
      commandBlueprint(
        'open-guided-setup',
        'Open Guided Setup',
        SHADOW_COMMAND_KIND.OPEN,
        SHADOW_COMMAND_LANE.PLATFORM_ADMIN,
        ['onboarding'],
      ),
    ],
    [MODULE_IDS.TENANT_ADMIN]: [
      commandBlueprint(
        'open-tenant-admin',
        'Open Tenant Administration',
        SHADOW_COMMAND_KIND.NAVIGATE,
        SHADOW_COMMAND_LANE.PLATFORM_ADMIN,
        ['tenant', 'admin'],
      ),
    ],
  };

  return blueprints[moduleId] ?? systemCommandBlueprints(moduleId);
};

const createShadowCommandEntry = (modeId, moduleDefinition, blueprint) =>
  Object.freeze({
    id: `${moduleDefinition.id}:${blueprint.id}`,
    commandId: blueprint.id,
    label: blueprint.label,
    kind: blueprint.kind,
    lane: blueprint.lane,
    tags: blueprint.tags,
    moduleId: moduleDefinition.id,
    moduleLabel: moduleDefinition.label,
    category: moduleDefinition.category,
    registrationStatus: SHADOW_COMMAND_DIAGNOSTIC_STATUS.METADATA_ONLY,
    runtimeComposed: false,
    permissionDomains: Object.freeze([...moduleDefinition.permissionDomains]),
    permissionAuthority: SHADOW_COMMAND_AUTHORITY.NONE,
    permissionMetadataOnly: true,
    modeId,
  });

export const getShadowCommandEntriesForModuleIds = (moduleIds = [], modeId = null) =>
  Object.freeze(
    moduleIds.flatMap((moduleId) => {
      const moduleDefinition = getModuleMetadata(moduleId);

      if (!moduleDefinition) {
        return [];
      }

      return modeAwareCommandBlueprints(modeId, moduleDefinition.id).map((blueprint) =>
        createShadowCommandEntry(modeId, moduleDefinition, blueprint),
      );
    }),
  );

export const getShadowCommandPaletteComposition = (modeId, additionalModuleIds = []) => {
  const isKnownMode = isProductModeId(modeId);

  if (!isKnownMode) {
    return Object.freeze({
      modeId,
      isKnownMode: false,
      moduleIds: Object.freeze([]),
      entries: Object.freeze([]),
      entriesByLane: Object.freeze({}),
      missingDependencyIds: Object.freeze([]),
      permissionAuthority: SHADOW_COMMAND_AUTHORITY.NONE,
      runtimeComposed: false,
      diagnostics: Object.freeze(['Unknown product mode; no shadow commands generated.']),
    });
  }

  const moduleIds = composeProductModeModuleIds(modeId, additionalModuleIds);
  const entries = getShadowCommandEntriesForModuleIds(moduleIds, modeId);
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
    permissionAuthority: SHADOW_COMMAND_AUTHORITY.NONE,
    runtimeComposed: false,
    diagnostics: Object.freeze([
      'Shadow command palette composition is diagnostic metadata only.',
      'Permission domains describe future command gates but do not authorize visibility here.',
    ]),
  });
};

export const getShadowCommandIds = (modeId, additionalModuleIds = []) =>
  getShadowCommandPaletteComposition(modeId, additionalModuleIds).entries.map(
    (entry) => entry.commandId,
  );
