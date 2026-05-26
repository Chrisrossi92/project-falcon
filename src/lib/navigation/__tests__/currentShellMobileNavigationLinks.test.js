import { describe, expect, it } from 'vitest';

import { SHELL_PROFILE_IDS } from '../../shell/resolveShellProfile.js';
import { getCurrentPrimaryNavLinks } from '../currentPrimaryNavLinks.js';
import { getCurrentShellMobileNavigationLinks } from '../currentShellMobileNavigationLinks.js';

const fullyVisibleLinks = () =>
  getCurrentPrimaryNavLinks({
    canReadAllClients: true,
    canReadAssignedClients: true,
    canReadAssignments: true,
    canReadRelationships: true,
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
      'Orders',
      'Calendar',
      'Assignments',
      'Clients',
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
    expect(labels(mobileLinks)).toEqual(['Assignments', 'Orders', 'Calendar']);
    expect(new Set(ids(mobileLinks))).toEqual(new Set(ids(visibleLinks)));
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
