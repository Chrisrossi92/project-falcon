import { describe, expect, it } from 'vitest';

import { OPERATIONS_MODES } from '../../operations/operationsMode.js';
import { SHELL_PROFILE_IDS } from '../../shell/resolveShellProfile.js';
import { getCurrentPrimaryNavLinks } from '../currentPrimaryNavLinks.js';
import { getCurrentShellMobileNavigationLinks } from '../currentShellMobileNavigationLinks.js';

const fullyVisibleLinks = () =>
  getCurrentPrimaryNavLinks({
    canReadAllClients: true,
    canReadAssignedClients: true,
      canReadAssignments: true,
      canReadRelationships: true,
      canReadVendors: true,
      canReadUsers: true,
  });

const ids = (links) => links.map((link) => link.id);
const labels = (links) => links.map((link) => link.label);
const paths = (links) => links.map((link) => link.path);

describe('current shell mobile navigation links', () => {
  it('orders active operations profile links by shell priority without changing the link set', () => {
    const visibleLinks = fullyVisibleLinks();
    const mobileLinks = getCurrentShellMobileNavigationLinks(
      visibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(ids(mobileLinks)).toEqual([
      'orders',
      'calendar',
      'assignments',
      'clients.primary',
      'relationships',
      'users',
    ]);
    expect(new Set(ids(mobileLinks))).toEqual(new Set(ids(visibleLinks)));
    expect(labels(mobileLinks)).toEqual([
      'Client Orders',
      'Review Workflow',
      'Staff Assignments',
      'Client Relationships',
      'Relationships',
      'Users',
    ]);
    expect(paths(mobileLinks)).toEqual([
      '/orders',
      '/calendar',
      '/assignments',
      '/clients',
      '/relationships',
      '/users',
    ]);
  });

  it('does not create inaccessible links from metadata-only ids', () => {
    const visibleLinks = getCurrentPrimaryNavLinks();
    const mobileLinks = getCurrentShellMobileNavigationLinks(
      visibleLinks,
      SHELL_PROFILE_IDS.RECEIVED_WORK,
    );

    expect(ids(mobileLinks)).toEqual(['orders', 'calendar']);
    expect(new Set(ids(mobileLinks))).toEqual(new Set(ids(visibleLinks)));
  });

  it('keeps ungrouped visible links available in current relative order', () => {
    const visibleLinks = fullyVisibleLinks();
    const mobileLinks = getCurrentShellMobileNavigationLinks(
      visibleLinks,
      SHELL_PROFILE_IDS.MY_WORK,
    );

    expect(ids(mobileLinks)).toEqual([
      'orders',
      'calendar',
      'clients.primary',
      'users',
      'assignments',
      'relationships',
    ]);
    expect(mobileLinks.find((link) => link.id === 'users')?.label).toBe('Staff Directory');
    expect(ids(mobileLinks).slice(3)).toEqual(['users', 'assignments', 'relationships']);
    expect(new Set(ids(mobileLinks))).toEqual(new Set(ids(visibleLinks)));
  });

  it('prioritizes assignment links for received work without adding internal access', () => {
    const visibleLinks = getCurrentPrimaryNavLinks({
      canReadAssignments: true,
    });
    const mobileLinks = getCurrentShellMobileNavigationLinks(
      visibleLinks,
      SHELL_PROFILE_IDS.RECEIVED_WORK,
    );

    expect(ids(mobileLinks)).toEqual(['assignments', 'orders', 'calendar']);
    expect(labels(mobileLinks)).toEqual([
      'Staff Assignments',
      'Client Orders',
      'Review Workflow',
    ]);
    expect(new Set(ids(mobileLinks))).toEqual(new Set(ids(visibleLinks)));
  });

  it('switches mobile ordering to the AMC Operations slate without changing routes to amc forks', () => {
    const visibleLinks = fullyVisibleLinks();
    const amcVisibleLinks = getCurrentPrimaryNavLinks({
      canReadAllClients: true,
      canReadAssignedClients: true,
      canReadAssignments: true,
      canReadRelationships: true,
      canReadVendors: true,
      canReadUsers: true,
    }, {
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
    });
    const internalLinks = getCurrentShellMobileNavigationLinks(
      visibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
      { operationsMode: OPERATIONS_MODES.INTERNAL_OPERATIONS },
    );
    const amcLinks = getCurrentShellMobileNavigationLinks(
      amcVisibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
      { operationsMode: OPERATIONS_MODES.AMC_OPERATIONS },
    );

    expect(ids(internalLinks)).toEqual([
      'orders',
      'calendar',
      'assignments',
      'clients.primary',
      'relationships',
      'users',
    ]);
    expect(ids(amcLinks)).toEqual([
      'orders',
      'calendar',
      'vendors',
      'clients.primary',
    ]);
    expect(labels(amcLinks)).toEqual([
      'Procurement',
      'Assignment Oversight',
      'Vendor Network',
      'Client Services',
    ]);
    expect(paths(amcLinks)).toEqual(['/orders', '/calendar', '/vendors', '/clients']);
    expect(amcLinks.every((link) => link.operationsMode === OPERATIONS_MODES.AMC_OPERATIONS)).toBe(
      true,
    );
    expect(paths(amcLinks).some((path) => path.startsWith('/amc'))).toBe(false);
  });

  it('orders only visible AMC mobile links from the workspace definition', () => {
    const amcVisibleLinks = getCurrentPrimaryNavLinks({
      canReadVendors: true,
    }, {
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
    });
    const amcLinks = getCurrentShellMobileNavigationLinks(
      amcVisibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
      { operationsMode: OPERATIONS_MODES.AMC_OPERATIONS },
    );

    expect(ids(amcLinks)).toEqual(['orders', 'calendar', 'vendors']);
    expect(labels(amcLinks)).toEqual([
      'Procurement',
      'Assignment Oversight',
      'Vendor Network',
    ]);
    expect(ids(amcLinks)).not.toContain('dashboard');
    expect(ids(amcLinks)).not.toContain('settings');
    expect(ids(amcLinks)).not.toContain('clients.primary');
  });

  it('does not leak future workspace placeholders into AMC mobile ordering', () => {
    const amcVisibleLinks = getCurrentPrimaryNavLinks({
      canReadAllClients: true,
      canReadVendors: true,
    }, {
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
    });
    const amcLinks = getCurrentShellMobileNavigationLinks(
      amcVisibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
      { operationsMode: OPERATIONS_MODES.AMC_OPERATIONS },
    );
    const serialized = JSON.stringify(amcLinks).toLowerCase();

    expect(serialized).not.toContain('vendor.available_work');
    expect(serialized).not.toContain('vendor.my_bids');
    expect(serialized).not.toContain('client.orders');
    expect(serialized).not.toContain('client.documents');
  });

  it('falls back to current flat order for unknown, fallback, and future profiles', () => {
    [SHELL_PROFILE_IDS.UNAVAILABLE, SHELL_PROFILE_IDS.REQUESTS, 'unknown_profile'].forEach(
      (profileId) => {
        const visibleLinks = fullyVisibleLinks();
        const mobileLinks = getCurrentShellMobileNavigationLinks(visibleLinks, profileId);

        expect(ids(mobileLinks)).toEqual([
          'orders',
          'assignments',
          'relationships',
          'calendar',
          'clients.primary',
          'users',
        ]);
        expect(new Set(ids(mobileLinks))).toEqual(new Set(ids(visibleLinks)));
      },
    );
  });

  it('returns a frozen ordered array', () => {
    const mobileLinks = getCurrentShellMobileNavigationLinks(
      fullyVisibleLinks(),
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(Object.isFrozen(mobileLinks)).toBe(true);
  });
});
