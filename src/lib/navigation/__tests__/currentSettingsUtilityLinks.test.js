import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '../../permissions/constants.js';
import {
  CURRENT_NAV_ENTRY_STATUS,
  CURRENT_NAV_GATE_TYPES,
} from '../currentNavigationRegistry.js';
import {
  SETTINGS_UTILITY_LINK_IDS,
  avatarSettingsUtilityLinks,
  hiddenSettingsDiagnosticUtilityLinks,
  settingsPageUtilityLinks,
} from '../currentSettingsUtilityLinks.js';

describe('current settings/admin utility links', () => {
  it('preserves the visible avatar settings link label, order, route, and gate', () => {
    expect(avatarSettingsUtilityLinks).toEqual([
      expect.objectContaining({
        id: SETTINGS_UTILITY_LINK_IDS.SETTINGS,
        label: 'Account settings',
        path: '/settings',
        diagnostic: false,
        hidden: false,
      }),
    ]);

    expect(avatarSettingsUtilityLinks[0].visibilityGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.AUTHENTICATED,
      permissions: [],
    });
    expect(avatarSettingsUtilityLinks[0].routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.SETTINGS_VIEW],
    });
  });

  it('preserves the visible settings page utility link labels, order, routes, and route gates', () => {
    expect(settingsPageUtilityLinks).toEqual([
      expect.objectContaining({
        id: SETTINGS_UTILITY_LINK_IDS.NOTIFICATION_SETTINGS,
        label: 'Notification Settings →',
        path: '/settings/notifications',
        diagnostic: false,
        hidden: false,
      }),
      expect.objectContaining({
        id: SETTINGS_UTILITY_LINK_IDS.OWNER_SETUP,
        label: 'Owner Setup →',
        path: '/settings/owner-setup',
        diagnostic: false,
        hidden: false,
      }),
    ]);

    expect(settingsPageUtilityLinks[0].routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN],
    });
    expect(settingsPageUtilityLinks[1].routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.SETTINGS_VIEW],
    });
    expect(settingsPageUtilityLinks[1].visibilityGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.SETTINGS_VIEW],
    });
  });

  it('keeps product metadata diagnostics hidden and diagnostic-only', () => {
    expect(hiddenSettingsDiagnosticUtilityLinks).toEqual([
      expect.objectContaining({
        id: SETTINGS_UTILITY_LINK_IDS.PRODUCT_METADATA_DIAGNOSTICS,
        label: 'Product Metadata Diagnostics',
        path: '/settings/product-metadata-diagnostics',
        status: CURRENT_NAV_ENTRY_STATUS.DIAGNOSTIC_ROUTE_ONLY,
        diagnostic: true,
        hidden: true,
      }),
    ]);

    expect(hiddenSettingsDiagnosticUtilityLinks[0].routeGate).toMatchObject({
      type: CURRENT_NAV_GATE_TYPES.PERMISSION,
      permissions: [PERMISSIONS.SETTINGS_VIEW],
    });
  });

  it('does not introduce Vendor or Client future concepts into settings utility links', () => {
    const serialized = JSON.stringify([
      avatarSettingsUtilityLinks,
      settingsPageUtilityLinks,
      hiddenSettingsDiagnosticUtilityLinks,
    ]).toLowerCase();

    expect(serialized).not.toContain('vendor');
    expect(serialized).not.toContain('client portal');
    expect(serialized).not.toContain('my requests');
    expect(serialized).not.toContain('documents / reports');
  });
});
