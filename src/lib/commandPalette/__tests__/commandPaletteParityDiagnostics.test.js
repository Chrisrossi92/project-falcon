import { describe, expect, it } from 'vitest';

import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import {
  COMMAND_PARITY_AUTHORITY,
  COMMAND_PARITY_STATUS,
  getCommandPaletteParityDiagnostics,
  getCurrentLiveCommandConceptIds,
} from '../commandPaletteParityDiagnostics.js';
import { SHADOW_COMMAND_LANE } from '../commandPaletteComposition.js';

const commandIdsFor = (entries) => entries.map(({ commandId }) => commandId);

describe('current command palette vs shadow command parity diagnostics', () => {
  it('reports Staff/default command parity for expected current concepts', () => {
    const parity = getCommandPaletteParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    expect(parity).toMatchObject({
      isKnownMode: true,
      runtimeComposed: false,
      hasErrors: false,
      permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    });
    expect(commandIdsFor(parity.matches)).toEqual(
      expect.arrayContaining([
        'open-orders',
        'search-orders',
        'open-calendar',
        'open-clients',
        'open-team-access',
        'open-settings',
        'open-notifications',
      ]),
    );
  });

  it('keeps Vendor and Client future commands out of the current live registry', () => {
    const liveCommandIds = getCurrentLiveCommandConceptIds();
    const vendorParity = getCommandPaletteParityDiagnostics(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const clientParity = getCommandPaletteParityDiagnostics(PRODUCT_MODE_IDS.CLIENT_PORTAL);

    expect(liveCommandIds).not.toContain('open-vendor-workspace');
    expect(liveCommandIds).not.toContain('submit-client-request');
    expect(liveCommandIds).not.toContain('open-my-requests');
    expect(liveCommandIds).not.toContain('search-request-status');
    expect(commandIdsFor(vendorParity.futureOnlyEntries)).toEqual(
      expect.arrayContaining(['open-vendor-workspace']),
    );
    expect(commandIdsFor(clientParity.futureOnlyEntries)).toEqual(
      expect.arrayContaining([
        'submit-client-request',
        'open-my-requests',
        'search-request-status',
        'open-documents-reports',
      ]),
    );
  });

  it('reports live-only Staff commands as diagnostic gaps, not errors', () => {
    const parity = getCommandPaletteParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    expect(commandIdsFor(parity.liveOnlyEntries)).toEqual(
      expect.arrayContaining(['open-assignment-packets', 'open-relationships']),
    );
    parity.liveOnlyEntries.forEach((entry) => {
      expect(entry).toMatchObject({
        status: COMMAND_PARITY_STATUS.LIVE_ONLY_DIAGNOSTIC_GAP,
        diagnosticOnly: true,
        fatal: false,
        permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
      });
    });
    expect(parity.hasErrors).toBe(false);
  });

  it('reports shadow-only commands as future gaps, not errors', () => {
    const parity = getCommandPaletteParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    expect(commandIdsFor(parity.shadowOnlyEntries)).toEqual(
      expect.arrayContaining(['open-dashboard', 'open-activity', 'open-review-queue']),
    );
    parity.shadowOnlyEntries.forEach((entry) => {
      expect(entry).toMatchObject({
        status: COMMAND_PARITY_STATUS.SHADOW_ONLY_FUTURE_GAP,
        diagnosticOnly: true,
        fatal: false,
        permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
      });
    });
    expect(parity.hasErrors).toBe(false);
  });

  it('preserves Hybrid lane metadata from shadow command composition', () => {
    const parity = getCommandPaletteParityDiagnostics(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.CLIENTS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.RELATIONSHIPS,
      MODULE_IDS.CLIENT_PORTAL,
    ]);

    expect(Object.keys(parity.entriesByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_COMMAND_LANE.PERSONAL_WORKSPACE,
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
        SHADOW_COMMAND_LANE.CLIENT_WORKSPACE,
      ]),
    );
    expect(parity.matches.map(({ lane }) => lane)).toEqual(
      expect.arrayContaining([
        SHADOW_COMMAND_LANE.INTERNAL_OPERATIONS,
        SHADOW_COMMAND_LANE.NETWORK_OPERATIONS,
      ]),
    );
  });

  it('returns safe diagnostics for unknown modes', () => {
    const parity = getCommandPaletteParityDiagnostics('unknown_mode');

    expect(parity).toMatchObject({
      modeId: 'unknown_mode',
      isKnownMode: false,
      runtimeComposed: false,
      hasErrors: false,
      permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    });
    expect(parity.matches).toEqual([]);
    expect(parity.liveOnlyEntries).toEqual([]);
    expect(parity.shadowOnlyEntries).toEqual([]);
    expect(parity.futureOnlyEntries).toEqual([]);
    expect(parity.diagnostics).toEqual(
      expect.arrayContaining([
        'Unknown product mode; no current-live/shadow command palette parity diagnostics generated.',
      ]),
    );
  });
});
