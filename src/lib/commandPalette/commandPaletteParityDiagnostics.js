import { getShadowCommandPaletteComposition } from './commandPaletteComposition.js';
import {
  CURRENT_COMMAND_AUTHORITY,
  currentLiveCommandEntries,
} from './currentCommandRegistry.js';

export const COMMAND_PARITY_AUTHORITY = Object.freeze({
  DIAGNOSTIC_ONLY: 'diagnostic_only_not_runtime_authority',
});

export const COMMAND_PARITY_STATUS = Object.freeze({
  MATCH: 'match',
  LIVE_ONLY_DIAGNOSTIC_GAP: 'live_only_diagnostic_gap',
  SHADOW_ONLY_FUTURE_GAP: 'shadow_only_future_gap',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const byShadowCommandId = (entries) =>
  Object.freeze(
    entries.reduce((accumulator, entry) => {
      if (!entry.shadowCommandId) return accumulator;

      return {
        ...accumulator,
        [entry.shadowCommandId]: freezeArray([
          ...(accumulator[entry.shadowCommandId] ?? []),
          entry,
        ]),
      };
    }, {}),
  );

const createMatch = (shadowEntry, liveEntries) =>
  Object.freeze({
    commandId: shadowEntry.commandId,
    status: COMMAND_PARITY_STATUS.MATCH,
    liveEntryIds: freezeArray(liveEntries.map((entry) => entry.id)),
    liveLabels: freezeArray([...new Set(liveEntries.map((entry) => entry.label))]),
    shadowLabel: shadowEntry.label,
    moduleId: shadowEntry.moduleId,
    lane: shadowEntry.lane,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    notes: freezeArray(['Current command registry and shadow composition both contain this command concept.']),
  });

const createLiveOnlyGap = (liveEntry) =>
  Object.freeze({
    commandId: liveEntry.shadowCommandId,
    status: COMMAND_PARITY_STATUS.LIVE_ONLY_DIAGNOSTIC_GAP,
    liveEntryIds: freezeArray([liveEntry.id]),
    liveLabels: freezeArray([liveEntry.label]),
    shadowLabel: null,
    moduleId: null,
    lane: null,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    notes: freezeArray([
      'Current command palette exposes this command concept, but the selected shadow mode does not include it by default.',
      'This is a diagnostic gap only and does not authorize or hide active commands.',
    ]),
  });

const createShadowOnlyGap = (shadowEntry) =>
  Object.freeze({
    commandId: shadowEntry.commandId,
    status: COMMAND_PARITY_STATUS.SHADOW_ONLY_FUTURE_GAP,
    liveEntryIds: freezeArray([]),
    liveLabels: freezeArray([]),
    shadowLabel: shadowEntry.label,
    moduleId: shadowEntry.moduleId,
    lane: shadowEntry.lane,
    diagnosticOnly: true,
    fatal: false,
    permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    notes: freezeArray([
      'Shadow command composition expects this concept, but the current live command palette registry has no matching live command.',
      'This is a future migration gap only and does not require active command exposure.',
    ]),
  });

const emptyDiagnostics = (modeId, diagnostics = []) =>
  Object.freeze({
    modeId,
    isKnownMode: false,
    runtimeComposed: false,
    permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    metadataAuthority: CURRENT_COMMAND_AUTHORITY.DESCRIPTIVE_ONLY,
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

export const getCurrentLiveCommandConceptIds = () =>
  freezeArray(currentLiveCommandEntries.map((entry) => entry.shadowCommandId).filter(Boolean));

export const getCommandPaletteParityDiagnostics = (modeId, additionalModuleIds = []) => {
  const shadowComposition = getShadowCommandPaletteComposition(modeId, additionalModuleIds);

  if (!shadowComposition.isKnownMode) {
    return emptyDiagnostics(modeId, [
      'Unknown product mode; no current-live/shadow command palette parity diagnostics generated.',
    ]);
  }

  const liveEntriesByShadowId = byShadowCommandId(currentLiveCommandEntries);
  const shadowCommandIdSet = new Set(shadowComposition.entries.map((entry) => entry.commandId));
  const liveShadowCommandIdSet = new Set(Object.keys(liveEntriesByShadowId));

  const matches = shadowComposition.entries
    .filter((entry) => liveEntriesByShadowId[entry.commandId])
    .map((entry) => createMatch(entry, liveEntriesByShadowId[entry.commandId]));

  const liveOnlyEntries = currentLiveCommandEntries
    .filter((entry) => !shadowCommandIdSet.has(entry.shadowCommandId))
    .map((entry) => createLiveOnlyGap(entry));

  const shadowOnlyEntries = shadowComposition.entries
    .filter((entry) => !liveShadowCommandIdSet.has(entry.commandId))
    .map((entry) => createShadowOnlyGap(entry));

  return Object.freeze({
    modeId,
    isKnownMode: true,
    runtimeComposed: false,
    permissionAuthority: COMMAND_PARITY_AUTHORITY.DIAGNOSTIC_ONLY,
    metadataAuthority: CURRENT_COMMAND_AUTHORITY.DESCRIPTIVE_ONLY,
    hasErrors: false,
    liveEntries: currentLiveCommandEntries,
    shadowEntries: shadowComposition.entries,
    entriesByLane: shadowComposition.entriesByLane,
    matches: freezeArray(matches),
    liveOnlyEntries: freezeArray(liveOnlyEntries),
    shadowOnlyEntries: freezeArray(shadowOnlyEntries),
    futureOnlyEntries: freezeArray(shadowOnlyEntries),
    diagnostics: freezeArray([
      'Command palette parity diagnostics compare current live command metadata to shadow product-mode command metadata only.',
      'Permission metadata remains descriptive; route and action guards remain authoritative.',
      'Live-only and shadow-only command entries are migration diagnostics, not validation failures.',
      ...shadowComposition.diagnostics,
    ]),
  });
};
