import { describe, expect, it } from 'vitest';

import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from '../../shell/resolveShellProfile.js';
import {
  SHELL_PROFILE_METADATA_IDS,
  getShellProfileMetadata,
} from '../../shell/shellProfiles.js';
import {
  CURRENT_PRIMARY_NAV_LINK_IDS,
  getCurrentPrimaryNavLinks,
} from '../currentPrimaryNavLinks.js';
import {
  currentLiveNavigationEntriesById,
  getCurrentLiveNavigationEntry,
} from '../currentNavigationRegistry.js';
import {
  SHELL_NAVIGATION_GROUP_PROFILE_IDS,
  SHELL_NAVIGATION_GROUPS_KIND,
  SHELL_NAVIGATION_GROUP_STATUSES,
  getShellNavigationGroups,
  shellNavigationGroupEntries,
} from '../shellNavigationGroups.js';

const allReferencedNavIdsFor = (entry) => [
  ...entry.groups.flatMap((group) => group.navEntryIds),
  ...entry.deemphasizedNavEntryIds,
  ...entry.hiddenNavEntryIds,
];

describe('passive shell navigation groups', () => {
  it('identifies itself as passive presentation metadata', () => {
    expect(SHELL_NAVIGATION_GROUPS_KIND).toBe('passive_shell_navigation_groups');

    shellNavigationGroupEntries.forEach((entry) => {
      expect(entry.metadataAuthority).toBe(SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY);
      expect(entry.permissionKeys).toBeUndefined();
      expect(entry.permissions).toBeUndefined();
      expect(entry.routeGate).toBeUndefined();
      expect(entry.visibilityGate).toBeUndefined();
      expect(entry.requiredPermission).toBeUndefined();
      expect(entry.requiredAnyPermissions).toBeUndefined();
    });
  });

  it('covers every shell profile metadata id exactly once', () => {
    expect(SHELL_NAVIGATION_GROUP_PROFILE_IDS).toEqual(SHELL_PROFILE_METADATA_IDS);
    expect(new Set(SHELL_NAVIGATION_GROUP_PROFILE_IDS).size).toBe(
      SHELL_NAVIGATION_GROUP_PROFILE_IDS.length,
    );
  });

  it('references existing current navigation ids only', () => {
    shellNavigationGroupEntries.forEach((entry) => {
      allReferencedNavIdsFor(entry).forEach((navEntryId) => {
        expect(currentLiveNavigationEntriesById[navEntryId], navEntryId).toBeDefined();
      });
    });
  });

  it('does not invent Client Portal or vendor navigation ids for future Requests metadata', () => {
    const requestsGroups = getShellNavigationGroups(SHELL_PROFILE_IDS.REQUESTS);
    const referencedIds = allReferencedNavIdsFor(requestsGroups);
    const serialized = JSON.stringify(requestsGroups).toLowerCase();

    expect(requestsGroups).toMatchObject({
      status: SHELL_NAVIGATION_GROUP_STATUSES.FUTURE,
      futureOnly: true,
      groups: [],
    });
    expect(referencedIds).not.toEqual(
      expect.arrayContaining([
        'requests',
        'client.portal',
        'documents',
        'reports',
        'messages',
        'vendor.portal',
      ]),
    );
    expect(serialized).not.toContain('/requests');
    expect(serialized).not.toContain('client portal route');
  });

  it('keeps operations broad but grouped into operations, management, and setup support', () => {
    const operationsGroups = getShellNavigationGroups(SHELL_PROFILE_IDS.OPERATIONS);

    expect(operationsGroups).toMatchObject({
      status: SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE,
      futureOnly: false,
    });
    expect(operationsGroups.groups.map(({ id }) => id)).toEqual([
      'operations',
      'management',
      'setup_support',
    ]);
    expect(operationsGroups.groups[0].navEntryIds).toEqual([
      'dashboard',
      'orders',
      'calendar',
      'assignments',
    ]);
    expect(operationsGroups.groups[1].navEntryIds).toEqual([
      'clients.primary',
      'relationships',
      'users',
    ]);
    expect(operationsGroups.groups[2].navEntryIds).toEqual([
      'settings',
      'settings.ownerSetup',
      'settings.notifications',
    ]);
  });

  it('keeps appraiser, reviewer, and received-work groupings on existing surfaces', () => {
    expect(getShellNavigationGroups(SHELL_PROFILE_IDS.MY_WORK).groups).toMatchObject([
      {
        id: 'work',
        navEntryIds: ['my_work', 'orders', 'calendar'],
      },
      {
        id: 'support',
        navEntryIds: ['clients.primary', 'users', 'settings'],
      },
    ]);

    expect(getShellNavigationGroups(SHELL_PROFILE_IDS.REVIEW_QUEUE).groups).toMatchObject([
      {
        id: 'review_work',
        navEntryIds: ['dashboard', 'orders', 'calendar'],
      },
      {
        id: 'support',
        navEntryIds: ['clients.primary', 'settings'],
      },
    ]);

    expect(getShellNavigationGroups(SHELL_PROFILE_IDS.RECEIVED_WORK).groups).toMatchObject([
      {
        id: 'received_work',
        navEntryIds: ['dashboard', 'assignments'],
      },
      {
        id: 'account',
        navEntryIds: ['settings'],
      },
    ]);
  });

  it('uses fallback metadata without operational work claims', () => {
    [
      SHELL_PROFILE_IDS.UNAVAILABLE,
      SHELL_PROFILE_IDS.COMPANY_REQUIRED,
      SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE,
      SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
      SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
    ].forEach((profileId) => {
      const groups = getShellNavigationGroups(profileId);

      expect(groups.status).toBe(SHELL_NAVIGATION_GROUP_STATUSES.FALLBACK);
      expect(groups.groups).toHaveLength(1);
      expect(groups.groups[0].navEntryIds).toEqual(['dashboard', 'settings']);
      expect(groups.deemphasizedNavEntryIds).toEqual(
        expect.arrayContaining(['orders', 'assignments', 'calendar', 'clients.primary', 'users']),
      );
    });
  });

  it('does not alter current primary navigation output', () => {
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
    expect(links.map(({ id }) => id)).toEqual(CURRENT_PRIMARY_NAV_LINK_IDS);
    expect(links.map(({ label }) => label)).toEqual([
      'Orders',
      'Assignments',
      'Relationships',
      'Calendar',
      'Clients',
      'Team Access',
    ]);
  });

  it('does not rename existing navigation labels or paths', () => {
    expect(getCurrentLiveNavigationEntry('my_work')).toMatchObject({
      label: 'My Work',
      path: '/my-work',
    });
    expect(getCurrentLiveNavigationEntry('orders')).toMatchObject({
      label: 'Orders',
      path: '/orders',
    });
    expect(getCurrentLiveNavigationEntry('assignments')).toMatchObject({
      label: 'Assignments',
      path: '/assignments',
    });
    expect(getCurrentLiveNavigationEntry('users')).toMatchObject({
      label: 'Team Access',
      path: '/users',
    });
    expect(getCurrentLiveNavigationEntry('settings.ownerSetup')).toMatchObject({
      label: 'Owner Setup',
      path: '/settings/owner-setup',
    });
  });

  it('freezes entries, groups, arrays, and exported lookup results', () => {
    expect(Object.isFrozen(shellNavigationGroupEntries)).toBe(true);

    shellNavigationGroupEntries.forEach((entry) => {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.groups)).toBe(true);
      expect(Object.isFrozen(entry.deemphasizedNavEntryIds)).toBe(true);
      expect(Object.isFrozen(entry.hiddenNavEntryIds)).toBe(true);
      expect(Object.isFrozen(entry.notes)).toBe(true);
      entry.groups.forEach((group) => {
        expect(Object.isFrozen(group)).toBe(true);
        expect(Object.isFrozen(group.navEntryIds)).toBe(true);
        expect(Object.isFrozen(group.notes)).toBe(true);
      });
    });
  });

  it('stays aligned with shell metadata status expectations', () => {
    shellNavigationGroupEntries.forEach((entry) => {
      const profile = getShellProfileMetadata(entry.profileId);

      expect(profile).toBeTruthy();
      if (entry.profileId === SHELL_PROFILE_IDS.REQUESTS) {
        expect(entry.status).toBe(SHELL_NAVIGATION_GROUP_STATUSES.FUTURE);
        expect(entry.futureOnly).toBe(true);
      } else if (
        [
          SHELL_PROFILE_IDS.UNAVAILABLE,
          SHELL_PROFILE_IDS.COMPANY_REQUIRED,
          SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE,
          SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
          SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
        ].includes(entry.profileId)
      ) {
        expect(entry.status).toBe(SHELL_NAVIGATION_GROUP_STATUSES.FALLBACK);
      } else {
        expect(entry.status).toBe(SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE);
      }
    });
  });

  it('returns null for unknown profiles', () => {
    expect(getShellNavigationGroups('unknown_profile')).toBeNull();
  });
});
