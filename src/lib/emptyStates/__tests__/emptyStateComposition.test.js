import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  SHADOW_EMPTY_STATE_AUTHORITY,
  SHADOW_EMPTY_STATE_DIAGNOSTIC_STATUS,
  SHADOW_EMPTY_STATE_LANE,
  getShadowEmptyStateComposition,
  getShadowEmptyStateIds,
  getShadowEmptyStatesForModuleIds,
} from '../emptyStateComposition.js';

describe('shadow empty-state composition diagnostics', () => {
  it('uses operational work/order language for Staff empty states', () => {
    const composition = getShadowEmptyStateComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const emptyStateIds = composition.emptyStates.map(({ emptyStateId }) => emptyStateId);
    const staffOrderState = composition.emptyStates.find(
      ({ emptyStateId }) => emptyStateId === 'staff-no-orders',
    );

    expect(emptyStateIds).toEqual(
      expect.arrayContaining(['staff-no-orders', 'clients-empty', 'reviews-empty']),
    );
    expect(staffOrderState.message).toContain('Operational order work');
    expect(staffOrderState.lane).toBe(SHADOW_EMPTY_STATE_LANE.INTERNAL_OPERATIONS);
  });

  it('uses intake, assignment, vendor, and client readiness language for AMC empty states', () => {
    const composition = getShadowEmptyStateComposition(PRODUCT_MODE_IDS.AMC_OPERATIONS);
    const emptyStateIds = composition.emptyStates.map(({ emptyStateId }) => emptyStateId);
    const amcState = composition.emptyStates.find(
      ({ emptyStateId }) => emptyStateId === 'amc-no-intake',
    );

    expect(emptyStateIds).toEqual(
      expect.arrayContaining(['amc-no-intake', 'amc-no-assignments', 'amc-command-empty']),
    );
    expect(amcState.message).toContain('intake, assignment, vendor follow-up, or review');
    expect(amcState.lane).toBe(SHADOW_EMPTY_STATE_LANE.AMC_NETWORK);
  });

  it('uses packet and assignment language for Vendor empty states', () => {
    const emptyStateIds = getShadowEmptyStateIds(PRODUCT_MODE_IDS.VENDOR_PORTAL);

    expect(emptyStateIds).toEqual(
      expect.arrayContaining(['vendor-no-packets', 'vendor-workspace-empty']),
    );
    expect(emptyStateIds).not.toContain('staff-no-orders');
    expect(emptyStateIds).not.toContain('clients-empty');
    expect(emptyStateIds).not.toContain('reviews-empty');
    expect(emptyStateIds).not.toContain('amc-command-empty');
  });

  it('uses request, status, and document language for Client empty states', () => {
    const composition = getShadowEmptyStateComposition(PRODUCT_MODE_IDS.CLIENT_PORTAL);
    const emptyStateIds = composition.emptyStates.map(({ emptyStateId }) => emptyStateId);
    const clientState = composition.emptyStates.find(
      ({ emptyStateId }) => emptyStateId === 'client-no-requests',
    );

    expect(emptyStateIds).toEqual(
      expect.arrayContaining([
        'client-no-requests',
        'client-portal-empty',
        'reports-empty',
      ]),
    );
    expect(clientState.message).toContain('status updates');
    expect(clientState.message).toContain('delivered documents');
    expect(emptyStateIds).not.toContain('reviews-empty');
    expect(emptyStateIds).not.toContain('vendor-workspace-empty');
  });

  it('preserves lane metadata for Hybrid empty states', () => {
    const composition = getShadowEmptyStateComposition(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.CLIENT_PORTAL,
    ]);

    expect(Object.keys(composition.emptyStatesByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_EMPTY_STATE_LANE.PERSONAL_WORKSPACE,
        SHADOW_EMPTY_STATE_LANE.INTERNAL_OPERATIONS,
        SHADOW_EMPTY_STATE_LANE.AMC_NETWORK,
        SHADOW_EMPTY_STATE_LANE.CLIENT_WORKSPACE,
      ]),
    );
  });

  it('returns safe empty diagnostics for unknown modes and modules', () => {
    expect(() =>
      getShadowEmptyStatesForModuleIds([MODULE_IDS.DASHBOARD, 'unknown']),
    ).not.toThrow();

    expect(getShadowEmptyStatesForModuleIds([MODULE_IDS.DASHBOARD, 'unknown'])).toHaveLength(
      1,
    );
    expect(getShadowEmptyStatesForModuleIds(['unknown'])).toEqual([]);
    expect(getShadowEmptyStateComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      emptyStates: [],
      emptyStatesByLane: {},
      missingDependencyIds: [],
      runtimeComposed: false,
    });
  });

  it('marks permission keys as diagnostic metadata only', () => {
    const composition = getShadowEmptyStateComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    composition.emptyStates.forEach((emptyState) => {
      expect(emptyState).toMatchObject({
        registrationStatus: SHADOW_EMPTY_STATE_DIAGNOSTIC_STATUS.METADATA_ONLY,
        runtimeComposed: false,
        permissionAuthority: SHADOW_EMPTY_STATE_AUTHORITY.NONE,
        permissionMetadataOnly: true,
      });
      expect(Array.isArray(emptyState.permissionDomains)).toBe(true);
    });

    expect(composition.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission domains describe future empty-state gates but do not authorize visibility here.',
      ]),
    );
  });
});
