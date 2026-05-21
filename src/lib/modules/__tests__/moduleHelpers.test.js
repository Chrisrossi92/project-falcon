import { describe, expect, it } from 'vitest';

import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import { MODULE_CATEGORY_IDS } from '../moduleCategories.js';
import {
  MODULE_BUNDLE_TYPES,
  MODULE_IDS,
  MODULE_REGISTRY,
} from '../moduleRegistry.js';
import {
  composeProductModeModuleIds,
  describeProductModeComposition,
  getHiddenModulesForProductMode,
  getMetadataOnlyDashboardRegistrations,
  getMetadataOnlyNavRegistrations,
  getMissingDependencyIds,
  getModuleDependencyIds,
  getModuleMetadata,
  getModulesByBundleType,
  getModulesByCategory,
  getModulesForProductMode,
  getOptionalModulesForProductMode,
  getProductModeMetadata,
  getSystemModules,
  hasModuleDependencyCoverage,
} from '../moduleHelpers.js';

const SYSTEM_MODULE_IDS = [
  MODULE_IDS.CORE_WORKSPACE,
  MODULE_IDS.DASHBOARD,
  MODULE_IDS.NOTIFICATIONS,
  MODULE_IDS.ACTIVITY,
  MODULE_IDS.SETTINGS,
];

describe('module metadata helpers', () => {
  it('looks up known metadata and returns safe null for unknown values', () => {
    expect(getModuleMetadata(MODULE_IDS.ORDERS)).toBe(MODULE_REGISTRY[MODULE_IDS.ORDERS]);
    expect(getProductModeMetadata(PRODUCT_MODE_IDS.STAFF_APPRAISAL)?.id).toBe(
      PRODUCT_MODE_IDS.STAFF_APPRAISAL,
    );
    expect(getModuleMetadata('missing')).toBeNull();
    expect(getModuleMetadata(null)).toBeNull();
    expect(getProductModeMetadata('missing')).toBeNull();
    expect(getProductModeMetadata(null)).toBeNull();
  });

  it('filters modules by category and bundle type', () => {
    expect(getModulesByCategory(MODULE_CATEGORY_IDS.SYSTEM).map(({ id }) => id)).toEqual(
      SYSTEM_MODULE_IDS,
    );
    expect(getModulesByBundleType(MODULE_BUNDLE_TYPES.SYSTEM).map(({ id }) => id)).toEqual(
      SYSTEM_MODULE_IDS,
    );
    expect(getSystemModules().map(({ id }) => id)).toEqual(SYSTEM_MODULE_IDS);
  });

  it('composes included and additional modules while ignoring unknown ids', () => {
    const staffModuleIds = composeProductModeModuleIds(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const staffWithAi = composeProductModeModuleIds(PRODUCT_MODE_IDS.STAFF_APPRAISAL, [
      MODULE_IDS.AI_WORKSPACE,
      'unknown',
    ]);

    expect(staffModuleIds).toEqual(
      expect.arrayContaining([
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.TEAM_ACCESS,
      ]),
    );
    expect(staffWithAi).toContain(MODULE_IDS.AI_WORKSPACE);
    expect(staffWithAi).not.toContain('unknown');
    expect(composeProductModeModuleIds('unknown')).toEqual([]);
  });

  it('keeps system modules present across canonical mode compositions', () => {
    Object.values(PRODUCT_MODE_IDS).forEach((modeId) => {
      const moduleIds = getModulesForProductMode(modeId).map(({ id }) => id);

      SYSTEM_MODULE_IDS.forEach((systemModuleId) => {
        expect(moduleIds).toContain(systemModuleId);
      });
    });
  });

  it('keeps Vendor and Client defaults free of Staff/AMC-only modules unless intentional', () => {
    const vendorModuleIds = getModulesForProductMode(PRODUCT_MODE_IDS.VENDOR_PORTAL).map(
      ({ id }) => id,
    );
    const clientModuleIds = getModulesForProductMode(PRODUCT_MODE_IDS.CLIENT_PORTAL).map(
      ({ id }) => id,
    );

    expect(vendorModuleIds).toContain(MODULE_IDS.ASSIGNMENTS);
    expect(vendorModuleIds).toContain(MODULE_IDS.VENDOR_PORTAL);
    expect(vendorModuleIds).not.toContain(MODULE_IDS.CLIENTS);
    expect(vendorModuleIds).not.toContain(MODULE_IDS.AMC_OPERATIONS);
    expect(vendorModuleIds).not.toContain(MODULE_IDS.REVIEWS);

    expect(clientModuleIds).toContain(MODULE_IDS.CLIENT_PORTAL);
    expect(clientModuleIds).toContain(MODULE_IDS.ORDERS);
    expect(clientModuleIds).not.toContain(MODULE_IDS.CLIENTS);
    expect(clientModuleIds).not.toContain(MODULE_IDS.ASSIGNMENTS);
    expect(clientModuleIds).not.toContain(MODULE_IDS.REVIEWS);
    expect(clientModuleIds).not.toContain(MODULE_IDS.AMC_OPERATIONS);
  });

  it('returns safe empty arrays for unknown mode list helpers', () => {
    expect(getModulesForProductMode('unknown')).toEqual([]);
    expect(getOptionalModulesForProductMode('unknown')).toEqual([]);
    expect(getHiddenModulesForProductMode('unknown')).toEqual([]);
  });

  it('reports dependency failures without throwing', () => {
    expect(getModuleDependencyIds(MODULE_IDS.AMC_OPERATIONS)).toEqual(
      expect.arrayContaining([
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.RELATIONSHIPS,
      ]),
    );
    expect(() => getMissingDependencyIds([MODULE_IDS.AMC_OPERATIONS])).not.toThrow();
    expect(getMissingDependencyIds([MODULE_IDS.AMC_OPERATIONS])).toEqual(
      expect.arrayContaining([
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.RELATIONSHIPS,
      ]),
    );
    expect(hasModuleDependencyCoverage([MODULE_IDS.AMC_OPERATIONS])).toBe(false);
    expect(
      hasModuleDependencyCoverage(composeProductModeModuleIds(PRODUCT_MODE_IDS.AMC_OPERATIONS)),
    ).toBe(true);
  });

  it('extracts metadata-only nav and dashboard registrations', () => {
    const moduleIds = [MODULE_IDS.DASHBOARD, MODULE_IDS.ORDERS, 'unknown'];
    const navRegistrations = getMetadataOnlyNavRegistrations(moduleIds);
    const dashboardRegistrations = getMetadataOnlyDashboardRegistrations(moduleIds);

    expect(navRegistrations).toHaveLength(2);
    expect(dashboardRegistrations).toHaveLength(2);
    navRegistrations.forEach((registration) => {
      expect(registration).toMatchObject({
        registrationStatus: 'metadata_only',
        runtimeComposed: false,
      });
    });
    dashboardRegistrations.forEach((registration) => {
      expect(registration).toMatchObject({
        registrationStatus: 'metadata_only',
        runtimeComposed: false,
      });
    });
  });

  it('describes product mode composition safely', () => {
    const composition = describeProductModeComposition(PRODUCT_MODE_IDS.VENDOR_PORTAL);

    expect(composition).toMatchObject({
      modeId: PRODUCT_MODE_IDS.VENDOR_PORTAL,
      runtimeComposed: false,
      missingDependencyIds: [],
    });
    expect(composition.moduleIds).toContain(MODULE_IDS.VENDOR_PORTAL);
    expect(composition.navRegistrations.length).toBeGreaterThan(0);
    expect(composition.dashboardRegistrations.length).toBeGreaterThan(0);
    expect(describeProductModeComposition('unknown')).toBeNull();
  });
});
