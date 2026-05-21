import { MODULE_IDS } from '../modules/moduleRegistry.js';
import { getShadowNavigationComposition } from './navigationComposition.js';
import {
  CURRENT_NAV_AUTHORITY,
  CURRENT_NAV_ENTRY_STATUS,
  currentLiveNavigationEntries,
} from './currentNavigationRegistry.js';

export const NAV_PARITY_AUTHORITY = Object.freeze({
  DIAGNOSTIC_ONLY: 'diagnostic_only_not_runtime_authority',
});

export const NAV_PARITY_STATUS = Object.freeze({
  MATCH: 'match',
  LIVE_ONLY_DIAGNOSTIC_GAP: 'live_only_diagnostic_gap',
  SHADOW_ONLY_FUTURE_GAP: 'shadow_only_future_gap',
});

export const CURRENT_NAV_ENTRY_MODULE_IDS = Object.freeze({
  dashboard: MODULE_IDS.DASHBOARD,
  orders: MODULE_IDS.ORDERS,
  'orders.new': MODULE_IDS.ORDERS,
  'orders.detail': MODULE_IDS.ORDERS,
  'orders.edit': MODULE_IDS.ORDERS,
  assignments: MODULE_IDS.ASSIGNMENTS,
  'assignments.detail': MODULE_IDS.ASSIGNMENTS,
  relationships: MODULE_IDS.RELATIONSHIPS,
  'relationships.detail': MODULE_IDS.RELATIONSHIPS,
  calendar: MODULE_IDS.CALENDAR,
  'clients.primary': MODULE_IDS.CLIENTS,
  'clients.index': MODULE_IDS.CLIENTS,
  'clients.cards': MODULE_IDS.CLIENTS,
  'clients.new': MODULE_IDS.CLIENTS,
  'clients.profile': MODULE_IDS.CLIENTS,
  'clients.edit': MODULE_IDS.CLIENTS,
  'clients.detail': MODULE_IDS.CLIENTS,
  users: MODULE_IDS.TEAM_ACCESS,
  'users.redirects': MODULE_IDS.TEAM_ACCESS,
  activity: MODULE_IDS.ACTIVITY,
  settings: MODULE_IDS.SETTINGS,
  'settings.notifications': MODULE_IDS.NOTIFICATIONS,
  'settings.productMetadataDiagnostics': MODULE_IDS.SETTINGS,
});

const freezeArray = (items = []) => Object.freeze([...items]);

const toUniqueFrozenArray = (items = []) => freezeArray([...new Set(items)]);

const byModuleId = (entries) => {
  const groups = new Map();

  entries.forEach((entry) => {
    const moduleId = CURRENT_NAV_ENTRY_MODULE_IDS[entry.id];
    if (!moduleId) return;

    groups.set(moduleId, [...(groups.get(moduleId) ?? []), entry]);
  });

  return Object.freeze(
    Object.fromEntries(
      [...groups.entries()].map(([moduleId, moduleEntries]) => [
        moduleId,
        freezeArray(moduleEntries),
      ]),
    ),
  );
};

const createMatch = (moduleId, liveEntries, shadowEntry) =>
  Object.freeze({
    moduleId,
    status: NAV_PARITY_STATUS.MATCH,
    liveEntryIds: freezeArray(liveEntries.map((entry) => entry.id)),
    liveLabels: toUniqueFrozenArray(liveEntries.map((entry) => entry.label)),
    shadowModuleId: shadowEntry.moduleId,
    shadowLabel: shadowEntry.label,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    notes: freezeArray([
      'Current live registry and shadow navigation composition both contain this concept.',
    ]),
  });

const createLiveOnlyGap = (moduleId, liveEntries) =>
  Object.freeze({
    moduleId,
    status: NAV_PARITY_STATUS.LIVE_ONLY_DIAGNOSTIC_GAP,
    liveEntryIds: freezeArray(liveEntries.map((entry) => entry.id)),
    liveLabels: toUniqueFrozenArray(liveEntries.map((entry) => entry.label)),
    shadowModuleId: null,
    shadowLabel: null,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    notes: freezeArray([
      'Current live navigation exposes this concept, but the selected shadow mode does not include it by default.',
      'This is a parity diagnostic gap only and does not authorize or hide active navigation.',
    ]),
  });

const createShadowOnlyGap = (shadowEntry) =>
  Object.freeze({
    moduleId: shadowEntry.moduleId,
    status: NAV_PARITY_STATUS.SHADOW_ONLY_FUTURE_GAP,
    liveEntryIds: freezeArray([]),
    liveLabels: freezeArray([]),
    shadowModuleId: shadowEntry.moduleId,
    shadowLabel: shadowEntry.label,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    notes: freezeArray([
      'Shadow navigation expects this concept, but the current live registry has no matching live entry.',
      'This is a future migration gap only and does not require active UI exposure.',
    ]),
  });

const emptyDiagnostics = (modeId, diagnostics = []) =>
  Object.freeze({
    modeId,
    isKnownMode: false,
    runtimeComposed: false,
    permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    metadataAuthority: CURRENT_NAV_AUTHORITY.DESCRIPTIVE_ONLY,
    hasErrors: false,
    liveEntries: freezeArray([]),
    liveEntriesByModuleId: Object.freeze({}),
    liveModuleIds: freezeArray([]),
    shadowEntries: freezeArray([]),
    shadowModuleIds: freezeArray([]),
    matches: freezeArray([]),
    liveOnlyEntries: freezeArray([]),
    shadowOnlyEntries: freezeArray([]),
    futureOnlyEntries: freezeArray([]),
    diagnosticRouteEntries: freezeArray([]),
    diagnostics: freezeArray(diagnostics),
  });

export const getCurrentLiveNavigationModuleIds = () =>
  toUniqueFrozenArray(
    currentLiveNavigationEntries
      .map((entry) => CURRENT_NAV_ENTRY_MODULE_IDS[entry.id])
      .filter(Boolean),
  );

export const getNavigationParityDiagnostics = (modeId) => {
  const shadowComposition = getShadowNavigationComposition(modeId);

  if (!shadowComposition.isKnownMode) {
    return emptyDiagnostics(modeId, [
      'Unknown product mode; no current-live/shadow navigation parity diagnostics generated.',
    ]);
  }

  const liveEntries = currentLiveNavigationEntries;
  const liveEntriesByModuleId = byModuleId(liveEntries);
  const liveModuleIds = Object.keys(liveEntriesByModuleId);
  const shadowEntries = shadowComposition.visibleEntries;
  const shadowModuleIds = shadowEntries.map((entry) => entry.moduleId);
  const shadowEntriesByModuleId = Object.fromEntries(
    shadowEntries.map((entry) => [entry.moduleId, entry]),
  );
  const shadowModuleIdSet = new Set(shadowModuleIds);
  const liveModuleIdSet = new Set(liveModuleIds);

  const matches = shadowEntries
    .filter((entry) => liveEntriesByModuleId[entry.moduleId])
    .map((entry) => createMatch(entry.moduleId, liveEntriesByModuleId[entry.moduleId], entry));

  const liveOnlyEntries = liveModuleIds
    .filter((moduleId) => !shadowModuleIdSet.has(moduleId))
    .map((moduleId) => createLiveOnlyGap(moduleId, liveEntriesByModuleId[moduleId]));

  const shadowOnlyEntries = shadowModuleIds
    .filter((moduleId) => !liveModuleIdSet.has(moduleId))
    .map((moduleId) => createShadowOnlyGap(shadowEntriesByModuleId[moduleId]));

  return Object.freeze({
    modeId,
    isKnownMode: true,
    runtimeComposed: false,
    permissionAuthority: NAV_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    metadataAuthority: CURRENT_NAV_AUTHORITY.DESCRIPTIVE_ONLY,
    hasErrors: false,
    liveEntries,
    liveEntriesByModuleId,
    liveModuleIds: freezeArray(liveModuleIds),
    shadowEntries,
    shadowModuleIds: freezeArray(shadowModuleIds),
    matches: freezeArray(matches),
    liveOnlyEntries: freezeArray(liveOnlyEntries),
    shadowOnlyEntries: freezeArray(shadowOnlyEntries),
    futureOnlyEntries: freezeArray(shadowOnlyEntries),
    diagnosticRouteEntries: freezeArray(
      liveEntries.filter((entry) => entry.status === CURRENT_NAV_ENTRY_STATUS.DIAGNOSTIC_ROUTE_ONLY),
    ),
    diagnostics: freezeArray([
      'Navigation parity diagnostics compare current live metadata to shadow product-mode metadata only.',
      'Permission metadata remains descriptive; route and action guards remain authoritative.',
      'Live-only and shadow-only entries are migration diagnostics, not validation failures.',
      ...shadowComposition.diagnostics,
    ]),
  });
};
