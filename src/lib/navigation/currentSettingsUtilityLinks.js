import {
  CURRENT_NAV_ENTRY_STATUS,
  CURRENT_NAV_SURFACES,
  getCurrentLiveNavigationEntry,
} from './currentNavigationRegistry.js';

export const SETTINGS_UTILITY_LINK_IDS = Object.freeze({
  SETTINGS: 'settings',
  NOTIFICATION_SETTINGS: 'settings.notifications',
  OWNER_SETUP: 'settings.ownerSetup',
  PRODUCT_METADATA_DIAGNOSTICS: 'settings.productMetadataDiagnostics',
});

const getRequiredEntry = (entryId) => {
  const entry = getCurrentLiveNavigationEntry(entryId);

  if (!entry) {
    throw new Error(`Missing current live navigation entry for ${entryId}.`);
  }

  return entry;
};

const surfaceLabel = (entry, surface) => entry.surfaceLabels?.[surface] ?? entry.label;

const utilityLink = (entryId, surface, overrides = {}) => {
  const entry = getRequiredEntry(entryId);

  return Object.freeze({
    id: entry.id,
    label: surfaceLabel(entry, surface),
    path: entry.path,
    routeGate: entry.routeGate,
    visibilityGate: entry.surfaceVisibilityGates?.[surface] ?? entry.visibilityGate,
    status: entry.status,
    diagnostic: Boolean(entry.diagnostic),
    hidden: overrides.hidden ?? false,
  });
};

export const avatarSettingsUtilityLinks = Object.freeze([
  utilityLink(SETTINGS_UTILITY_LINK_IDS.SETTINGS, CURRENT_NAV_SURFACES.AVATAR_MENU),
]);

export const settingsPageUtilityLinks = Object.freeze([
  utilityLink(SETTINGS_UTILITY_LINK_IDS.NOTIFICATION_SETTINGS, CURRENT_NAV_SURFACES.SETTINGS),
  utilityLink(SETTINGS_UTILITY_LINK_IDS.OWNER_SETUP, CURRENT_NAV_SURFACES.SETTINGS),
]);

export const hiddenSettingsDiagnosticUtilityLinks = Object.freeze([
  utilityLink(
    SETTINGS_UTILITY_LINK_IDS.PRODUCT_METADATA_DIAGNOSTICS,
    CURRENT_NAV_SURFACES.SETTINGS,
    { hidden: true },
  ),
]);

export const assertSettingsUtilityLinkSafety = () => {
  hiddenSettingsDiagnosticUtilityLinks.forEach((link) => {
    if (link.status !== CURRENT_NAV_ENTRY_STATUS.DIAGNOSTIC_ROUTE_ONLY || !link.diagnostic) {
      throw new Error(`${link.id} must remain diagnostic-only.`);
    }
  });

  return true;
};

assertSettingsUtilityLinkSafety();
