import { describe, expect, it } from 'vitest';

import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  DASHBOARD_REGISTRATION_KINDS,
  MODULE_BUNDLE_TYPES,
  MODULE_ID_LIST,
  MODULE_IDS,
  MODULE_IMPLEMENTATION_STATUS,
  MODULE_REGISTRY,
  MODULE_REGISTRY_LIST,
  NAV_REGISTRATION_KINDS,
} from '../moduleRegistry.js';
import {
  MODULE_CATEGORY_IDS,
  MODULE_CATEGORY_ORDER,
  isModuleCategoryId,
} from '../moduleCategories.js';

describe('module registry metadata', () => {
  it('defines canonical categories and recognizes only known category ids', () => {
    expect(MODULE_CATEGORY_ORDER).toEqual([
      MODULE_CATEGORY_IDS.SYSTEM,
      MODULE_CATEGORY_IDS.CORE_OPERATIONS,
      MODULE_CATEGORY_IDS.NETWORK_ECOSYSTEM,
      MODULE_CATEGORY_IDS.INTELLIGENCE,
      MODULE_CATEGORY_IDS.PLATFORM_ADMIN,
    ]);
    expect(isModuleCategoryId(MODULE_CATEGORY_IDS.SYSTEM)).toBe(true);
    expect(isModuleCategoryId('unknown')).toBe(false);
    expect(isModuleCategoryId(null)).toBe(false);
  });

  it('keeps registry list and id list aligned', () => {
    expect(MODULE_ID_LIST).toEqual(Object.keys(MODULE_REGISTRY));
    expect(MODULE_REGISTRY_LIST.map((moduleDefinition) => moduleDefinition.id)).toEqual(
      MODULE_ID_LIST,
    );
  });

  it('defines complete metadata and future-safe registration shapes for every module', () => {
    MODULE_REGISTRY_LIST.forEach((moduleDefinition) => {
      expect(moduleDefinition).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        category: expect.any(String),
        status: expect.any(String),
        bundleType: expect.any(String),
        navRegistration: {
          ownerModuleId: moduleDefinition.id,
          registrationStatus: 'metadata_only',
          runtimeComposed: false,
        },
        dashboardRegistration: {
          ownerModuleId: moduleDefinition.id,
          registrationStatus: 'metadata_only',
          runtimeComposed: false,
        },
      });
      expect(Object.values(MODULE_CATEGORY_IDS)).toContain(moduleDefinition.category);
      expect(Object.values(MODULE_IMPLEMENTATION_STATUS)).toContain(moduleDefinition.status);
      expect(Object.values(MODULE_BUNDLE_TYPES)).toContain(moduleDefinition.bundleType);
      expect(Object.values(NAV_REGISTRATION_KINDS)).toContain(
        moduleDefinition.navRegistration.kind,
      );
      expect(Object.values(DASHBOARD_REGISTRATION_KINDS)).toContain(
        moduleDefinition.dashboardRegistration.kind,
      );
      expect(Array.isArray(moduleDefinition.dependencies)).toBe(true);
      expect(Array.isArray(moduleDefinition.defaultProductModes)).toBe(true);
      expect(Array.isArray(moduleDefinition.permissionDomains)).toBe(true);
    });
  });

  it('keeps portal and AMC module defaults scoped to intended product modes', () => {
    expect(MODULE_REGISTRY[MODULE_IDS.VENDOR_PORTAL].defaultProductModes).toEqual([
      PRODUCT_MODE_IDS.VENDOR_PORTAL,
      PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM,
    ]);
    expect(MODULE_REGISTRY[MODULE_IDS.CLIENT_PORTAL].defaultProductModes).toEqual([
      PRODUCT_MODE_IDS.CLIENT_PORTAL,
      PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM,
    ]);
    expect(MODULE_REGISTRY[MODULE_IDS.AMC_OPERATIONS].dependencies).toEqual(
      expect.arrayContaining([
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.RELATIONSHIPS,
      ]),
    );
  });
});
