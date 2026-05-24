import { describe, expect, it } from 'vitest';

import { SHELL_PROFILE_IDS } from '../../shell/resolveShellProfile.js';
import { PERMISSIONS } from '../../permissions/constants.js';
import { getCurrentCommandPaletteCommands } from '../currentCommandPaletteCommands.js';
import { getCurrentShellCommandPaletteCommands } from '../currentShellCommandPaletteCommands.js';

const fullPermissions = Object.freeze({
  [PERMISSIONS.NAVIGATION_ORDERS_VIEW]: true,
  [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED]: true,
  [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER]: true,
  [PERMISSIONS.RELATIONSHIPS_READ]: true,
  [PERMISSIONS.NAVIGATION_CLIENTS_VIEW]: true,
  [PERMISSIONS.USERS_READ]: true,
  [PERMISSIONS.NAVIGATION_USERS_VIEW]: true,
  [PERMISSIONS.SETTINGS_VIEW]: true,
  [PERMISSIONS.NAVIGATION_SETTINGS_VIEW]: true,
  [PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN]: true,
});

const fullCommands = () =>
  getCurrentCommandPaletteCommands({
    clientsPath: '/clients/cards',
    permissions: fullPermissions,
  });

const ids = (commands) => commands.map((command) => command.id);
const labels = (commands) => commands.map((command) => command.label);
const paths = (commands) => commands.map((command) => command.to);

describe('current shell command palette commands', () => {
  it('orders operations profile commands by shell priority without changing command objects', () => {
    const visibleCommands = fullCommands();
    const orderedCommands = getCurrentShellCommandPaletteCommands(
      visibleCommands,
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(ids(orderedCommands)).toEqual([
      'orders',
      'calendar',
      'assignments',
      'clients',
      'relationships',
      'users',
      'settings',
      'notif',
    ]);
    expect(new Set(ids(orderedCommands))).toEqual(new Set(ids(visibleCommands)));
    expect(labels(orderedCommands)).toEqual([
      'Go to Orders',
      'Go to Calendar',
      'Go to Assignments',
      'Go to Clients',
      'Go to Relationships',
      'Open Team Access',
      'Open Account Settings',
      'Open Notification Settings',
    ]);
    expect(paths(orderedCommands)).toEqual([
      '/orders',
      '/calendar',
      '/assignments',
      '/clients/cards',
      '/relationships',
      '/users',
      '/settings',
      '/settings/notifications',
    ]);
    expect(orderedCommands[0]).toBe(visibleCommands[0]);
  });

  it('prioritizes received work assignments only when the command is already visible', () => {
    const visibleCommands = getCurrentCommandPaletteCommands({
      permissions: {
        [PERMISSIONS.NAVIGATION_ORDERS_VIEW]: true,
        [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED]: false,
        [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER]: false,
        [PERMISSIONS.RELATIONSHIPS_READ]: false,
        [PERMISSIONS.NAVIGATION_CLIENTS_VIEW]: false,
        [PERMISSIONS.USERS_READ]: false,
        [PERMISSIONS.NAVIGATION_USERS_VIEW]: false,
        [PERMISSIONS.SETTINGS_VIEW]: true,
        [PERMISSIONS.NAVIGATION_SETTINGS_VIEW]: false,
        [PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN]: true,
      },
    });
    const orderedCommands = getCurrentShellCommandPaletteCommands(
      visibleCommands,
      SHELL_PROFILE_IDS.RECEIVED_WORK,
    );

    expect(ids(visibleCommands)).toEqual(['orders', 'calendar', 'settings', 'notif']);
    expect(ids(orderedCommands)).toEqual(['settings', 'notif', 'orders', 'calendar']);
    expect(new Set(ids(orderedCommands))).toEqual(new Set(ids(visibleCommands)));
    expect(ids(orderedCommands)).not.toContain('assignments');
  });

  it('keeps unknown, fallback, and future profiles in current command order', () => {
    [SHELL_PROFILE_IDS.UNAVAILABLE, SHELL_PROFILE_IDS.REQUESTS, 'unknown_profile'].forEach(
      (profileId) => {
        const visibleCommands = fullCommands();
        const orderedCommands = getCurrentShellCommandPaletteCommands(visibleCommands, profileId);

        expect(ids(orderedCommands)).toEqual([
          'orders',
          'assignments',
          'relationships',
          'calendar',
          'clients',
          'users',
          'settings',
          'notif',
        ]);
        expect(new Set(ids(orderedCommands))).toEqual(new Set(ids(visibleCommands)));
      },
    );
  });

  it('does not create commands for metadata-only ids', () => {
    const visibleCommands = getCurrentCommandPaletteCommands({
      permissions: {
        [PERMISSIONS.NAVIGATION_ORDERS_VIEW]: false,
        [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED]: false,
        [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER]: false,
        [PERMISSIONS.RELATIONSHIPS_READ]: false,
        [PERMISSIONS.NAVIGATION_CLIENTS_VIEW]: false,
        [PERMISSIONS.USERS_READ]: false,
        [PERMISSIONS.NAVIGATION_USERS_VIEW]: false,
        [PERMISSIONS.SETTINGS_VIEW]: false,
        [PERMISSIONS.NAVIGATION_SETTINGS_VIEW]: false,
        [PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN]: false,
      },
    });
    const orderedCommands = getCurrentShellCommandPaletteCommands(
      visibleCommands,
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(ids(visibleCommands)).toEqual(['calendar']);
    expect(ids(orderedCommands)).toEqual(['calendar']);
  });

  it('keeps commands outside metadata available in current relative order', () => {
    const visibleCommands = [
      ...getCurrentCommandPaletteCommands({
        permissions: {
          [PERMISSIONS.NAVIGATION_ORDERS_VIEW]: true,
          [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED]: false,
          [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER]: false,
          [PERMISSIONS.RELATIONSHIPS_READ]: false,
          [PERMISSIONS.NAVIGATION_CLIENTS_VIEW]: false,
          [PERMISSIONS.USERS_READ]: false,
          [PERMISSIONS.NAVIGATION_USERS_VIEW]: false,
          [PERMISSIONS.SETTINGS_VIEW]: false,
          [PERMISSIONS.NAVIGATION_SETTINGS_VIEW]: false,
          [PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN]: false,
        },
      }),
      Object.freeze({
        id: 'local.extra.one',
        label: 'Local Extra One',
        to: '/extra-one',
      }),
      Object.freeze({
        id: 'local.extra.two',
        label: 'Local Extra Two',
        to: '/extra-two',
      }),
    ];
    const orderedCommands = getCurrentShellCommandPaletteCommands(
      visibleCommands,
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(ids(orderedCommands)).toEqual([
      'orders',
      'calendar',
      'local.extra.one',
      'local.extra.two',
    ]);
  });

  it('returns a frozen ordered array', () => {
    const orderedCommands = getCurrentShellCommandPaletteCommands(
      fullCommands(),
      SHELL_PROFILE_IDS.OPERATIONS,
    );

    expect(Object.isFrozen(orderedCommands)).toBe(true);
  });
});
