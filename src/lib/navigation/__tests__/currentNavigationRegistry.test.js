import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '../../permissions/constants.js';
import {
  CURRENT_NAV_AUTHORITY,
  CURRENT_NAV_ENTRY_STATUS,
  CURRENT_NAV_GATE_TYPES,
  CURRENT_NAV_REGISTRY_KIND,
  CURRENT_NAV_SURFACES,
  currentLiveNavigationEntries,
  currentLiveNavigationEntriesById,
  getCurrentLiveNavigationEntriesBySurface,
  getCurrentLiveNavigationEntry,
} from '../currentNavigationRegistry.js';

const ids = currentLiveNavigationEntries.map(({ id }) => id);

describe('current live navigation registry', () => {
  it('identifies itself as current-live descriptive metadata only', () => {
    expect(CURRENT_NAV_REGISTRY_KIND).toBe('current_live_navigation_registry');

    currentLiveNavigationEntries.forEach((entry) => {
      expect(entry).toMatchObject({
        activeLive: true,
        futureOnly: false,
        productModeAware: false,
        metadataAuthority: CURRENT_NAV_AUTHORITY.DESCRIPTIVE_ONLY,
      });
      expect(entry.moduleId).toBeUndefined();
      expect(entry.modeId).toBeUndefined();
      expect(entry.productModeId).toBeUndefined();
    });
  });

  it('has stable unique ids', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(currentLiveNavigationEntriesById).sort()).toEqual([...ids].sort());
  });

  it('contains required current live entries', () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        'dashboard',
        'my_work',
        'orders',
        'calendar',
        'clients.primary',
        'assignments',
        'relationships',
        'users',
        'settings',
        'settings.notifications',
        'settings.ownerSetup',
        'settings.productMetadataDiagnostics',
      ]),
    );
  });

  it('matches current route paths and dynamic client behavior', () => {
    expect(getCurrentLiveNavigationEntry('dashboard').path).toBe('/dashboard');
    expect(getCurrentLiveNavigationEntry('my_work').path).toBe('/my-work');
    expect(getCurrentLiveNavigationEntry('orders').path).toBe('/orders');
    expect(getCurrentLiveNavigationEntry('orders.new').path).toBe('/orders/new');
    expect(getCurrentLiveNavigationEntry('orders.detail').path).toBe('/orders/:id');
    expect(getCurrentLiveNavigationEntry('calendar').path).toBe('/calendar');
    expect(getCurrentLiveNavigationEntry('assignments').path).toBe('/assignments');
    expect(getCurrentLiveNavigationEntry('assignments.detail').path).toBe(
      '/assignments/:assignmentId',
    );
    expect(getCurrentLiveNavigationEntry('relationships').path).toBe('/relationships');
    expect(getCurrentLiveNavigationEntry('relationships.detail').path).toBe(
      '/relationships/:relationshipId',
    );
    expect(getCurrentLiveNavigationEntry('users').path).toBe('/users');
    expect(getCurrentLiveNavigationEntry('settings').path).toBe('/settings');
    expect(getCurrentLiveNavigationEntry('settings.notifications').path).toBe(
      '/settings/notifications',
    );
    expect(getCurrentLiveNavigationEntry('settings.ownerSetup').path).toBe(
      '/settings/owner-setup',
    );
    expect(getCurrentLiveNavigationEntry('settings.productMetadataDiagnostics').path).toBe(
      '/settings/product-metadata-diagnostics',
    );

    expect(getCurrentLiveNavigationEntry('clients.primary').pathByPermission).toMatchObject({
      [PERMISSIONS.CLIENTS_READ_ALL]: '/clients',
      [PERMISSIONS.CLIENTS_READ_ASSIGNED]: '/clients/cards',
    });
  });

  it('records current permission metadata where known without becoming authority', () => {
    expect(getCurrentLiveNavigationEntry('orders').routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.ANY_PERMISSION,
      permissions: [PERMISSIONS.ORDERS_READ_ALL, PERMISSIONS.ORDERS_READ_ASSIGNED],
    });
    expect(getCurrentLiveNavigationEntry('my_work').routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.ANY_PERMISSION,
      permissions: [PERMISSIONS.ORDERS_READ_ALL, PERMISSIONS.ORDERS_READ_ASSIGNED],
    });
    expect(getCurrentLiveNavigationEntry('my_work').visibilityGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.ORDERS_READ_ASSIGNED],
    });
    expect(getCurrentLiveNavigationEntry('orders').command.gate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.NAVIGATION_ORDERS_VIEW],
    });
    expect(getCurrentLiveNavigationEntry('assignments').visibilityGate.permissions).toEqual([
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]);
    expect(getCurrentLiveNavigationEntry('relationships').visibilityGate.permissions).toEqual([
      PERMISSIONS.RELATIONSHIPS_READ,
    ]);
    expect(getCurrentLiveNavigationEntry('users').routeGate.permissions).toEqual([
      PERMISSIONS.USERS_READ,
    ]);
    expect(getCurrentLiveNavigationEntry('settings.notifications').routeGate.permissions).toEqual([
      PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
    ]);
  });

  it('marks command and mobile surfaces consistently with current exposure', () => {
    const commandIds = getCurrentLiveNavigationEntriesBySurface(CURRENT_NAV_SURFACES.COMMAND).map(
      ({ id }) => id,
    );
    const mobileIds = getCurrentLiveNavigationEntriesBySurface(CURRENT_NAV_SURFACES.MOBILE).map(
      ({ id }) => id,
    );

    expect(commandIds).toEqual(
      expect.arrayContaining([
        'orders',
        'assignments',
        'relationships',
        'calendar',
        'clients.primary',
        'users',
        'settings',
        'settings.notifications',
      ]),
    );
    expect(mobileIds).toEqual(
      expect.arrayContaining([
        'my_work',
        'orders',
        'assignments',
        'relationships',
        'calendar',
        'clients.primary',
        'users',
        'settings',
      ]),
    );
  });

  it('marks product metadata diagnostics as diagnostic route-only', () => {
    const diagnostics = getCurrentLiveNavigationEntry('settings.productMetadataDiagnostics');

    expect(diagnostics).toMatchObject({
      diagnostic: true,
      status: CURRENT_NAV_ENTRY_STATUS.DIAGNOSTIC_ROUTE_ONLY,
      path: '/settings/product-metadata-diagnostics',
    });
    expect(diagnostics.surfaces).toEqual(
      expect.arrayContaining([CURRENT_NAV_SURFACES.DIAGNOSTIC, CURRENT_NAV_SURFACES.ROUTE]),
    );
    expect(diagnostics.command).toBeNull();
  });

  it('contains stable settings route metadata for notification settings, owner setup, and diagnostics', () => {
    const notificationSettings = getCurrentLiveNavigationEntry('settings.notifications');
    const ownerSetup = getCurrentLiveNavigationEntry('settings.ownerSetup');
    const diagnostics = getCurrentLiveNavigationEntry('settings.productMetadataDiagnostics');

    expect(notificationSettings).toMatchObject({
      id: 'settings.notifications',
      label: 'Notification Settings',
      path: '/settings/notifications',
    });
    expect(notificationSettings.diagnostic).toBeUndefined();
    expect(notificationSettings.surfaces).toEqual(
      expect.arrayContaining([CURRENT_NAV_SURFACES.SETTINGS, CURRENT_NAV_SURFACES.ROUTE]),
    );
    expect(notificationSettings.routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN],
    });
    expect(notificationSettings.surfaceLabels).toMatchObject({
      [CURRENT_NAV_SURFACES.SETTINGS]: 'Notification Settings →',
      [CURRENT_NAV_SURFACES.COMMAND]: 'Open Notification Settings',
    });

    expect(ownerSetup).toMatchObject({
      id: 'settings.ownerSetup',
      label: 'Owner Setup',
      path: '/settings/owner-setup',
    });
    expect(ownerSetup.surfaces).toEqual(
      expect.arrayContaining([CURRENT_NAV_SURFACES.SETTINGS, CURRENT_NAV_SURFACES.ROUTE]),
    );
    expect(ownerSetup.routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.SETTINGS_VIEW],
    });
    expect(ownerSetup.visibilityGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.SETTINGS_VIEW],
    });
    expect(ownerSetup.surfaceLabels).toMatchObject({
      [CURRENT_NAV_SURFACES.SETTINGS]: 'Owner Setup →',
    });

    expect(diagnostics).toMatchObject({
      id: 'settings.productMetadataDiagnostics',
      label: 'Product Metadata Diagnostics',
      path: '/settings/product-metadata-diagnostics',
      diagnostic: true,
    });
    expect(diagnostics.routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.SETTINGS_VIEW],
    });

    expect(getCurrentLiveNavigationEntry('settings').surfaceLabels).toMatchObject({
      [CURRENT_NAV_SURFACES.AVATAR_MENU]: 'Account settings',
      [CURRENT_NAV_SURFACES.MOBILE]: 'Settings',
      [CURRENT_NAV_SURFACES.COMMAND]: 'Open Account Settings',
    });
  });

  it('does not include Vendor or Client Portal future-only entries', () => {
    const serialized = JSON.stringify(currentLiveNavigationEntries).toLowerCase();

    expect(ids).not.toEqual(expect.arrayContaining(['vendor.portal', 'client.portal']));
    expect(serialized).not.toContain('vendor workspace');
    expect(serialized).not.toContain('client portal');
    expect(serialized).not.toContain('submit request');
    expect(serialized).not.toContain('my requests');
    expect(serialized).not.toContain('documents / reports');
    expect(serialized).not.toContain('amc dashboard');
  });
});
