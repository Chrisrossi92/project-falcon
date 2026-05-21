import { describe, expect, it } from 'vitest';

import { CURRENT_NAV_ENTRY_STATUS, getCurrentLiveNavigationEntry } from '../../lib/navigation/currentNavigationRegistry.js';
import { PERMISSIONS } from '../../lib/permissions/constants.js';
import {
  NOTIFICATION_SETTINGS_NAV_ENTRY_ID,
  PRODUCT_METADATA_DIAGNOSTICS_NAV_ENTRY_ID,
  notificationSettingsRoute,
  productMetadataDiagnosticsRoute,
} from '../diagnosticRoutes.js';

describe('diagnostic route registry bindings', () => {
  it('derives the notification settings route from the current live navigation registry', () => {
    const registryEntry = getCurrentLiveNavigationEntry(NOTIFICATION_SETTINGS_NAV_ENTRY_ID);

    expect(registryEntry).toMatchObject({
      id: 'settings.notifications',
      label: 'Notification Settings',
      path: '/settings/notifications',
    });
    expect(registryEntry.diagnostic).toBeUndefined();
    expect(notificationSettingsRoute).toEqual({
      id: registryEntry.id,
      label: registryEntry.label,
      path: registryEntry.path,
      requiredPermission: PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
    });
    expect(notificationSettingsRoute.requiredPermission).toBe(
      registryEntry.routeGate.permissions[0],
    );
  });

  it('derives the product metadata diagnostics route from the current live navigation registry', () => {
    const registryEntry = getCurrentLiveNavigationEntry(PRODUCT_METADATA_DIAGNOSTICS_NAV_ENTRY_ID);

    expect(registryEntry).toMatchObject({
      id: 'settings.productMetadataDiagnostics',
      label: 'Product Metadata Diagnostics',
      path: '/settings/product-metadata-diagnostics',
      status: CURRENT_NAV_ENTRY_STATUS.DIAGNOSTIC_ROUTE_ONLY,
      diagnostic: true,
    });
    expect(productMetadataDiagnosticsRoute).toEqual({
      id: registryEntry.id,
      label: registryEntry.label,
      path: registryEntry.path,
      requiredPermission: PERMISSIONS.SETTINGS_VIEW,
    });
    expect(productMetadataDiagnosticsRoute.requiredPermission).toBe(
      registryEntry.routeGate.permissions[0],
    );
  });
});
