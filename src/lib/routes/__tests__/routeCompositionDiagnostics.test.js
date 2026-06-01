import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  SHADOW_ROUTE_AUTHORITY,
  SHADOW_ROUTE_DIAGNOSTIC_STATUS,
  SHADOW_ROUTE_LANE,
  getShadowRouteCompositionDiagnostics,
  getShadowRouteConceptIds,
  getShadowRouteEntriesForModuleIds,
} from '../routeCompositionDiagnostics.js';

const ACTIVE_ROUTE_SURFACE_PATHS = Object.freeze([
  'src/routes',
  'src/lib/hooks/ProtectedRoute.jsx',
  'src/components',
  'src/features',
  'src/pages',
  'src/layout',
  'src/App.jsx',
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

const entryText = (entries) =>
  entries
    .flatMap((entry) => [
      entry.routeConceptId,
      entry.label,
      entry.routePattern,
      ...(entry.tags ?? []),
    ])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

describe('shadow route composition diagnostics', () => {
  it('generates Staff operational route diagnostics', () => {
    const composition = getShadowRouteCompositionDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);
    const routeIds = composition.entries.map(({ routeConceptId }) => routeConceptId);

    expect(routeIds).toEqual(
      expect.arrayContaining([
        'dashboard-home',
        'staff-orders',
        'staff-new-order',
        'staff-order-detail',
        'clients-list',
        'team-access-users',
        'operations-calendar',
      ]),
    );
    expect(composition.entriesByLane[SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS].length).toBeGreaterThan(
      0,
    );
  });

  it('generates AMC network route diagnostics', () => {
    const composition = getShadowRouteCompositionDiagnostics(PRODUCT_MODE_IDS.AMC_OPERATIONS);
    const routeIds = composition.entries.map(({ routeConceptId }) => routeConceptId);

    expect(routeIds).toEqual(
      expect.arrayContaining([
        'amc-intake-orders',
        'amc-order-detail',
        'owner-assignments',
        'relationships-list',
        'review-workflow',
        'amc-command-center',
      ]),
    );
    expect(composition.entriesByLane[SHADOW_ROUTE_LANE.NETWORK_OPERATIONS].length).toBeGreaterThan(
      0,
    );
  });

  it('keeps Vendor route diagnostics packet-native and free of canonical internal routes', () => {
    const routeIds = getShadowRouteConceptIds(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const composition = getShadowRouteCompositionDiagnostics(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const text = entryText(composition.entries);

    expect(routeIds).toEqual(
      expect.arrayContaining([
        'vendor-assignment-packets',
        'vendor-assignment-packet-detail',
        'vendor-workspace',
        'packet-calendar',
      ]),
    );
    expect(routeIds).not.toEqual(
      expect.arrayContaining([
        'staff-orders',
        'staff-new-order',
        'clients-list',
        'team-access-users',
        'review-workflow',
        'amc-command-center',
      ]),
    );
    expect(text).not.toMatch(/clients|review workflow|amc command|staff-orders/);
  });

  it('keeps Client route diagnostics request/status/document-native', () => {
    const routeIds = getShadowRouteConceptIds(PRODUCT_MODE_IDS.CLIENT_PORTAL);
    const composition = getShadowRouteCompositionDiagnostics(PRODUCT_MODE_IDS.CLIENT_PORTAL);
    const text = entryText(composition.entries);

    expect(routeIds).toEqual(
      expect.arrayContaining([
        'client-request-list',
        'client-request-detail',
        'client-request-submit',
        'client-portal-home',
        'client-documents',
        'documents-reports',
      ]),
    );
    expect(routeIds).not.toEqual(
      expect.arrayContaining([
        'staff-orders',
        'owner-assignments',
        'review-workflow',
        'vendor-workspace',
        'amc-command-center',
      ]),
    );
    expect(text).toMatch(/request|status|documents/);
    expect(text).not.toMatch(/review workflow|vendor|assignment packet|amc command/);
  });

  it('preserves Hybrid lane metadata with explicit lane modules', () => {
    const composition = getShadowRouteCompositionDiagnostics(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM, [
      MODULE_IDS.ORDERS,
      MODULE_IDS.CLIENTS,
      MODULE_IDS.ASSIGNMENTS,
      MODULE_IDS.RELATIONSHIPS,
      MODULE_IDS.CLIENT_PORTAL,
      MODULE_IDS.REPORTS,
    ]);

    expect(Object.keys(composition.entriesByLane)).toEqual(
      expect.arrayContaining([
        SHADOW_ROUTE_LANE.PERSONAL_WORKSPACE,
        SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS,
        SHADOW_ROUTE_LANE.NETWORK_OPERATIONS,
        SHADOW_ROUTE_LANE.CLIENT_WORKSPACE,
        SHADOW_ROUTE_LANE.INTELLIGENCE,
      ]),
    );
    expect(
      composition.entriesByLane[SHADOW_ROUTE_LANE.INTERNAL_OPERATIONS].map(
        ({ routeConceptId }) => routeConceptId,
      ),
    ).toEqual(expect.arrayContaining(['staff-orders', 'clients-list']));
    expect(
      composition.entriesByLane[SHADOW_ROUTE_LANE.NETWORK_OPERATIONS].map(
        ({ routeConceptId }) => routeConceptId,
      ),
    ).toEqual(expect.arrayContaining(['owner-assignments', 'relationships-list']));
  });

  it('returns safe empty diagnostics for unknown modes and modules', () => {
    expect(() =>
      getShadowRouteEntriesForModuleIds([MODULE_IDS.DASHBOARD, 'unknown_module']),
    ).not.toThrow();

    expect(getShadowRouteEntriesForModuleIds([MODULE_IDS.DASHBOARD, 'unknown_module'])).toHaveLength(
      1,
    );
    expect(getShadowRouteEntriesForModuleIds(['unknown_module'])).toEqual([]);
    expect(getShadowRouteCompositionDiagnostics('unknown_mode')).toMatchObject({
      isKnownMode: false,
      entries: [],
      entriesByLane: {},
      missingDependencyIds: [],
      routeAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
      runtimeComposed: false,
    });
  });

  it('marks permission metadata as non-authoritative', () => {
    const composition = getShadowRouteCompositionDiagnostics(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    composition.entries.forEach((entry) => {
      expect(entry).toMatchObject({
        registrationStatus: SHADOW_ROUTE_DIAGNOSTIC_STATUS.METADATA_ONLY,
        runtimeComposed: false,
        permissionAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
        permissionMetadataOnly: true,
        routeAuthority: SHADOW_ROUTE_AUTHORITY.NONE,
        routeMetadataOnly: true,
      });
      expect(Array.isArray(entry.permissionKeys)).toBe(true);
      expect(Array.isArray(entry.permissionDomains)).toBe(true);
    });

    expect(composition.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission keys and domains describe future route gates but do not authorize route access here.',
      ]),
    );
  });

  it('does not import shadow route diagnostics into active route or app surfaces', () => {
    const matches = ACTIVE_ROUTE_SURFACE_PATHS.flatMap((surfacePath) =>
      collectFiles(surfacePath).flatMap((filePath) => {
        if (DIAGNOSTIC_SURFACE_ALLOWLIST.includes(filePath)) {
          return [];
        }

        const fileContents = readFileSync(filePath, 'utf8');

        return fileContents.includes('routeCompositionDiagnostics') ||
          fileContents.includes('SHADOW_ROUTE_')
          ? [filePath]
          : [];
      }),
    );

    expect(matches).toEqual([]);
  });

  it('keeps active dashboard routing shared and does not introduce AMC route trees', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');

    expect(activeRoutes).toContain('path="/dashboard"');
    expect(activeRoutes).toContain('path="/vendors"');
    expect(activeRoutes).toContain('path="/vendors/:vendorProfileId"');
    expect(activeRoutes).not.toContain('path="/amc');
    expect(activeRoutes).not.toContain('path="/amc/');
  });

  it('keeps the Vendor Directory route hidden from current live navigation', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const navRegistry = readFileSync('src/lib/navigation/currentNavigationRegistry.js', 'utf8');
    const commandRegistry = readFileSync('src/lib/commandPalette/currentCommandRegistry.js', 'utf8');

    expect(activeRoutes).toContain('path="/vendors"');
    expect(activeRoutes).toContain('path="/vendors/:vendorProfileId"');
    expect(navRegistry).not.toContain("path: '/vendors'");
    expect(navRegistry).not.toContain("path: '/vendors/:vendorProfileId'");
    expect(navRegistry).not.toContain('Vendor Directory');
    expect(commandRegistry).not.toContain("path: '/vendors'");
    expect(commandRegistry).not.toContain("path: '/vendors/:vendorProfileId'");
    expect(commandRegistry).not.toContain('Vendor Directory');
  });
});
