import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  SHADOW_COMMAND_AUTHORITY,
  SHADOW_COMMAND_DIAGNOSTIC_STATUS,
  SHADOW_COMMAND_LANE,
  getShadowCommandEntriesForModuleIds,
  getShadowCommandIds,
  getShadowCommandPaletteComposition,
} from '../commandPaletteComposition.js';

describe('shadow command palette composition diagnostics', () => {
  it('generates Staff-appropriate command metadata without runtime composition', () => {
    const composition = getShadowCommandPaletteComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const commandIds = composition.entries.map(({ commandId }) => commandId);

    expect(composition).toMatchObject({
      isKnownMode: true,
      permissionAuthority: SHADOW_COMMAND_AUTHORITY.NONE,
      runtimeComposed: false,
    });
    expect(commandIds).toEqual(
      expect.arrayContaining([
        'open-dashboard',
        'open-orders',
        'search-orders',
        'open-clients',
        'open-team-access',
        'open-review-queue',
        'open-calendar',
      ]),
    );
  });

  it('keeps Vendor Portal commands free of canonical order/client/admin/internal workflow commands', () => {
    const commandIds = getShadowCommandIds(PRODUCT_MODE_IDS.VENDOR_PORTAL);

    expect(commandIds).toEqual(
      expect.arrayContaining([
        'open-dashboard',
        'open-assignment-packets',
        'open-vendor-workspace',
        'open-calendar',
      ]),
    );
    expect(commandIds).not.toContain('open-orders');
    expect(commandIds).not.toContain('search-orders');
    expect(commandIds).not.toContain('open-clients');
    expect(commandIds).not.toContain('open-team-access');
    expect(commandIds).not.toContain('open-review-queue');
    expect(commandIds).not.toContain('open-tenant-admin');
    expect(commandIds).not.toContain('open-amc-command-center');
  });

  it('keeps Client Portal commands free of internal workflow, review, vendor, and packet commands', () => {
    const commandIds = getShadowCommandIds(PRODUCT_MODE_IDS.CLIENT_PORTAL);

    expect(commandIds).toEqual(
      expect.arrayContaining([
        'open-dashboard',
        'submit-client-request',
        'open-my-requests',
        'search-request-status',
        'open-documents-reports',
      ]),
    );
    expect(commandIds).not.toContain('open-orders');
    expect(commandIds).not.toContain('search-orders');
    expect(commandIds).not.toContain('open-clients');
    expect(commandIds).not.toContain('open-review-queue');
    expect(commandIds).not.toContain('open-vendor-workspace');
    expect(commandIds).not.toContain('open-assignment-packets');
  });

  it('includes AMC and network operational command concepts for AMC Operations mode', () => {
    const composition = getShadowCommandPaletteComposition(PRODUCT_MODE_IDS.AMC_OPERATIONS);
    const commandIds = composition.entries.map(({ commandId }) => commandId);

    expect(commandIds).toEqual(
      expect.arrayContaining([
        'open-amc-intake',
        'search-amc-orders',
        'open-clients',
        'open-assignment-packets',
        'open-relationships',
        'open-review-queue',
        'open-amc-command-center',
      ]),
    );
    expect(composition.entriesByLane[SHADOW_COMMAND_LANE.NETWORK_OPERATIONS].length).toBeGreaterThan(
      0,
    );
  });

  it('preserves lane metadata for Hybrid / Ecosystem command diagnostics', () => {
    const composition = getShadowCommandPaletteComposition(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.CLIENTS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.RELATIONSHIPS,
      MODULE_IDS.CLIENT_PORTAL,
    ]);

    expect(Object.keys(composition.entriesByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_COMMAND_LANE.PERSONAL_WORKSPACE,
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        SHADOW_COMMAND_LANE.CLIENT_WORKSPACE,
      ]),
    );
    expect(composition.entriesByLane[SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS].map(({ commandId }) => commandId)).toEqual(
      expect.arrayContaining(['open-orders', 'open-clients']),
    );
    expect(composition.entriesByLane[SHADOW_COMMAND_LANE.NETWORK_OPERATIONS].map(({ commandId }) => commandId)).toEqual(
      expect.arrayContaining(['open-assignment-packets', 'open-relationships']),
    );
  });

  it('returns safe empty diagnostics for unknown modes and modules', () => {
    expect(() =>
      getShadowCommandEntriesForModuleIds([MODULE_IDS.DASHBOARD, 'unknown']),
    ).not.toThrow();

    expect(getShadowCommandEntriesForModuleIds([MODULE_IDS.DASHBOARD, 'unknown'])).toHaveLength(
      1,
    );
    expect(getShadowCommandEntriesForModuleIds(['unknown'])).toEqual([]);
    expect(getShadowCommandPaletteComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      entries: [],
      entriesByLane: {},
      missingDependencyIds: [],
      runtimeComposed: false,
    });
  });

  it('marks permission keys as diagnostic metadata only', () => {
    const composition = getShadowCommandPaletteComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    composition.entries.forEach((entry) => {
      expect(entry).toMatchObject({
        registrationStatus: SHADOW_COMMAND_DIAGNOSTIC_STATUS.METADATA_ONLY,
        runtimeComposed: false,
        permissionAuthority: SHADOW_COMMAND_AUTHORITY.NONE,
        permissionMetadataOnly: true,
      });
      expect(Array.isArray(entry.permissionDomains)).toBe(true);
    });

    expect(composition.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission domains describe future command gates but do not authorize visibility here.',
      ]),
    );
  });
});
