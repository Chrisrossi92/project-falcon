import { getShadowDashboardComposition } from './dashboardComposition.js';
import {
  CURRENT_DASHBOARD_AUTHORITY,
  currentLiveDashboardEntries,
} from './currentDashboardRegistry.js';

export const DASHBOARD_PARITY_AUTHORITY = Object.freeze({
  DIAGNOSTIC_ONLY: 'diagnostic_only_not_runtime_authority',
});

export const DASHBOARD_PARITY_STATUS = Object.freeze({
  MATCH: 'match',
  LIVE_ONLY_DIAGNOSTIC_GAP: 'live_only_diagnostic_gap',
  SHADOW_ONLY_FUTURE_GAP: 'shadow_only_future_gap',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const byShadowDashboardItemId = (entries) =>
  Object.freeze(
    entries.reduce((accumulator, entry) => {
      if (!entry.shadowDashboardItemId) return accumulator;

      return {
        ...accumulator,
        [entry.shadowDashboardItemId]: freezeArray([
          ...(accumulator[entry.shadowDashboardItemId] ?? []),
          entry,
        ]),
      };
    }, {}),
  );

const createMatch = (shadowEntry, liveEntries) =>
  Object.freeze({
    dashboardItemId: shadowEntry.dashboardItemId,
    status: DASHBOARD_PARITY_STATUS.MATCH,
    liveEntryIds: freezeArray(liveEntries.map((entry) => entry.id)),
    liveLabels: freezeArray([...new Set(liveEntries.map((entry) => entry.label))]),
    shadowLabel: shadowEntry.label,
    moduleId: shadowEntry.moduleId,
    lane: shadowEntry.lane,
    kind: shadowEntry.kind,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: DASHBOARD_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    widgetNotes: freezeArray(liveEntries.flatMap((entry) => entry.widgetNotes)),
    notes: freezeArray([
      'Current dashboard registry and shadow composition both contain this dashboard concept.',
    ]),
  });

const createLiveOnlyGap = (liveEntry) =>
  Object.freeze({
    dashboardItemId: liveEntry.shadowDashboardItemId,
    status: DASHBOARD_PARITY_STATUS.LIVE_ONLY_DIAGNOSTIC_GAP,
    liveEntryIds: freezeArray([liveEntry.id]),
    liveLabels: freezeArray([liveEntry.label]),
    shadowLabel: null,
    moduleId: null,
    lane: liveEntry.laneHint ?? null,
    kind: null,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: DASHBOARD_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    widgetNotes: freezeArray(liveEntry.widgetNotes),
    notes: freezeArray([
      ...liveEntry.notes,
      'This is a diagnostic gap only and does not authorize, hide, or recompose active dashboards.',
    ]),
  });

const createShadowOnlyGap = (shadowEntry) =>
  Object.freeze({
    dashboardItemId: shadowEntry.dashboardItemId,
    status: DASHBOARD_PARITY_STATUS.SHADOW_ONLY_FUTURE_GAP,
    liveEntryIds: freezeArray([]),
    liveLabels: freezeArray([]),
    shadowLabel: shadowEntry.label,
    moduleId: shadowEntry.moduleId,
    lane: shadowEntry.lane,
    kind: shadowEntry.kind,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: DASHBOARD_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    widgetNotes: freezeArray([]),
    notes: freezeArray([
      'Shadow dashboard composition expects this concept, but the current live dashboard registry has no matching live dashboard surface.',
      'This is a future migration gap only and does not require active dashboard exposure.',
    ]),
  });

const emptyDiagnostics = (modeId, diagnostics = []) =>
  Object.freeze({
    modeId,
    isKnownMode: false,
    runtimeComposed: false,
    permissionAuthority: DASHBOARD_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
    hasErrors: false,
    liveEntries: freezeArray([]),
    shadowEntries: freezeArray([]),
    entriesByLane: Object.freeze({}),
    matches: freezeArray([]),
    liveOnlyEntries: freezeArray([]),
    shadowOnlyEntries: freezeArray([]),
    futureOnlyEntries: freezeArray([]),
    diagnostics: freezeArray(diagnostics),
  });

export const getCurrentLiveDashboardConceptIds = () =>
  freezeArray(
    currentLiveDashboardEntries.map((entry) => entry.shadowDashboardItemId).filter(Boolean),
  );

export const getDashboardParityDiagnostics = (modeId, additionalModuleIds = []) => {
  const shadowComposition = getShadowDashboardComposition(modeId, additionalModuleIds);

  if (!shadowComposition.isKnownMode) {
    return emptyDiagnostics(modeId, [
      'Unknown product mode; no current-live/shadow dashboard parity diagnostics generated.',
    ]);
  }

  const liveEntriesByShadowId = byShadowDashboardItemId(currentLiveDashboardEntries);
  const shadowDashboardItemIdSet = new Set(
    shadowComposition.items.map((entry) => entry.dashboardItemId),
  );
  const liveShadowDashboardItemIdSet = new Set(Object.keys(liveEntriesByShadowId));

  const matches = shadowComposition.items
    .filter((entry) => liveEntriesByShadowId[entry.dashboardItemId])
    .map((entry) => createMatch(entry, liveEntriesByShadowId[entry.dashboardItemId]));

  const liveOnlyEntries = currentLiveDashboardEntries
    .filter((entry) => !shadowDashboardItemIdSet.has(entry.shadowDashboardItemId))
    .map((entry) => createLiveOnlyGap(entry));

  const shadowOnlyEntries = shadowComposition.items
    .filter((entry) => !liveShadowDashboardItemIdSet.has(entry.dashboardItemId))
    .map((entry) => createShadowOnlyGap(entry));

  return Object.freeze({
    modeId,
    isKnownMode: true,
    runtimeComposed: false,
    permissionAuthority: DASHBOARD_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
    hasErrors: false,
    liveEntries: currentLiveDashboardEntries,
    shadowEntries: shadowComposition.items,
    entriesByLane: shadowComposition.itemsByLane,
    matches: freezeArray(matches),
    liveOnlyEntries: freezeArray(liveOnlyEntries),
    shadowOnlyEntries: freezeArray(shadowOnlyEntries),
    futureOnlyEntries: freezeArray(shadowOnlyEntries),
    diagnostics: freezeArray([
      'Dashboard parity diagnostics compare current live dashboard metadata to shadow product-mode dashboard metadata only.',
      'Permission metadata remains descriptive; DashboardGate and component-level permissions remain authoritative.',
      'Live-only and shadow-only dashboard entries are migration diagnostics, not validation failures.',
      ...shadowComposition.diagnostics,
    ]),
  });
};
