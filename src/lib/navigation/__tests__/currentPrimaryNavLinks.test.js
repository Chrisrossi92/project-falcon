import { describe, expect, it } from 'vitest';

import { OPERATIONS_MODES } from '../../operations/operationsMode.js';
import { PERMISSIONS } from '../../permissions/constants.js';
import { CURRENT_NAV_SURFACES } from '../currentNavigationRegistry.js';
import {
  CURRENT_PRIMARY_NAV_LINK_IDS,
  getCurrentPrimaryNavLinks,
} from '../currentPrimaryNavLinks.js';

const idsFor = (links) => links.map(({ id }) => id);
const labelsFor = (links) => links.map(({ label }) => label);
const pathsFor = (links) => links.map(({ path }) => path);

describe('current primary nav links', () => {
  it('preserves current desktop primary nav labels and order for a fully permissioned user', () => {
    const links = getCurrentPrimaryNavLinks({
      canReadAllClients: true,
      canReadAssignedClients: true,
      canReadAssignments: true,
      canReadRelationships: true,
      canReadUsers: true,
    });

    expect(CURRENT_PRIMARY_NAV_LINK_IDS).toEqual([
      'orders',
      'assignments',
      'relationships',
      'calendar',
      'clients.primary',
      'users',
    ]);
    expect(idsFor(links)).toEqual(CURRENT_PRIMARY_NAV_LINK_IDS);
    expect(labelsFor(links)).toEqual([
      'Orders',
      'Assignments',
      'Relationships',
      'Calendar',
      'Clients',
      'Users',
    ]);
    expect(pathsFor(links)).toEqual([
      '/orders',
      '/assignments',
      '/relationships',
      '/calendar',
      '/clients',
      '/users',
    ]);
  });

  it('preserves Clients dynamic route behavior', () => {
    const fullClientLinks = getCurrentPrimaryNavLinks({
      canReadAllClients: true,
      canReadAssignedClients: true,
    });
    const assignedOnlyLinks = getCurrentPrimaryNavLinks({
      canReadAssignedClients: true,
    });

    expect(fullClientLinks.find(({ id }) => id === 'clients.primary')?.path).toBe('/clients');
    expect(assignedOnlyLinks.find(({ id }) => id === 'clients.primary')?.path).toBe(
      '/clients/cards',
    );
  });

  it('hides permissioned links when their permission input is false', () => {
    const links = getCurrentPrimaryNavLinks({
      canReadAllClients: false,
      canReadAssignedClients: false,
      canReadAssignments: false,
      canReadRelationships: false,
      canReadUsers: false,
    });

    expect(idsFor(links)).toEqual(['orders', 'calendar']);
    expect(pathsFor(links)).toEqual(['/orders', '/calendar']);
  });

  it('accepts operations mode without changing the current route set', () => {
    const permissions = {
      canReadAllClients: true,
      canReadAssignedClients: true,
      canReadAssignments: true,
      canReadRelationships: true,
      canReadUsers: true,
    };
    const internalLinks = getCurrentPrimaryNavLinks(permissions, {
      operationsMode: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    });
    const amcLinks = getCurrentPrimaryNavLinks(permissions, {
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
    });

    expect(idsFor(internalLinks)).toEqual(idsFor(amcLinks));
    expect(labelsFor(internalLinks)).toEqual(labelsFor(amcLinks));
    expect(pathsFor(internalLinks)).toEqual(pathsFor(amcLinks));
    expect(amcLinks.every((link) => link.operationsMode === OPERATIONS_MODES.AMC_OPERATIONS)).toBe(
      true,
    );
    expect(pathsFor(amcLinks).some((path) => path.startsWith('/amc'))).toBe(false);
  });

  it('treats missing, loading, or errored permission inputs as false', () => {
    const missingLinks = getCurrentPrimaryNavLinks();
    const unresolvedLinks = getCurrentPrimaryNavLinks({
      canReadAllClients: undefined,
      canReadAssignedClients: null,
      canReadAssignments: { loading: true },
      canReadRelationships: { error: new Error('permission resolver failed') },
      canReadUsers: 'true',
    });

    expect(idsFor(missingLinks)).toEqual(['orders', 'calendar']);
    expect(idsFor(unresolvedLinks)).toEqual(['orders', 'calendar']);
  });

  it('carries current registry gate metadata without becoming route authority', () => {
    const links = getCurrentPrimaryNavLinks({
      canReadAllClients: true,
      canReadAssignments: true,
      canReadRelationships: true,
      canReadUsers: true,
    });

    expect(links.find(({ id }) => id === 'orders')?.routeGate.permissions).toEqual([
      PERMISSIONS.ORDERS_READ_ALL,
      PERMISSIONS.ORDERS_READ_ASSIGNED,
    ]);
    expect(links.find(({ id }) => id === 'assignments')?.visibilityGate.permissions).toEqual([
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]);
    expect(links.find(({ id }) => id === 'relationships')?.visibilityGate.permissions).toEqual([
      PERMISSIONS.RELATIONSHIPS_READ,
    ]);
    expect(links.find(({ id }) => id === 'users')?.visibilityGate.permissions).toEqual([
      PERMISSIONS.USERS_READ,
    ]);
    links.forEach((link) => {
      expect(link.sourceSurface).toBe(CURRENT_NAV_SURFACES.DESKTOP);
    });
  });

  it('does not include mobile-only, route-only, diagnostics, Activity, Vendor, or Client Portal concepts', () => {
    const links = getCurrentPrimaryNavLinks({
      canReadAllClients: true,
      canReadAssignedClients: true,
      canReadAssignments: true,
      canReadRelationships: true,
      canReadUsers: true,
      canViewSettings: true,
    });
    const serialized = JSON.stringify(links).toLowerCase();

    expect(idsFor(links)).not.toEqual(
      expect.arrayContaining([
        'activity',
        'dashboard',
        'settings',
        'settings.notifications',
        'settings.productMetadataDiagnostics',
        'vendor.portal',
        'client.portal',
      ]),
    );
    expect(serialized).not.toContain('vendor workspace');
    expect(serialized).not.toContain('client portal');
    expect(serialized).not.toContain('submit request');
    expect(serialized).not.toContain('my requests');
    expect(serialized).not.toContain('documents / reports');
  });
});
