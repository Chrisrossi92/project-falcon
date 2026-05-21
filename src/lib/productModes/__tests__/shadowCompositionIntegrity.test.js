import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SHADOW_COMMAND_AUTHORITY,
  SHADOW_COMMAND_LANE,
  getShadowCommandEntriesForModuleIds,
  getShadowCommandPaletteComposition,
} from '../../commandPalette/commandPaletteComposition.js';
import {
  SHADOW_DASHBOARD_AUTHORITY,
  SHADOW_DASHBOARD_LANE,
  getShadowDashboardComposition,
  getShadowDashboardItemsForModuleIds,
} from '../../dashboard/dashboardComposition.js';
import {
  SHADOW_EMPTY_STATE_AUTHORITY,
  SHADOW_EMPTY_STATE_LANE,
  getShadowEmptyStateComposition,
  getShadowEmptyStatesForModuleIds,
} from '../../emptyStates/emptyStateComposition.js';
import {
  composeProductModeModuleIds,
  describeProductModeComposition,
} from '../../modules/moduleHelpers.js';
import { MODULE_ID_LIST, MODULE_IDS } from '../../modules/moduleRegistry.js';
import {
  SHADOW_NAV_AUTHORITY,
  getShadowNavigationComposition,
  getShadowNavigationEntriesForModuleIds,
} from '../../navigation/navigationComposition.js';
import {
  SHADOW_UPGRADE_AUTHORITY,
  SHADOW_UPGRADE_CONTEXT,
  getShadowUpgradePromptComposition,
  getShadowUpgradePromptsForModuleIds,
} from '../../upgrades/upgradePromptComposition.js';
import { PRODUCT_MODE_ORDER, PRODUCT_MODE_IDS } from '../productModes.js';

const ACTIVE_APP_SURFACE_PATHS = Object.freeze([
  'src/components',
  'src/features',
  'src/pages',
  'src/routes',
  'src/layout',
  'src/App.jsx',
]);

const SHADOW_IMPORT_PATTERNS = Object.freeze([
  'navigationComposition',
  'commandPaletteComposition',
  'dashboardComposition',
  'emptyStateComposition',
  'upgradePromptComposition',
  'SHADOW_NAV_',
  'SHADOW_COMMAND_',
  'SHADOW_DASHBOARD_',
  'SHADOW_EMPTY_STATE_',
  'SHADOW_UPGRADE_',
]);

const DIAGNOSTIC_SURFACE_ALLOWLIST = Object.freeze([
  'src/pages/admin/ProductMetadataDiagnostics.jsx',
]);

const collectFiles = (path) => {
  if (!existsSync(path)) {
    return [];
  }

  if (statSync(path).isFile()) {
    return [path];
  }

  return readdirSync(path).flatMap((entry) => collectFiles(join(path, entry)));
};

const textForEntries = (entries) =>
  entries
    .flatMap((entry) => [
      entry.id,
      entry.commandId,
      entry.dashboardItemId,
      entry.emptyStateId,
      entry.label,
      entry.title,
      entry.message,
      ...(entry.tags ?? []),
    ])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const getModeDiagnostics = (modeId, additionalModuleIds = []) => ({
  nav: getShadowNavigationComposition(modeId, additionalModuleIds),
  command: getShadowCommandPaletteComposition(modeId, additionalModuleIds),
  dashboard: getShadowDashboardComposition(modeId, additionalModuleIds),
  emptyState: getShadowEmptyStateComposition(modeId, additionalModuleIds),
  upgrade: getShadowUpgradePromptComposition(modeId),
});

const expectMetadataOnlyPermissions = (entries, authority) => {
  entries.forEach((entry) => {
    expect(entry).toMatchObject({
      runtimeComposed: false,
      permissionAuthority: authority,
      permissionMetadataOnly: true,
    });
    expect(Array.isArray(entry.permissionDomains)).toBe(true);
  });
};

describe('shadow composition integrity guard', () => {
  it('keeps all product mode module compositions valid and dependency-complete', () => {
    PRODUCT_MODE_ORDER.forEach((modeId) => {
      const moduleIds = composeProductModeModuleIds(modeId);
      const composition = describeProductModeComposition(modeId);

      expect(moduleIds.length).toBeGreaterThan(0);
      expect(moduleIds).toContain(MODULE_IDS.CORE_WORKSPACE);
      expect(moduleIds).toContain(MODULE_IDS.DASHBOARD);
      expect(moduleIds.every((moduleId) => MODULE_ID_LIST.includes(moduleId))).toBe(true);
      expect(composition).toMatchObject({
        modeId,
        runtimeComposed: false,
        missingDependencyIds: [],
      });
    });
  });

  it('only references module ids that exist in the module registry', () => {
    PRODUCT_MODE_ORDER.forEach((modeId) => {
      const diagnostics = getModeDiagnostics(modeId);
      const referencedModuleIds = [
        ...diagnostics.nav.entries.map(({ moduleId }) => moduleId),
        ...diagnostics.command.entries.map(({ moduleId }) => moduleId),
        ...diagnostics.dashboard.items.map(({ moduleId }) => moduleId),
        ...diagnostics.emptyState.emptyStates.map(({ moduleId }) => moduleId),
        ...diagnostics.upgrade.prompts.map(({ moduleId }) => moduleId),
      ];

      expect(referencedModuleIds.length).toBeGreaterThan(0);
      expect(referencedModuleIds.every((moduleId) => MODULE_ID_LIST.includes(moduleId))).toBe(
        true,
      );
    });
  });

  it('keeps Vendor diagnostics free of canonical order/client/admin/review surfaces', () => {
    const diagnostics = getModeDiagnostics(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const visibleNavModuleIds = diagnostics.nav.visibleEntries.map(({ moduleId }) => moduleId);
    const commandText = textForEntries(diagnostics.command.entries);
    const dashboardText = textForEntries(diagnostics.dashboard.items);
    const emptyStateText = textForEntries(diagnostics.emptyState.emptyStates);

    expect(visibleNavModuleIds).not.toEqual(
      expect.arrayContaining([
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.TEAM_ACCESS,
        MODULE_IDS.REVIEWS,
        MODULE_IDS.AMC_OPERATIONS,
        MODULE_IDS.TENANT_ADMIN,
      ]),
    );
    expect(commandText).not.toMatch(/open orders|open clients|review queue|amc command/);
    expect(dashboardText).not.toMatch(/active order attention|client operational|review \/ qc/);
    expect(emptyStateText).not.toMatch(/staff-no-orders|clients-empty|reviews-empty/);
  });

  it('keeps Client diagnostics free of internal workflow, review, vendor, and packet surfaces', () => {
    const diagnostics = getModeDiagnostics(PRODUCT_MODE_IDS.CLIENT_PORTAL);
    const visibleNavModuleIds = diagnostics.nav.visibleEntries.map(({ moduleId }) => moduleId);
    const commandText = textForEntries(diagnostics.command.entries);
    const dashboardText = textForEntries(diagnostics.dashboard.items);
    const emptyStateText = textForEntries(diagnostics.emptyState.emptyStates);
    const upgradeText = textForEntries(diagnostics.upgrade.prompts);

    expect(visibleNavModuleIds).not.toEqual(
      expect.arrayContaining([
        MODULE_IDS.CLIENTS,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.REVIEWS,
        MODULE_IDS.AMC_OPERATIONS,
        MODULE_IDS.VENDOR_PORTAL,
      ]),
    );
    expect(commandText).not.toMatch(/review queue|vendor workspace|assignment packets/);
    expect(dashboardText).not.toMatch(/review \/ qc|vendor packet|assignment sla/);
    expect(emptyStateText).not.toMatch(/review work|vendor-workspace|assignment exceptions/);
    expect(upgradeText).not.toMatch(/vendor operations|assignment packet|review queue/);
  });

  it('preserves Hybrid lane separation across diagnostics', () => {
    const diagnostics = getModeDiagnostics(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.CLIENTS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.RELATIONSHIPS,
      MODULE_IDS.CLIENT_PORTAL,
    ]);

    expect(Object.keys(diagnostics.command.entriesByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        SHADOW_COMMAND_LANE.CLIENT_WORKSPACE,
      ]),
    );
    expect(Object.keys(diagnostics.dashboard.itemsByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS,
        SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS,
        SHADOW_DASHBOARD_LANE.CLIENT_WORKSPACE,
      ]),
    );
    expect(Object.keys(diagnostics.emptyState.emptyStatesByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_EMPTY_STATE_LANE.INTERNAL_OPERATIONS,
        SHADOW_EMPTY_STATE_LANE.AMC_NETWORK,
        SHADOW_EMPTY_STATE_LANE.CLIENT_WORKSPACE,
      ]),
    );
    expect(Object.keys(diagnostics.upgrade.promptsByContext)).toEqual(
      expect.arrayContaining([
        SHADOW_UPGRADE_CONTEXT.OPERATIONAL_EXPANSION,
        SHADOW_UPGRADE_CONTEXT.NETWORK_EXPANSION,
        SHADOW_UPGRADE_CONTEXT.CLIENT_WORKSPACE,
      ]),
    );
  });

  it('keeps permission keys and domains diagnostic-only across shadow registries', () => {
    PRODUCT_MODE_ORDER.forEach((modeId) => {
      const diagnostics = getModeDiagnostics(modeId);

      expect(diagnostics.nav.permissionAuthority).toBe(SHADOW_NAV_AUTHORITY.NONE);
      expect(diagnostics.command.permissionAuthority).toBe(SHADOW_COMMAND_AUTHORITY.NONE);
      expect(diagnostics.dashboard.permissionAuthority).toBe(SHADOW_DASHBOARD_AUTHORITY.NONE);
      expect(diagnostics.emptyState.permissionAuthority).toBe(SHADOW_EMPTY_STATE_AUTHORITY.NONE);
      expect(diagnostics.upgrade.permissionAuthority).toBe(SHADOW_UPGRADE_AUTHORITY.NONE);
      expect(diagnostics.upgrade.billingAuthority).toBe(SHADOW_UPGRADE_AUTHORITY.NONE);

      expectMetadataOnlyPermissions(diagnostics.nav.entries, SHADOW_NAV_AUTHORITY.NONE);
      expectMetadataOnlyPermissions(diagnostics.command.entries, SHADOW_COMMAND_AUTHORITY.NONE);
      expectMetadataOnlyPermissions(diagnostics.dashboard.items, SHADOW_DASHBOARD_AUTHORITY.NONE);
      expectMetadataOnlyPermissions(
        diagnostics.emptyState.emptyStates,
        SHADOW_EMPTY_STATE_AUTHORITY.NONE,
      );
      expectMetadataOnlyPermissions(diagnostics.upgrade.prompts, SHADOW_UPGRADE_AUTHORITY.NONE);
      diagnostics.upgrade.prompts.forEach((prompt) => {
        expect(prompt).toMatchObject({
          billingAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
          billingMetadataOnly: true,
        });
      });
    });
  });

  it('returns safe empty diagnostics for unknown mode and module inputs', () => {
    expect(getShadowNavigationComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      entries: [],
      runtimeComposed: false,
    });
    expect(getShadowCommandPaletteComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      entries: [],
      runtimeComposed: false,
    });
    expect(getShadowDashboardComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      items: [],
      runtimeComposed: false,
    });
    expect(getShadowEmptyStateComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      emptyStates: [],
      runtimeComposed: false,
    });
    expect(getShadowUpgradePromptComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      prompts: [],
      runtimeComposed: false,
    });

    expect(getShadowNavigationEntriesForModuleIds(['unknown_module'])).toEqual([]);
    expect(getShadowCommandEntriesForModuleIds(['unknown_module'])).toEqual([]);
    expect(getShadowDashboardItemsForModuleIds(['unknown_module'])).toEqual([]);
    expect(getShadowEmptyStatesForModuleIds(['unknown_module'])).toEqual([]);
    expect(
      getShadowUpgradePromptsForModuleIds(PRODUCT_MODE_IDS.STAFF_APPRAISAL, [
        'unknown_module',
      ]),
    ).toEqual([]);
  });

  it('does not import shadow composition modules from active app surfaces', () => {
    const matches = ACTIVE_APP_SURFACE_PATHS.flatMap((surfacePath) =>
      collectFiles(surfacePath).flatMap((filePath) => {
        if (DIAGNOSTIC_SURFACE_ALLOWLIST.includes(filePath)) {
          return [];
        }

        const fileContents = readFileSync(filePath, 'utf8');
        const matchedPattern = SHADOW_IMPORT_PATTERNS.find((pattern) =>
          fileContents.includes(pattern),
        );

        return matchedPattern ? [`${filePath}:${matchedPattern}`] : [];
      }),
    );

    expect(matches).toEqual([]);
  });
});
