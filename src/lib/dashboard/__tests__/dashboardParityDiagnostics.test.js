import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  DASHBOARD_PARITY_AUTHORITY,
  DASHBOARD_PARITY_STATUS,
  getDashboardParityDiagnostics,
} from '../dashboardParityDiagnostics.js';

const idsOf = (entries) => entries.map((entry) => entry.dashboardItemId);

describe('dashboard parity diagnostics', () => {
  it('reports expected Staff/default current dashboard parity concepts', () => {
    const diagnostics = getDashboardParityDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    expect(diagnostics).toMatchObject({
      isKnownMode: true,
      runtimeComposed: false,
      hasErrors: false,
      permissionAuthority: DASHBOARD_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    });
    expect(idsOf(diagnostics.matches)).toEqual(
      expect.arrayContaining([
        'dashboard-shell-anchor',
        'active-order-attention',
        'due-soon-overdue',
        'client-operational-summary',
        'review-qc-queue',
        'calendar-pressure',
      ]),
    );
    diagnostics.matches.forEach((match) => {
      expect(match).toMatchObject({
        status: DASHBOARD_PARITY_STATUS.MATCH,
        diagnosticOnly: true,
        fatal: false,
      });
    });
    expect(diagnostics.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission metadata remains descriptive; DashboardGate and component-level permissions remain authoritative.',
      ]),
    );
  });

  it('describes assignment-native dashboard concepts without widening visibility', () => {
    const diagnostics = getDashboardParityDiagnostics(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const matchIds = idsOf(diagnostics.matches);

    expect(matchIds).toContain('active-assignment-packets');
    expect(matchIds).toContain('calendar-pressure');
    expect(matchIds).not.toContain('active-order-attention');
    expect(idsOf(diagnostics.futureOnlyEntries)).toContain('vendor-packet-dashboard');

    const assignedWork = diagnostics.liveEntries.find(
      (entry) => entry.id === 'dashboard.assignment.assigned-work',
    );

    expect(assignedWork.notes.join(' ')).toContain('does not grant canonical order dashboard');
    expect(assignedWork.widgetNotes.join(' ')).toContain('assignment packets');
  });

  it('reports AMC future dashboard gaps without treating them as live', () => {
    const diagnostics = getDashboardParityDiagnostics(PRODUCT_MODE_IDS.AMC_OPERATIONS);
    const futureIds = idsOf(diagnostics.futureOnlyEntries);

    expect(futureIds).toEqual(
      expect.arrayContaining([
        'amc-intake-unassigned',
        'client-lender-exceptions',
        'relationship-attention',
        'amc-network-command-center',
      ]),
    );
    expect(idsOf(diagnostics.matches)).toContain('assignment-sla-pressure');
    expect(diagnostics.futureOnlyEntries.every((entry) => entry.fatal === false)).toBe(true);
  });

  it('keeps Vendor and Client future dashboard concepts out of the current live registry', () => {
    const vendor = getDashboardParityDiagnostics(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const client = getDashboardParityDiagnostics(PRODUCT_MODE_IDS.CLIENT_PORTAL);

    expect(idsOf(vendor.futureOnlyEntries)).toContain('vendor-packet-dashboard');
    expect(idsOf(vendor.matches)).not.toContain('vendor-packet-dashboard');

    expect(idsOf(client.futureOnlyEntries)).toEqual(
      expect.arrayContaining([
        'client-status-dashboard',
        'active-requests',
        'waiting-on-me',
        'recent-client-updates',
        'delivered-documents-reports',
      ]),
    );
    expect(idsOf(client.matches)).not.toEqual(
      expect.arrayContaining(['client-status-dashboard', 'active-requests']),
    );
  });

  it('reports Hybrid lane gaps safely', () => {
    const diagnostics = getDashboardParityDiagnostics(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.CLIENTS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.RELATIONSHIPS,
      MODULE_IDS.CLIENT_PORTAL,
    ]);

    expect(Object.keys(diagnostics.entriesByLane)).toEqual(
      expect.arrayContaining([
        'internal_operations',
        'network_operations',
        'client_workspace',
      ]),
    );
    expect(idsOf(diagnostics.matches)).toEqual(
      expect.arrayContaining([
        'active-order-attention',
        'client-operational-summary',
        'assignment-sla-pressure',
      ]),
    );
    expect(idsOf(diagnostics.futureOnlyEntries)).toEqual(
      expect.arrayContaining(['relationship-attention', 'client-status-dashboard']),
    );
    expect(diagnostics.hasErrors).toBe(false);
  });

  it('returns safe diagnostics for unknown modes', () => {
    expect(getDashboardParityDiagnostics('unknown_mode')).toMatchObject({
      isKnownMode: false,
      liveEntries: [],
      shadowEntries: [],
      matches: [],
      liveOnlyEntries: [],
      futureOnlyEntries: [],
      hasErrors: false,
      runtimeComposed: false,
    });
  });
});
