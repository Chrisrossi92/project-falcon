import { describe, expect, it } from 'vitest';

import { OPERATIONS_MODES } from '../../operations/operationsMode.js';
import { SHELL_PROFILE_IDS } from '../../shell/resolveShellProfile.js';
import { getCurrentPrimaryNavLinks } from '../currentPrimaryNavLinks.js';
import { getCurrentShellNavigationSections } from '../currentShellNavigationSections.js';

const fullyVisibleLinks = () =>
  getCurrentPrimaryNavLinks({
    canReadAllClients: true,
    canReadAssignedClients: true,
      canReadAssignments: true,
      canReadRelationships: true,
      canReadVendors: true,
      canReadUsers: true,
  });

describe('current shell navigation sections', () => {
  it('groups active profile links by passive metadata after visible links are resolved', () => {
    const sections = getCurrentShellNavigationSections(
      fullyVisibleLinks(),
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(sections.map(({ id, label }) => [id, label])).toEqual([
      ['operations', 'Operations'],
      ['management', 'Management'],
    ]);
    expect(sections.flatMap((section) => section.links.map((link) => link.id))).toEqual([
      'orders',
      'calendar',
      'assignments',
      'clients.primary',
      'relationships',
      'users',
    ]);
  });

  it('does not create links for metadata ids that are not visible', () => {
    const links = getCurrentPrimaryNavLinks();
    const sections = getCurrentShellNavigationSections(links, SHELL_PROFILE_IDS.RECEIVED_WORK);

    expect(sections.map(({ id }) => id)).toEqual(['other_visible_links']);
    expect(sections.flatMap((section) => section.links.map((link) => link.id))).toEqual([
      'orders',
      'calendar',
    ]);
  });

  it('groups appraiser Staff Directory with Support while unrelated visible links fall through to More', () => {
    const sections = getCurrentShellNavigationSections(fullyVisibleLinks(), SHELL_PROFILE_IDS.MY_WORK);

    expect(sections.map(({ id, label }) => [id, label])).toEqual([
      ['work', 'Work'],
      ['support', 'Support'],
      ['other_visible_links', 'More'],
    ]);
    expect(sections.find((section) => section.id === 'support').links.map((link) => link.id)).toEqual([
      'clients.primary',
      'users',
    ]);
    expect(sections.find((section) => section.id === 'support').links.map((link) => link.label)).toEqual([
      'Clients',
      'Staff Directory',
    ]);
    expect(sections.at(-1).links.map((link) => link.id)).toEqual([
      'assignments',
      'relationships',
    ]);
  });

  it('uses role-intent labels for Users across owner/admin and reviewer shell sections', () => {
    expect(
      getCurrentShellNavigationSections(fullyVisibleLinks(), SHELL_PROFILE_IDS.OPERATIONS)
        .flatMap((section) => section.links)
        .find((link) => link.id === 'users')?.label,
    ).toBe('Users');

    expect(
      getCurrentShellNavigationSections(fullyVisibleLinks(), SHELL_PROFILE_IDS.REVIEW_QUEUE)
        .flatMap((section) => section.links)
        .find((link) => link.id === 'users')?.label,
    ).toBe('Staff Directory');
  });

  it('uses workspace-native AMC Operations grouping while preserving shared route paths', () => {
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
    const internalSections = getCurrentShellNavigationSections(
      visibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
      { operationsMode: OPERATIONS_MODES.INTERNAL_OPERATIONS },
    );
    const amcSections = getCurrentShellNavigationSections(
      amcVisibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
      { operationsMode: OPERATIONS_MODES.AMC_OPERATIONS },
    );

    expect(internalSections.map(({ id, label }) => [id, label])).toEqual([
      ['operations', 'Operations'],
      ['management', 'Management'],
    ]);
    expect(amcSections.map(({ id, label }) => [id, label])).toEqual([
      ['procurement', 'Procurement'],
      ['vendors', 'Vendors'],
      ['clients', 'Clients'],
    ]);
    expect(amcSections.map(({ id }) => id)).not.toContain('network');
    expect(amcSections.flatMap((section) => section.links.map((link) => link.id))).toEqual([
      'orders',
      'calendar',
      'vendors',
      'clients.primary',
    ]);
    expect(amcSections.flatMap((section) => section.links.map((link) => link.path))).toEqual([
      '/orders',
      '/calendar',
      '/vendors',
      '/clients',
    ]);
    expect(
      amcSections.flatMap((section) => section.links.map((link) => link.path)).some((path) => path.startsWith('/amc')),
    ).toBe(false);
    expect(amcSections.every((section) => section.operationsMode === OPERATIONS_MODES.AMC_OPERATIONS)).toBe(
      true,
    );
  });

  it('skips empty AMC workspace sections when visible links are unavailable', () => {
    const amcVisibleLinks = getCurrentPrimaryNavLinks({}, {
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
    });
    const amcSections = getCurrentShellNavigationSections(
      amcVisibleLinks,
      SHELL_PROFILE_IDS.OPERATIONS,
      { operationsMode: OPERATIONS_MODES.AMC_OPERATIONS },
    );

    expect(amcSections.map(({ id, label }) => [id, label])).toEqual([
      ['procurement', 'Procurement'],
    ]);
    expect(amcSections.flatMap((section) => section.links.map((link) => link.id))).toEqual([
      'orders',
      'calendar',
    ]);
    expect(amcSections.map(({ id }) => id)).not.toContain('vendors');
    expect(amcSections.map(({ id }) => id)).not.toContain('clients');
    expect(amcSections.map(({ id }) => id)).not.toContain('analytics');
    expect(amcSections.map(({ id }) => id)).not.toContain('system');
  });

  it('falls back to current flat nav for unknown and fallback profiles', () => {
    [SHELL_PROFILE_IDS.UNAVAILABLE, 'unknown_profile'].forEach((profileId) => {
      const sections = getCurrentShellNavigationSections(fullyVisibleLinks(), profileId);

      expect(sections).toHaveLength(1);
      expect(sections[0]).toMatchObject({
        id: 'current_primary_nav',
        label: null,
        grouped: false,
      });
      expect(sections[0].links.map((link) => link.id)).toEqual([
        'orders',
        'assignments',
        'relationships',
        'calendar',
        'clients.primary',
        'users',
      ]);
    });
  });

  it('returns frozen section records and arrays', () => {
    const sections = getCurrentShellNavigationSections(
      fullyVisibleLinks(),
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(Object.isFrozen(sections)).toBe(true);
    sections.forEach((section) => {
      expect(Object.isFrozen(section)).toBe(true);
      expect(Object.isFrozen(section.links)).toBe(true);
    });
  });
});
