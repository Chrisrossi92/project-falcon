import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  SHADOW_NAV_AUTHORITY,
  SHADOW_NAV_DIAGNOSTIC_STATUS,
  SHADOW_NAV_VISIBILITY,
  getShadowNavigationComposition,
  getShadowNavigationEntriesForModuleIds,
  getShadowNavigationModuleIds,
} from '../navigationComposition.js';

const visibleModuleIdsForMode = (modeId, additionalModuleIds) =>
  getShadowNavigationModuleIds(modeId, additionalModuleIds);

describe('shadow navigation composition diagnostics', () => {
  it('generates Staff-appropriate nav metadata without runtime composition', () => {
    const composition = getShadowNavigationComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const moduleIds = composition.visibleEntries.map(({ moduleId }) => moduleId);

    expect(composition).toMatchObject({
      isKnownMode: true,
      permissionAuthority: SHADOW_NAV_AUTHORITY.NONE,
      runtimeComposed: false,
    });
    expect(moduleIds).toEqual(
      expect.arrayContaining([
        MODULE_IDS.DASHBOARD,
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.TEAM_ACCESS,
        MODULE_IDS.REVIEWS,
        MODULE_IDS.CALENDAR,
      ]),
    );
    expect(composition.expectedNavLabels).toEqual(
      expect.arrayContaining(['Dashboard', 'Orders', 'Calendar', 'Clients', 'Team Access']),
    );
  });

  it('keeps Vendor Portal nav free of canonical Orders, Clients, and admin surfaces', () => {
    const moduleIds = visibleModuleIdsForMode(PRODUCT_MODE_IDS.VENDOR_PORTAL);

    expect(moduleIds).toEqual(
      expect.arrayContaining([
        MODULE_IDS.DASHBOARD,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.VENDOR_PORTAL,
        MODULE_IDS.CALENDAR,
      ]),
    );
    expect(moduleIds).not.toContain(MODULE_IDS.ORDERS);
    expect(moduleIds).not.toContain(MODULE_IDS.CLIENTS);
    expect(moduleIds).not.toContain(MODULE_IDS.TEAM_ACCESS);
    expect(moduleIds).not.toContain(MODULE_IDS.TENANT_ADMIN);
    expect(moduleIds).not.toContain(MODULE_IDS.AMC_OPERATIONS);
  });

  it('keeps Client Portal nav free of internal workflow, review, and vendor surfaces', () => {
    const composition = getShadowNavigationComposition(PRODUCT_MODE_IDS.CLIENT_PORTAL);
    const moduleIds = composition.visibleEntries.map(({ moduleId }) => moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining([
        MODULE_IDS.DASHBOARD,
        MODULE_IDS.CLIENT_PORTAL,
        MODULE_IDS.REPORTS,
        MODULE_IDS.ORDERS,
      ]),
    );
    expect(moduleIds).not.toContain(MODULE_IDS.CLIENTS);
    expect(moduleIds).not.toContain(MODULE_IDS.ASSIGNMENTS);
    expect(moduleIds).not.toContain(MODULE_IDS.REVIEWS);
    expect(moduleIds).not.toContain(MODULE_IDS.AMC_OPERATIONS);
    expect(moduleIds).not.toContain(MODULE_IDS.VENDOR_PORTAL);
    expect(composition.expectedNavLabels).toEqual(
      expect.arrayContaining(['Submit Request', 'My Requests', 'Documents / Reports']),
    );
  });

  it('includes AMC and network concepts for AMC Operations mode', () => {
    const composition = getShadowNavigationComposition(PRODUCT_MODE_IDS.AMC_OPERATIONS);
    const moduleIds = composition.visibleEntries.map(({ moduleId }) => moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining([
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.RELATIONSHIPS,
        MODULE_IDS.REVIEWS,
        MODULE_IDS.AMC_OPERATIONS,
      ]),
    );
    expect(composition.expectedNavLabels).toEqual(
      expect.arrayContaining(['AMC Dashboard', 'Assignments', 'Vendor Panel']),
    );
  });

  it('separates internal and network lanes for Hybrid / Ecosystem mode diagnostics', () => {
    const composition = getShadowNavigationComposition(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.RELATIONSHIPS,
      MODULE_IDS.VENDOR_PORTAL,
      MODULE_IDS.CLIENT_PORTAL,
    ]);
    const moduleIds = composition.visibleEntries.map(({ moduleId }) => moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining([
        MODULE_IDS.ORDERS,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.RELATIONSHIPS,
        MODULE_IDS.VENDOR_PORTAL,
        MODULE_IDS.CLIENT_PORTAL,
      ]),
    );
    expect(composition.expectedNavLabels).toEqual(
      expect.arrayContaining(['Internal Operations', 'Network Work', 'Sent Assignments']),
    );
  });

  it('handles hidden and unknown modules without throwing', () => {
    expect(() =>
      getShadowNavigationEntriesForModuleIds([MODULE_IDS.CORE_WORKSPACE, 'unknown']),
    ).not.toThrow();

    const entries = getShadowNavigationEntriesForModuleIds([
      MODULE_IDS.CORE_WORKSPACE,
      'unknown',
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      moduleId: MODULE_IDS.CORE_WORKSPACE,
      visibility: SHADOW_NAV_VISIBILITY.HIDDEN_METADATA,
      visibleInShadowNav: false,
    });

    expect(getShadowNavigationComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      entries: [],
      visibleEntries: [],
      hiddenEntries: [],
      runtimeComposed: false,
    });
  });

  it('marks permission keys as diagnostic metadata only', () => {
    const composition = getShadowNavigationComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    composition.entries.forEach((entry) => {
      expect(entry).toMatchObject({
        registrationStatus: SHADOW_NAV_DIAGNOSTIC_STATUS.METADATA_ONLY,
        runtimeComposed: false,
        permissionAuthority: SHADOW_NAV_AUTHORITY.NONE,
        permissionMetadataOnly: true,
      });
      expect(Array.isArray(entry.permissionDomains)).toBe(true);
    });

    expect(composition.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission domains describe future route/nav gates but do not authorize visibility here.',
      ]),
    );
  });
});
