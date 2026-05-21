import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import { CURRENT_NAV_AUTHORITY } from '../currentNavigationRegistry.js';
import {
  NAV_PARITY_AUTHORITY,
  NAV_PARITY_STATUS,
  getCurrentLiveNavigationModuleIds,
  getNavigationParityDiagnostics,
} from '../navigationParityDiagnostics.js';

const moduleIdsFor = (entries) => entries.map(({ moduleId }) => moduleId);

describe('current live navigation vs shadow navigation parity diagnostics', () => {
  it('reports Staff/default parity against current live nav without runtime authority', () => {
    const parity = getNavigationParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    expect(parity).toMatchObject({
      isKnownMode: true,
      runtimeComposed: false,
      hasErrors: false,
      permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
      metadataAuthority: CURRENT_NAV_AUTHORITY.DESCRIPTIVE_ONLY,
    });
    expect(moduleIdsFor(parity.matches)).toEqual(
      expect.arrayContaining([
        MODULE_IDS.DASHBOARD,
        MODULE_IDS.NOTIFICATIONS,
        MODULE_IDS.ACTIVITY,
        MODULE_IDS.SETTINGS,
        MODULE_IDS.ORDERS,
        MODULE_IDS.CLIENTS,
        MODULE_IDS.TEAM_ACCESS,
        MODULE_IDS.CALENDAR,
      ]),
    );
  });

  it('keeps Vendor and Client future concepts out of the current live registry', () => {
    const liveModuleIds = getCurrentLiveNavigationModuleIds();
    const vendorParity = getNavigationParityDiagnostics(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const clientParity = getNavigationParityDiagnostics(PRODUCT_MODE_IDS.CLIENT_PORTAL);

    expect(liveModuleIds).not.toContain(MODULE_IDS.VENDOR_PORTAL);
    expect(liveModuleIds).not.toContain(MODULE_IDS.CLIENT_PORTAL);
    expect(moduleIdsFor(vendorParity.futureOnlyEntries)).toEqual(
      expect.arrayContaining([MODULE_IDS.VENDOR_PORTAL]),
    );
    expect(moduleIdsFor(clientParity.futureOnlyEntries)).toEqual(
      expect.arrayContaining([MODULE_IDS.CLIENT_PORTAL, MODULE_IDS.REPORTS]),
    );
  });

  it('reports live-only entries as diagnostic gaps, not errors', () => {
    const parity = getNavigationParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const liveOnlyModuleIds = moduleIdsFor(parity.liveOnlyEntries);

    expect(liveOnlyModuleIds).toEqual(
      expect.arrayContaining([MODULE_IDS.ASSIGNMENTS, MODULE_IDS.RELATIONSHIPS]),
    );
    parity.liveOnlyEntries.forEach((entry) => {
      expect(entry).toMatchObject({
        status: NAV_PARITY_STATUS.LIVE_ONLY_DIAGNOSTIC_GAP,
        diagnosticOnly: true,
        fatal: false,
        permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
      });
    });
    expect(parity.hasErrors).toBe(false);
  });

  it('reports shadow-only entries as future gaps, not errors', () => {
    const parity = getNavigationParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    expect(moduleIdsFor(parity.shadowOnlyEntries)).toEqual(
      expect.arrayContaining([MODULE_IDS.REVIEWS]),
    );
    expect(parity.futureOnlyEntries).toEqual(parity.shadowOnlyEntries);
    parity.shadowOnlyEntries.forEach((entry) => {
      expect(entry).toMatchObject({
        status: NAV_PARITY_STATUS.SHADOW_ONLY_FUTURE_GAP,
        diagnosticOnly: true,
        fatal: false,
        permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
      });
    });
    expect(parity.hasErrors).toBe(false);
  });

  it('keeps the product metadata diagnostics route diagnostic-only', () => {
    const parity = getNavigationParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const diagnosticEntry = parity.diagnosticRouteEntries.find(
      (entry) => entry.id === 'settings.productMetadataDiagnostics',
    );

    expect(diagnosticEntry).toMatchObject({
      diagnostic: true,
      path: '/settings/product-metadata-diagnostics',
      productModeAware: false,
      metadataAuthority: CURRENT_NAV_AUTHORITY.DESCRIPTIVE_ONLY,
    });
    expect(diagnosticEntry.command).toBeNull();
  });

  it('keeps permission metadata non-authoritative across parity output', () => {
    const parity = getNavigationParityDiagnostics(PRODUCT_MODE_IDS.AMC_OPERATIONS);

    expect(parity.permissionAuthority).toBe(NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY);
    expect(parity.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission metadata remains descriptive; route and action guards remain authoritative.',
      ]),
    );
    [...parity.matches, ...parity.liveOnlyEntries, ...parity.shadowOnlyEntries].forEach(
      (entry) => {
        expect(entry.permissionAuthority).toBe(NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY);
        expect(entry.diagnosticOnly).toBe(true);
      },
    );
  });

  it('returns safe empty parity diagnostics for unknown modes', () => {
    const parity = getNavigationParityDiagnostics('unknown_mode');

    expect(parity).toMatchObject({
      modeId: 'unknown_mode',
      isKnownMode: false,
      runtimeComposed: false,
      hasErrors: false,
      permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    });
    expect(parity.matches).toEqual([]);
    expect(parity.liveOnlyEntries).toEqual([]);
    expect(parity.shadowOnlyEntries).toEqual([]);
    expect(parity.futureOnlyEntries).toEqual([]);
    expect(parity.diagnostics).toEqual(
      expect.arrayContaining([
        'Unknown product mode; no current-live/shadow navigation parity diagnostics generated.',
      ]),
    );
  });
});
