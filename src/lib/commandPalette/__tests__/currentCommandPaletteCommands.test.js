import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '../../permissions/constants.js';
import {
  CURRENT_COMMAND_PALETTE_COMMAND_IDS,
  CURRENT_COMMAND_PALETTE_LEGACY_FALLBACK_COMMAND_IDS,
  getCurrentCommandPaletteCommands,
  getCurrentOrderSearchFallback,
} from '../currentCommandPaletteCommands.js';
import {
  CURRENT_COMMAND_AUTHORITY,
  CURRENT_COMMAND_STATUS,
} from '../currentCommandRegistry.js';

const idsFor = (commands) => commands.map(({ id }) => id);
const labelsFor = (commands) => commands.map(({ label }) => label);
const pathsFor = (commands) => commands.map(({ to }) => to);

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

describe('current command palette commands', () => {
  it('returns expected current commands in current active order', () => {
    const commands = getCurrentCommandPaletteCommands({
      clientsPath: '/clients/cards',
      permissions: fullPermissions,
    });

    expect(CURRENT_COMMAND_PALETTE_COMMAND_IDS).toEqual([
      'orders',
      'assignments',
      'relationships',
      'calendar',
      'clients',
      'users',
      'settings',
      'notif',
    ]);
    expect(idsFor(commands)).toEqual(CURRENT_COMMAND_PALETTE_COMMAND_IDS);
    expect(labelsFor(commands)).toEqual([
      'Go to Orders',
      'Go to Assignments',
      'Go to Relationships',
      'Go to Calendar',
      'Go to Clients',
      'Open Team Access',
      'Open Account Settings',
      'Open Notification Settings',
    ]);
    expect(pathsFor(commands)).toEqual([
      '/orders',
      '/assignments',
      '/relationships',
      '/calendar',
      '/clients/cards',
      '/users',
      '/settings',
      '/settings/notifications',
    ]);
  });

  it('hides permissioned commands when permission inputs are false or missing', () => {
    const commands = getCurrentCommandPaletteCommands({
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

    expect(idsFor(commands)).toEqual(['calendar']);
    expect(pathsFor(commands)).toEqual(['/calendar']);
  });

  it('preserves current loading and error fallback behavior', () => {
    const loadingCommands = getCurrentCommandPaletteCommands({ loading: true });
    const errorCommands = getCurrentCommandPaletteCommands({ error: true });

    expect(idsFor(loadingCommands)).toEqual(CURRENT_COMMAND_PALETTE_LEGACY_FALLBACK_COMMAND_IDS);
    expect(idsFor(errorCommands)).toEqual(CURRENT_COMMAND_PALETTE_LEGACY_FALLBACK_COMMAND_IDS);
    expect(idsFor(loadingCommands)).not.toContain('assignments');
    expect(idsFor(loadingCommands)).not.toContain('relationships');
    expect(pathsFor(loadingCommands)).toEqual([
      '/orders',
      '/calendar',
      '/clients',
      '/users',
      '/settings',
      '/settings/notifications',
    ]);
  });

  it('preserves route paths and caller-supplied Clients route behavior', () => {
    const fullClientCommands = getCurrentCommandPaletteCommands({
      clientsPath: '/clients',
      permissions: fullPermissions,
    });
    const assignedClientCommands = getCurrentCommandPaletteCommands({
      clientsPath: '/clients/cards',
      permissions: fullPermissions,
    });

    expect(fullClientCommands.find(({ id }) => id === 'clients')?.to).toBe('/clients');
    expect(assignedClientCommands.find(({ id }) => id === 'clients')?.to).toBe('/clients/cards');
  });

  it('represents order-search fallback without making it a visible command', () => {
    const commands = getCurrentCommandPaletteCommands({
      permissions: fullPermissions,
    });
    const fallback = getCurrentOrderSearchFallback({
      permissions: fullPermissions,
    });

    expect(idsFor(commands)).not.toContain('orders.search');
    expect(fallback).toMatchObject({
      id: 'orders.search',
      label: 'Search Orders',
      routeTemplate: '/orders?q=:query',
      status: CURRENT_COMMAND_STATUS.FALLBACK_LIVE,
      canSearchOrders: true,
    });
    expect(fallback.toSearchPath('  123 Main #4  ')).toBe('/orders?q=123%20Main%20%234');
  });

  it('fails safely for missing or unknown permission inputs', () => {
    const commands = getCurrentCommandPaletteCommands();
    const fallback = getCurrentOrderSearchFallback();

    expect(idsFor(commands)).toEqual(['calendar']);
    expect(fallback.canSearchOrders).toBe(false);
  });

  it('does not include future portal, diagnostics, mode-aware, or shadow command authority', () => {
    const commands = getCurrentCommandPaletteCommands({
      permissions: fullPermissions,
    });
    const serialized = JSON.stringify(commands).toLowerCase();

    expect(serialized).not.toContain('vendor');
    expect(serialized).not.toContain('client portal');
    expect(serialized).not.toContain('submit request');
    expect(serialized).not.toContain('my requests');
    expect(serialized).not.toContain('documents');
    expect(serialized).not.toContain('product-metadata-diagnostics');
    expect(serialized).not.toContain('shadowcommandid');
    commands.forEach((command) => {
      expect(command.metadataAuthority).toBe(CURRENT_COMMAND_AUTHORITY.DESCRIPTIVE_ONLY);
      expect(command).not.toHaveProperty('shadowCommandId');
    });
  });
});
