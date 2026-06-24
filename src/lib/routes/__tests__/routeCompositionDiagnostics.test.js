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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const expectRouteWrappedByWorkspaceGuard = (
  activeRoutes,
  routePath,
  workspaceExpression,
  componentName,
) => {
  expect(activeRoutes).toMatch(
    new RegExp(
      `path="${escapeRegExp(routePath)}"[\\s\\S]*` +
        `<WorkspaceRouteGuard workspace={${escapeRegExp(workspaceExpression)}}>[\\s\\S]*` +
        `<${escapeRegExp(componentName)} />[\\s\\S]*` +
        '</WorkspaceRouteGuard>',
    ),
  );
};

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

  it('keeps active dashboard routing shared and limits AMC route aliases to approved AMC-only pages', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const amcRoutePaths = [...activeRoutes.matchAll(/path="(\/amc[^"]*)"/g)].map((match) => match[1]);

    expect(activeRoutes).toContain('path="/dashboard"');
    expect(activeRoutes).toContain('path="/vendors"');
    expect(activeRoutes).toContain('path="/vendors/:vendorProfileId"');
    expect(amcRoutePaths).toEqual([
      '/amc/dashboard',
      '/amc/orders',
      '/amc/orders/new',
      '/amc/orders/:id',
      '/amc/vendors',
      '/amc/vendors/:vendorProfileId',
      '/amc/client-requests',
    ]);
  });

  it('wraps high-risk protected operation routes with workspace ownership guards', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const operationsWorkspace = 'ROUTE_WORKSPACE_GROUPS.OPERATIONS';
    const amcWorkspace = 'ROUTE_WORKSPACES.AMC';
    const internalWorkspace = 'ROUTE_WORKSPACES.INTERNAL';

    [
      ['/dashboard', operationsWorkspace, 'DashboardGate'],
      ['/amc/dashboard', amcWorkspace, 'DashboardGate'],
      ['/amc/orders', amcWorkspace, 'Orders'],
      ['/amc/orders/new', amcWorkspace, 'AmcNewOrderPage'],
      ['/amc/orders/:id', amcWorkspace, 'OrderDetail'],
      ['/orders', operationsWorkspace, 'Orders'],
      ['/orders/historical', operationsWorkspace, 'HistoricalOrders'],
      ['/orders/new', operationsWorkspace, 'NewOrder'],
      ['/orders/:id', operationsWorkspace, 'OrderDetail'],
      ['/orders/:id/edit', operationsWorkspace, 'EditOrder'],
      ['/assignments', operationsWorkspace, 'AssignmentsPage'],
      ['/assignments/:assignmentId', operationsWorkspace, 'AssignmentDetail'],
      ['/relationships', operationsWorkspace, 'RelationshipsPage'],
      ['/relationships/:relationshipId', operationsWorkspace, 'RelationshipsPage'],
      ['/amc/client-requests', amcWorkspace, 'ClientOrderRequestsPage'],
      ['/client-requests', amcWorkspace, 'ClientOrderRequestsPage'],
      ['/clients', operationsWorkspace, 'ClientsDashboard'],
      ['/clients/new', operationsWorkspace, 'NewClient'],
      ['/clients/profile/:clientId', operationsWorkspace, 'ClientProfile'],
      ['/clients/edit/:clientId', operationsWorkspace, 'EditClient'],
      ['/clients/cards', operationsWorkspace, 'ClientsIndex'],
      ['/clients/:id', operationsWorkspace, 'ClientDetail'],
      ['/amc/vendors', amcWorkspace, 'VendorDirectoryPage'],
      ['/amc/vendors/:vendorProfileId', amcWorkspace, 'VendorProfilePage'],
      ['/vendors', amcWorkspace, 'VendorDirectoryPage'],
      ['/vendors/:vendorProfileId', amcWorkspace, 'VendorProfilePage'],
      ['/users', internalWorkspace, 'UsersIndex'],
      ['/my-work', internalWorkspace, 'MyWorkPage'],
    ].forEach(([routePath, workspaceExpression, componentName]) => {
      expectRouteWrappedByWorkspaceGuard(activeRoutes, routePath, workspaceExpression, componentName);
    });

    expect(activeRoutes).toMatch(
      /path="\/amc\/orders"[\s\S]*requiredAnyPermissions=\{\[[\s\S]*PERMISSIONS\.ORDERS_READ_ALL[\s\S]*PERMISSIONS\.ORDERS_READ_ASSIGNED[\s\S]*\]\}/,
    );
    expect(activeRoutes).toMatch(
      /path="\/amc\/orders\/:id"[\s\S]*requiredAnyPermissions=\{\[[\s\S]*PERMISSIONS\.ORDERS_READ_ALL[\s\S]*PERMISSIONS\.ORDERS_READ_ASSIGNED[\s\S]*\]\}/,
    );
    expect(activeRoutes).toMatch(
      /path="\/amc\/orders\/new"[\s\S]*requiredPermission=\{PERMISSIONS\.ORDERS_CREATE\}/,
    );
    expect(activeRoutes).toMatch(
      /path="\/amc\/client-requests"[\s\S]*requiredAnyPermissions=\{\[[\s\S]*PERMISSIONS\.CLIENT_PORTAL_ORDER_REQUESTS_READ[\s\S]*PERMISSIONS\.CLIENT_PORTAL_ORDER_REQUESTS_MANAGE[\s\S]*\]\}/,
    );
    expect(activeRoutes).toMatch(
      /path="\/client-requests"[\s\S]*requiredAnyPermissions=\{\[[\s\S]*PERMISSIONS\.CLIENT_PORTAL_ORDER_REQUESTS_READ[\s\S]*PERMISSIONS\.CLIENT_PORTAL_ORDER_REQUESTS_MANAGE[\s\S]*\]\}/,
    );
  });

  it('keeps public vendor bid invitations outside the authenticated app shell', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const publicRouteIndex = activeRoutes.indexOf('path="/vendor/bid-invitations/:token"');
    const authenticatedAreaIndex = activeRoutes.indexOf('{/* Authenticated area */}');

    expect(publicRouteIndex).toBeGreaterThan(-1);
    expect(authenticatedAreaIndex).toBeGreaterThan(-1);
    expect(publicRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(activeRoutes).toContain('element={<VendorBidInvitationPage />}');
  });

  it('keeps public vendor assignment offers outside the authenticated app shell', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const publicRouteIndex = activeRoutes.indexOf('path="/vendor/assignment-offers/:token"');
    const authenticatedAreaIndex = activeRoutes.indexOf('{/* Authenticated area */}');

    expect(publicRouteIndex).toBeGreaterThan(-1);
    expect(authenticatedAreaIndex).toBeGreaterThan(-1);
    expect(publicRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(activeRoutes).toContain('element={<VendorAssignmentOfferPage />}');
  });

  it('keeps public vendor assignment work links outside the authenticated app shell', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const publicRouteIndex = activeRoutes.indexOf('path="/vendor/assignment-work/:token"');
    const authenticatedAreaIndex = activeRoutes.indexOf('{/* Authenticated area */}');

    expect(publicRouteIndex).toBeGreaterThan(-1);
    expect(authenticatedAreaIndex).toBeGreaterThan(-1);
    expect(publicRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(activeRoutes).toContain('element={<VendorAssignmentWorkPage />}');
  });

  it('registers hidden Vendor Workspace routes outside the Internal/AMC Layout and live nav', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const navRegistry = readFileSync('src/lib/navigation/currentNavigationRegistry.js', 'utf8');
    const topNav = readFileSync('src/components/shell/TopNav.jsx', 'utf8');
    const vendorWorkspaceRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/dashboard"');
    const vendorAvailableWorkRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/available-work"');
    const vendorAvailableWorkDetailRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/available-work/:workKey"');
    const vendorMyBidsRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/my-bids"');
    const vendorPaymentsRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/payments"');
    const vendorProfileRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/profile"');
    const vendorAssignedOrdersRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/assigned-orders"');
    const vendorAssignedOrderDetailRouteIndex = activeRoutes.indexOf('path="/vendor-workspace/assigned-orders/:assignmentWorkKey"');
    const authenticatedAreaIndex = activeRoutes.indexOf('{/* Authenticated area */}');

    expect(activeRoutes).toContain('{/* Hidden authenticated Vendor Workspace foundation */}');
    expect(vendorWorkspaceRouteIndex).toBeGreaterThan(-1);
    expect(vendorAvailableWorkRouteIndex).toBeGreaterThan(-1);
    expect(vendorAvailableWorkDetailRouteIndex).toBeGreaterThan(-1);
    expect(vendorMyBidsRouteIndex).toBeGreaterThan(-1);
    expect(vendorPaymentsRouteIndex).toBeGreaterThan(-1);
    expect(vendorProfileRouteIndex).toBeGreaterThan(-1);
    expect(vendorAssignedOrdersRouteIndex).toBeGreaterThan(-1);
    expect(vendorAssignedOrderDetailRouteIndex).toBeGreaterThan(-1);
    expect(authenticatedAreaIndex).toBeGreaterThan(-1);
    expect(vendorWorkspaceRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(vendorAvailableWorkRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(vendorAvailableWorkDetailRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(vendorMyBidsRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(vendorPaymentsRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(vendorProfileRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(vendorAssignedOrdersRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(vendorAssignedOrderDetailRouteIndex).toBeLessThan(authenticatedAreaIndex);
    expect(activeRoutes).toContain('<VendorWorkspaceRouteGuard>');
    expect(activeRoutes).toContain('<VendorWorkspaceLayout />');
    expect(activeRoutes).toContain('element={<VendorWorkspaceDashboard />}');
    expect(activeRoutes).toContain('element={<VendorAvailableWorkPage />}');
    expect(activeRoutes).toContain('element={<VendorAvailableWorkDetailPage />}');
    expect(activeRoutes).toContain('element={<VendorMyBidsPage />}');
    expect(activeRoutes).toContain('element={<VendorPaymentsPage />}');
    expect(activeRoutes).toContain('element={<VendorWorkspaceProfilePage />}');
    expect(activeRoutes).toContain('element={<VendorAssignedOrdersPage />}');
    expect(activeRoutes).toContain('element={<VendorAssignedOrderDetailPage />}');
    expect(navRegistry).not.toContain('/vendor-workspace');
    expect(topNav).not.toContain('/vendor-workspace');
  });

  it('keeps the Vendor Directory out of the command palette while preserving shared nav routes', () => {
    const activeRoutes = readFileSync('src/routes/index.jsx', 'utf8');
    const navRegistry = readFileSync('src/lib/navigation/currentNavigationRegistry.js', 'utf8');
    const commandRegistry = readFileSync('src/lib/commandPalette/currentCommandRegistry.js', 'utf8');

    expect(activeRoutes).toContain('path="/vendors"');
    expect(activeRoutes).toContain('path="/vendors/:vendorProfileId"');
    expect(activeRoutes).toContain('requiredPermission={PERMISSIONS.VENDORS_READ}');
    expect(activeRoutes).not.toContain(
      'requiredPermission={PERMISSIONS.RELATIONSHIPS_READ}>\n              <V1HiddenSurfaceRouteGuard>\n                <Vendor',
    );
    expect(navRegistry).toContain("path: '/vendors'");
    expect(navRegistry).toContain("path: '/vendors/:vendorProfileId'");
    expect(navRegistry).toContain('PERMISSIONS.VENDORS_READ');
    expect(commandRegistry).not.toContain("path: '/vendors'");
    expect(commandRegistry).not.toContain("path: '/vendors/:vendorProfileId'");
    expect(commandRegistry).not.toContain('Vendor Directory');
  });
});
