import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  SHADOW_DASHBOARD_AUTHORITY,
  SHADOW_DASHBOARD_DIAGNOSTIC_STATUS,
  SHADOW_DASHBOARD_LANE,
  getShadowDashboardComposition,
  getShadowDashboardItemIds,
  getShadowDashboardItemsForModuleIds,
} from '../dashboardComposition.js';

describe('shadow dashboard composition diagnostics', () => {
  it('generates Staff operational cockpit dashboard metadata', () => {
    const composition = getShadowDashboardComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const itemIds = composition.items.map(({ dashboardItemId }) => dashboardItemId);

    expect(composition.shell).toMatchObject({
      name: 'Staff Operations Dashboard',
      registrationStatus: SHADOW_DASHBOARD_DIAGNOSTIC_STATUS.METADATA_ONLY,
      runtimeComposed: false,
    });
    expect(itemIds).toEqual(
      expect.arrayContaining([
        'active-order-attention',
        'due-soon-overdue',
        'client-operational-summary',
        'review-qc-queue',
        'calendar-pressure',
      ]),
    );
    expect(composition.expectedSections).toEqual(
      expect.arrayContaining(['Active order attention queue', 'Appraiser workload']),
    );
  });

  it('generates AMC network command center dashboard metadata', () => {
    const composition = getShadowDashboardComposition(PRODUCT_MODE_IDS.AMC_OPERATIONS);
    const itemIds = composition.items.map(({ dashboardItemId }) => dashboardItemId);

    expect(composition.shell.name).toBe('AMC Network Operations Dashboard');
    expect(itemIds).toEqual(
      expect.arrayContaining([
        'amc-intake-unassigned',
        'client-lender-exceptions',
        'assignment-sla-pressure',
        'relationship-attention',
        'review-qc-queue',
        'amc-network-command-center',
      ]),
    );
    expect(composition.itemsByLane[SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS].length).toBeGreaterThan(
      0,
    );
  });

  it('generates Vendor packet execution dashboard metadata', () => {
    const composition = getShadowDashboardComposition(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const itemIds = composition.items.map(({ dashboardItemId }) => dashboardItemId);

    expect(composition.shell.name).toBe('Assignment Packet Dashboard');
    expect(itemIds).toEqual(
      expect.arrayContaining([
        'active-assignment-packets',
        'vendor-packet-dashboard',
        'calendar-pressure',
      ]),
    );
    expect(itemIds).not.toContain('active-order-attention');
    expect(itemIds).not.toContain('client-operational-summary');
    expect(itemIds).not.toContain('review-qc-queue');
    expect(itemIds).not.toContain('amc-network-command-center');
  });

  it('generates Client request/status/document dashboard metadata', () => {
    const composition = getShadowDashboardComposition(PRODUCT_MODE_IDS.CLIENT_PORTAL);
    const itemIds = composition.items.map(({ dashboardItemId }) => dashboardItemId);

    expect(composition.shell.name).toBe('Client Order Status Dashboard');
    expect(itemIds).toEqual(
      expect.arrayContaining([
        'client-status-dashboard',
        'active-requests',
        'waiting-on-me',
        'recent-client-updates',
        'delivered-documents-reports',
      ]),
    );
    expect(itemIds).not.toContain('active-order-attention');
    expect(itemIds).not.toContain('assignment-sla-pressure');
    expect(itemIds).not.toContain('review-qc-queue');
    expect(itemIds).not.toContain('vendor-packet-dashboard');
  });

  it('preserves internal and network lane metadata for Hybrid / Ecosystem dashboards', () => {
    const composition = getShadowDashboardComposition(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.CLIENTS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.RELATIONSHIPS,
      MODULE_IDS.CLIENT_PORTAL,
    ]);

    expect(composition.shell.name).toBe('Ecosystem Operations Dashboard');
    expect(Object.keys(composition.itemsByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_DASHBOARD_LANE.PERSONAL_WORKSPACE,
        SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS,
        SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS,
        SHADOW_DASHBOARD_LANE.CLIENT_WORKSPACE,
      ]),
    );
    expect(
      composition.itemsByLane[SHADOW_DASHBOARD_LANE.INTERNAL_OPERATIONS].map(
        ({ dashboardItemId }) => dashboardItemId,
      ),
    ).toEqual(expect.arrayContaining(['active-order-attention', 'client-operational-summary']));
    expect(
      composition.itemsByLane[SHADOW_DASHBOARD_LANE.NETWORK_OPERATIONS].map(
        ({ dashboardItemId }) => dashboardItemId,
      ),
    ).toEqual(expect.arrayContaining(['assignment-sla-pressure', 'relationship-attention']));
  });

  it('keeps Vendor and Client compositions free of Staff/AMC internal workflow widgets', () => {
    expect(getShadowDashboardItemIds(PRODUCT_MODE_IDS.VENDOR_PORTAL)).not.toEqual(
      expect.arrayContaining([
        'active-order-attention',
        'client-operational-summary',
        'review-qc-queue',
        'amc-network-command-center',
      ]),
    );
    expect(getShadowDashboardItemIds(PRODUCT_MODE_IDS.CLIENT_PORTAL)).not.toEqual(
      expect.arrayContaining([
        'active-order-attention',
        'assignment-sla-pressure',
        'review-qc-queue',
        'vendor-packet-dashboard',
      ]),
    );
  });

  it('returns safe empty diagnostics for unknown modes and modules', () => {
    expect(() =>
      getShadowDashboardItemsForModuleIds([MODULE_IDS.DASHBOARD, 'unknown']),
    ).not.toThrow();

    expect(
      getShadowDashboardItemsForModuleIds([MODULE_IDS.DASHBOARD, 'unknown']),
    ).toHaveLength(1);
    expect(getShadowDashboardItemsForModuleIds(['unknown'])).toEqual([]);
    expect(getShadowDashboardComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      shell: null,
      items: [],
      itemsByLane: {},
      missingDependencyIds: [],
      runtimeComposed: false,
    });
  });

  it('marks permission keys as diagnostic metadata only', () => {
    const composition = getShadowDashboardComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    composition.items.forEach((item) => {
      expect(item).toMatchObject({
        registrationStatus: SHADOW_DASHBOARD_DIAGNOSTIC_STATUS.METADATA_ONLY,
        runtimeComposed: false,
        permissionAuthority: SHADOW_DASHBOARD_AUTHORITY.NONE,
        permissionMetadataOnly: true,
      });
      expect(Array.isArray(item.permissionDomains)).toBe(true);
    });

    expect(composition.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission domains describe future dashboard gates but do not authorize visibility here.',
      ]),
    );
  });
});
