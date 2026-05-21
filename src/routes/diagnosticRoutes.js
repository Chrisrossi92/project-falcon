import {
  CURRENT_NAV_GATE_TYPES,
  getCurrentLiveNavigationEntry,
} from '../lib/navigation/currentNavigationRegistry.js';

export const PRODUCT_METADATA_DIAGNOSTICS_NAV_ENTRY_ID = 'settings.productMetadataDiagnostics';
export const NOTIFICATION_SETTINGS_NAV_ENTRY_ID = 'settings.notifications';

const getSinglePermissionRoute = (entryId, routeName) => {
  const navEntry = getCurrentLiveNavigationEntry(entryId);

  if (!navEntry) {
    throw new Error(`Missing current live navigation entry for ${routeName}.`);
  }

  if (
    navEntry.routeGate?.type !== CURRENT_NAV_GATE_TYPES.PERMISSION ||
    navEntry.routeGate.permissions.length !== 1
  ) {
    throw new Error(`${routeName} route must remain a single-permission route.`);
  }

  return Object.freeze({
    id: navEntry.id,
    label: navEntry.label,
    path: navEntry.path,
    requiredPermission: navEntry.routeGate.permissions[0],
  });
};

export const notificationSettingsRoute = getSinglePermissionRoute(
  NOTIFICATION_SETTINGS_NAV_ENTRY_ID,
  'Notification Settings',
);

export const productMetadataDiagnosticsRoute = getSinglePermissionRoute(
  PRODUCT_METADATA_DIAGNOSTICS_NAV_ENTRY_ID,
  'Product metadata diagnostics',
);
