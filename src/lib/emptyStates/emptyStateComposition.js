import {
  composeProductModeModuleIds,
  getMissingDependencyIds,
  getModuleMetadata,
} from '../modules/moduleHelpers.js';
import { MODULE_IDS } from '../modules/moduleRegistry.js';
import { isProductModeId, PRODUCT_MODE_IDS } from '../productModes/productModes.js';

export const SHADOW_EMPTY_STATE_DIAGNOSTIC_STATUS = Object.freeze({
  METADATA_ONLY: 'metadata_only',
});

export const SHADOW_EMPTY_STATE_AUTHORITY = Object.freeze({
  NONE: 'none_metadata_only',
});

export const SHADOW_EMPTY_STATE_LANE = Object.freeze({
  PERSONAL_WORKSPACE: 'personal_workspace',
  INTERNAL_OPERATIONS: 'internal_operations',
  AMC_NETWORK: 'amc_network',
  PACKET_EXECUTION: 'packet_execution',
  CLIENT_WORKSPACE: 'client_workspace',
  PLATFORM_ADMIN: 'platform_admin',
  INTELLIGENCE: 'intelligence',
});

const emptyStateBlueprint = (id, title, message, lane, tags = []) =>
  Object.freeze({ id, title, message, lane, tags: Object.freeze(tags) });

const systemEmptyStateBlueprints = (moduleId) => {
  const blueprints = {
    [MODULE_IDS.DASHBOARD]: [
      emptyStateBlueprint(
        'dashboard-no-attention',
        'No dashboard attention items',
        'There are no diagnostic dashboard items for this workspace composition.',
        SHADOW_EMPTY_STATE_LANE.PERSONAL_WORKSPACE,
        ['dashboard'],
      ),
    ],
    [MODULE_IDS.NOTIFICATIONS]: [
      emptyStateBlueprint(
        'notifications-clear',
        'No notifications',
        'There are no personal notification prompts in this diagnostic composition.',
        SHADOW_EMPTY_STATE_LANE.PERSONAL_WORKSPACE,
        ['notifications'],
      ),
    ],
    [MODULE_IDS.ACTIVITY]: [
      emptyStateBlueprint(
        'activity-empty',
        'No activity yet',
        'Activity history will appear after workspace events are recorded.',
        SHADOW_EMPTY_STATE_LANE.PERSONAL_WORKSPACE,
        ['activity'],
      ),
    ],
    [MODULE_IDS.SETTINGS]: [
      emptyStateBlueprint(
        'settings-empty',
        'No settings attention',
        'There are no setup prompts for personal settings in this diagnostic composition.',
        SHADOW_EMPTY_STATE_LANE.PERSONAL_WORKSPACE,
        ['settings'],
      ),
    ],
  };

  return blueprints[moduleId] ?? [];
};

const ordersEmptyStatesForMode = (modeId) => {
  if (modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL) {
    return [
      emptyStateBlueprint(
        'client-no-requests',
        'No requests yet',
        'Submitted requests, status updates, and delivered documents will appear here.',
        SHADOW_EMPTY_STATE_LANE.CLIENT_WORKSPACE,
        ['client', 'requests', 'status', 'documents'],
      ),
    ];
  }

  if (modeId === PRODUCT_MODE_IDS.AMC_OPERATIONS) {
    return [
      emptyStateBlueprint(
        'amc-no-intake',
        'No intake work',
        'Client orders needing intake, assignment, vendor follow-up, or review will appear here.',
        SHADOW_EMPTY_STATE_LANE.AMC_NETWORK,
        ['amc', 'intake', 'assignment', 'vendor', 'client'],
      ),
    ];
  }

  return [
    emptyStateBlueprint(
      'staff-no-orders',
      'No active orders',
      'Operational order work, deadlines, review needs, and delivery blockers will appear here.',
      SHADOW_EMPTY_STATE_LANE.INTERNAL_OPERATIONS,
      ['staff', 'orders', 'work'],
    ),
  ];
};

const modeAwareEmptyStateBlueprints = (modeId, moduleId) => {
  if (moduleId === MODULE_IDS.ORDERS) {
    return ordersEmptyStatesForMode(modeId);
  }

  const blueprints = {
    [MODULE_IDS.CLIENTS]: [
      emptyStateBlueprint(
        'clients-empty',
        'No clients yet',
        'Client and AMC records used for internal order operations will appear here.',
        SHADOW_EMPTY_STATE_LANE.INTERNAL_OPERATIONS,
        ['clients'],
      ),
    ],
    [MODULE_IDS.TEAM_ACCESS]: [
      emptyStateBlueprint(
        'team-access-empty',
        'No team setup prompts',
        'Team invitation and access setup prompts will appear when a workspace needs them.',
        SHADOW_EMPTY_STATE_LANE.PLATFORM_ADMIN,
        ['team'],
      ),
    ],
    [MODULE_IDS.ASSIGNMENTS]: [
      emptyStateBlueprint(
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? 'vendor-no-packets'
          : 'amc-no-assignments',
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? 'No assignment packets'
          : 'No assignment work',
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? 'Assignment offers, active packet work, revisions, and submitted packet history will appear here.'
          : 'Vendor offers, accepted assignments, follow-up needs, and assignment exceptions will appear here.',
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? SHADOW_EMPTY_STATE_LANE.PACKET_EXECUTION
          : SHADOW_EMPTY_STATE_LANE.AMC_NETWORK,
        ['assignments', 'packets'],
      ),
    ],
    [MODULE_IDS.REVIEWS]: [
      emptyStateBlueprint(
        'reviews-empty',
        'No review work',
        'Internal review and QC work will appear here when orders require review.',
        SHADOW_EMPTY_STATE_LANE.INTERNAL_OPERATIONS,
        ['reviews', 'workflow'],
      ),
    ],
    [MODULE_IDS.CALENDAR]: [
      emptyStateBlueprint(
        'calendar-empty',
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL ? 'No packet deadlines' : 'No calendar pressure',
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? 'Assigned packet due dates and scheduling context will appear here.'
          : 'Site visits, due dates, and schedule pressure will appear here.',
        modeId === PRODUCT_MODE_IDS.VENDOR_PORTAL
          ? SHADOW_EMPTY_STATE_LANE.PACKET_EXECUTION
          : SHADOW_EMPTY_STATE_LANE.INTERNAL_OPERATIONS,
        ['calendar'],
      ),
    ],
    [MODULE_IDS.RELATIONSHIPS]: [
      emptyStateBlueprint(
        'relationships-empty',
        'No network relationships',
        'Vendor, review, support, or managed relationships will appear here after setup.',
        SHADOW_EMPTY_STATE_LANE.AMC_NETWORK,
        ['relationships', 'network'],
      ),
    ],
    [MODULE_IDS.AMC_OPERATIONS]: [
      emptyStateBlueprint(
        'amc-command-empty',
        'No AMC network attention',
        'Intake, assignment, vendor, client, review, and escalation attention will appear here.',
        SHADOW_EMPTY_STATE_LANE.AMC_NETWORK,
        ['amc', 'network'],
      ),
    ],
    [MODULE_IDS.VENDOR_PORTAL]: [
      emptyStateBlueprint(
        'vendor-workspace-empty',
        'No packet work',
        'Assigned packet offers, active work, revision requests, and completed packets will appear here.',
        SHADOW_EMPTY_STATE_LANE.PACKET_EXECUTION,
        ['vendor', 'packets'],
      ),
    ],
    [MODULE_IDS.CLIENT_PORTAL]: [
      emptyStateBlueprint(
        'client-portal-empty',
        'No request updates',
        'Request acknowledgements, status updates, messages, and delivered documents will appear here.',
        SHADOW_EMPTY_STATE_LANE.CLIENT_WORKSPACE,
        ['client', 'requests', 'status', 'documents'],
      ),
    ],
    [MODULE_IDS.REPORTS]: [
      emptyStateBlueprint(
        'reports-empty',
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL
          ? 'No delivered documents'
          : 'No reports yet',
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL
          ? 'Delivered reports and request documents will appear here.'
          : 'Operational reports and analytics exports will appear here when available.',
        modeId === PRODUCT_MODE_IDS.CLIENT_PORTAL
          ? SHADOW_EMPTY_STATE_LANE.CLIENT_WORKSPACE
          : SHADOW_EMPTY_STATE_LANE.INTELLIGENCE,
        ['reports', 'documents'],
      ),
    ],
    [MODULE_IDS.ANALYTICS]: [
      emptyStateBlueprint(
        'analytics-empty',
        'No analytics yet',
        'Operational analytics will appear when enabled and enough activity exists.',
        SHADOW_EMPTY_STATE_LANE.INTELLIGENCE,
        ['analytics'],
      ),
    ],
    [MODULE_IDS.AI_WORKSPACE]: [
      emptyStateBlueprint(
        'ai-empty',
        'No AI summaries',
        'AI-generated summaries and explanations will appear only after AI features are enabled.',
        SHADOW_EMPTY_STATE_LANE.INTELLIGENCE,
        ['ai'],
      ),
    ],
  };

  return blueprints[moduleId] ?? systemEmptyStateBlueprints(moduleId);
};

const createShadowEmptyState = (modeId, moduleDefinition, blueprint) =>
  Object.freeze({
    id: `${moduleDefinition.id}:${blueprint.id}`,
    emptyStateId: blueprint.id,
    title: blueprint.title,
    message: blueprint.message,
    lane: blueprint.lane,
    tags: blueprint.tags,
    moduleId: moduleDefinition.id,
    moduleLabel: moduleDefinition.label,
    category: moduleDefinition.category,
    registrationStatus: SHADOW_EMPTY_STATE_DIAGNOSTIC_STATUS.METADATA_ONLY,
    runtimeComposed: false,
    permissionDomains: Object.freeze([...moduleDefinition.permissionDomains]),
    permissionAuthority: SHADOW_EMPTY_STATE_AUTHORITY.NONE,
    permissionMetadataOnly: true,
    modeId,
  });

export const getShadowEmptyStatesForModuleIds = (moduleIds = [], modeId = null) =>
  Object.freeze(
    moduleIds.flatMap((moduleId) => {
      const moduleDefinition = getModuleMetadata(moduleId);

      if (!moduleDefinition) {
        return [];
      }

      return modeAwareEmptyStateBlueprints(modeId, moduleDefinition.id).map((blueprint) =>
        createShadowEmptyState(modeId, moduleDefinition, blueprint),
      );
    }),
  );

export const getShadowEmptyStateComposition = (modeId, additionalModuleIds = []) => {
  if (!isProductModeId(modeId)) {
    return Object.freeze({
      modeId,
      isKnownMode: false,
      moduleIds: Object.freeze([]),
      emptyStates: Object.freeze([]),
      emptyStatesByLane: Object.freeze({}),
      missingDependencyIds: Object.freeze([]),
      permissionAuthority: SHADOW_EMPTY_STATE_AUTHORITY.NONE,
      runtimeComposed: false,
      diagnostics: Object.freeze(['Unknown product mode; no shadow empty states generated.']),
    });
  }

  const moduleIds = composeProductModeModuleIds(modeId, additionalModuleIds);
  const emptyStates = getShadowEmptyStatesForModuleIds(moduleIds, modeId);
  const emptyStatesByLane = emptyStates.reduce((accumulator, emptyState) => {
    const existingEmptyStates = accumulator[emptyState.lane] ?? [];

    return {
      ...accumulator,
      [emptyState.lane]: Object.freeze([...existingEmptyStates, emptyState]),
    };
  }, {});

  return Object.freeze({
    modeId,
    isKnownMode: true,
    moduleIds,
    emptyStates,
    emptyStatesByLane: Object.freeze(emptyStatesByLane),
    missingDependencyIds: getMissingDependencyIds(moduleIds),
    permissionAuthority: SHADOW_EMPTY_STATE_AUTHORITY.NONE,
    runtimeComposed: false,
    diagnostics: Object.freeze([
      'Shadow empty states are diagnostic metadata only.',
      'Permission domains describe future empty-state gates but do not authorize visibility here.',
    ]),
  });
};

export const getShadowEmptyStateIds = (modeId, additionalModuleIds = []) =>
  getShadowEmptyStateComposition(modeId, additionalModuleIds).emptyStates.map(
    (emptyState) => emptyState.emptyStateId,
  );
